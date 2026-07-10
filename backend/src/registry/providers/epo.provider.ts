import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  RegistryBibliographicData,
  RegistryConnector,
  RegistryLegalEvent,
  RegistryLegalEventKind,
  RegistryLegalStatus,
  RegistrySearchHit,
  EpoApplicationRef,
} from '../interfaces/registry-connector.interface';
import {
  asArray,
  dig,
  encodePublicationPathSegment,
  normalizeEpoNumber,
  pickEnglishOrFirst,
  textOf,
} from './epo.util';

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

@Injectable()
export class EpoProvider implements RegistryConnector {
  readonly name = 'epo';
  private readonly logger = new Logger(EpoProvider.name);

  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly apiBaseUrl: string;
  private readonly authUrl: string;

  private cachedToken: CachedToken | null = null;

  constructor(private readonly config: ConfigService) {
    this.consumerKey = this.config.get<string>('EPO_CONSUMER_KEY')?.trim() ?? '';
    this.consumerSecret =
      this.config.get<string>('EPO_CONSUMER_SECRET')?.trim() ||
      this.config.get<string>('EPO_CONSUMER_SECRET_KEY')?.trim() ||
      '';
    this.apiBaseUrl = (
      this.config.get<string>('EPO_API_BASE_URL')?.trim() ||
      'https://ops.epo.org/3.2/rest-services'
    ).replace(/\/$/, '');
    this.authUrl =
      this.config.get<string>('EPO_AUTH_URL')?.trim() ||
      'https://ops.epo.org/3.2/auth/accesstoken';

    if (!this.isConfigured()) {
      this.logger.warn(
        'EPO_CONSUMER_KEY / EPO_CONSUMER_SECRET not set — EPO registry calls will fail until configured',
      );
    } else {
      this.logger.log(`EPO OPS base URL: ${this.apiBaseUrl}`);
    }
  }

  isConfigured(): boolean {
    return Boolean(this.consumerKey && this.consumerSecret);
  }

  async getAccessToken(): Promise<string> {
    this.assertConfigured();

    const skewMs = 60_000;
    if (
      this.cachedToken &&
      this.cachedToken.expiresAtMs - skewMs > Date.now()
    ) {
      return this.cachedToken.accessToken;
    }

    const basic = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`,
      'utf8',
    ).toString('base64');

    const res = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`EPO token error ${res.status}: ${body.slice(0, 200)}`);
      throw new ServiceUnavailableException(
        'Failed to obtain EPO access token. Check consumer key/secret or rate limits.',
      );
    }

    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number | string;
    };
    if (!json.access_token) {
      throw new ServiceUnavailableException(
        'EPO token response did not include access_token',
      );
    }

    const expiresInSec = Number(json.expires_in ?? 3600);
    this.cachedToken = {
      accessToken: json.access_token,
      expiresAtMs: Date.now() + Math.max(60, expiresInSec) * 1000,
    };
    this.logger.debug(
      `EPO access token cached for ~${Math.round(expiresInSec / 60)} minutes`,
    );
    return json.access_token;
  }

  async getBibliographicData(
    docNumber: string,
  ): Promise<RegistryBibliographicData> {
    const number = normalizeEpoNumber(docNumber);
    if (!number) {
      throw new ServiceUnavailableException('Patent number is required');
    }

    // Prefer epodoc for EP-prefixed numbers (e.g. EP3000000); fall back to docdb.
    const referenceTypes = number.startsWith('EP')
      ? (['epodoc', 'docdb'] as const)
      : (['docdb', 'epodoc'] as const);

    let lastError: unknown;
    for (const refType of referenceTypes) {
      try {
        const path = `published-data/publication/${refType}/${encodePublicationPathSegment(number)}/biblio`;
        const json = await this.opsGetJson(path);
        const parsed = this.parseBiblio(json, number);
        if (parsed.title || parsed.applicant || parsed.publicationDate) {
          return parsed;
        }
        return parsed;
      } catch (err) {
        lastError = err;
      }
    }

    if (lastError instanceof ServiceUnavailableException) throw lastError;
    this.logger.warn(
      `EPO biblio failed for ${number}: ${lastError instanceof Error ? lastError.message : lastError}`,
    );
    throw new ServiceUnavailableException(
      `Could not retrieve bibliographic data for ${number}`,
    );
  }

  async searchPublishedData(query: string): Promise<RegistrySearchHit[]> {
    const q = query.trim();
    if (!q) return [];

    // CQL title search; quote multi-word marks.
    const cql = q.includes(' ') ? `ti all "${q.replace(/"/g, '')}"` : `ti=${q}`;
    const path = `published-data/search?q=${encodeURIComponent(cql)}`;
    const json = await this.opsGetJson(path, {
      'X-OPS-Range': '1-25',
    });
    return this.parseSearchHits(json);
  }

  async getLegalStatus(docNumber: string): Promise<RegistryLegalStatus> {
    const number = normalizeEpoNumber(docNumber);
    if (!number) {
      throw new ServiceUnavailableException('Patent number is required');
    }

    // OAS: /legal/{type}/{format}/{number}
    // publication = published apps (A1/A2/A3); patent = granted (B1/B2); application = unpublished.
    // Try publication first (most common for active EP filings), then patent, then application.
    const attempts: Array<{ type: string; format: string; num: string }> = [];
    const bare = number.replace(/\.\w+$/, '');
    for (const type of ['publication', 'patent', 'application'] as const) {
      attempts.push({ type, format: 'epodoc', num: bare });
      attempts.push({
        type,
        format: 'docdb',
        num: bare.includes('.') ? bare : bare.replace(/^([A-Z]{2})(\d+)/, '$1.$2'),
      });
    }

    let lastError: unknown;
    for (const attempt of attempts) {
      const path = `legal/${attempt.type}/${attempt.format}/${encodePublicationPathSegment(attempt.num)}`;
      this.logger.log(
        `EPO legal status attempt ${attempt.type}/${attempt.format} → ${path}`,
      );
      try {
        const json = await this.opsGetJson(path);
        const events = this.parseLegalEvents(json);
        const applicationRef = this.extractApplicationRef(json);
        this.logger.log(
          `EPO legal status HIT for ${number} via ${attempt.type}/${attempt.format} (${events.length} event(s))` +
            (applicationRef
              ? `; appRef=${applicationRef.epodoc} (base=${applicationRef.baseNumber} check=${applicationRef.checkDigit})`
              : ''),
        );
        return { publicationNumber: number, events, applicationRef };
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `EPO legal status MISS for ${number} via ${attempt.type}/${attempt.format}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    if (lastError instanceof ServiceUnavailableException) throw lastError;
    this.logger.warn(
      `EPO legal status failed for ${number}: ${
        lastError instanceof Error ? lastError.message : lastError
      }`,
    );
    throw new ServiceUnavailableException(
      `Could not retrieve legal status for ${number}`,
    );
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'EPO OPS is not configured. Set EPO_CONSUMER_KEY and EPO_CONSUMER_SECRET.',
      );
    }
  }

  private async opsGetJson(
    relativePath: string,
    extraHeaders?: Record<string, string>,
  ): Promise<unknown> {
    const token = await this.getAccessToken();
    const url = `${this.apiBaseUrl}/${relativePath.replace(/^\//, '')}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...extraHeaders,
      },
    });

    if (res.status === 401 || res.status === 403) {
      // Force token refresh once on auth failure.
      this.cachedToken = null;
      const retryToken = await this.getAccessToken();
      const retry = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${retryToken}`,
          Accept: 'application/json',
          ...extraHeaders,
        },
      });
      const retryBody = await retry.text().catch(() => '');
      this.logEpoResponse(relativePath, retry.status, retryBody);
      if (!retry.ok) {
        throw new ServiceUnavailableException(
          'EPO request failed (invalid credentials or rate limit)',
        );
      }
      return this.parseJsonBody(retryBody, relativePath);
    }

    const body = await res.text().catch(() => '');
    this.logEpoResponse(relativePath, res.status, body);

    if (!res.ok) {
      throw new ServiceUnavailableException(
        res.status === 404
          ? 'Patent not found in EPO OPS'
          : 'EPO request failed (invalid credentials or rate limit)',
      );
    }

    return this.parseJsonBody(body, relativePath);
  }

  /** Log every EPO HTTP response (success and 404/error) for debugging. */
  private logEpoResponse(relativePath: string, status: number, body: string) {
    const preview =
      body.length > 8000
        ? `${body.slice(0, 8000)}… [truncated, ${body.length} chars]`
        : body || '(empty body)';
    this.logger.log(
      `EPO response ${status} ${relativePath}\n${preview}`,
    );
  }

  private parseJsonBody(body: string, relativePath: string): unknown {
    try {
      return body ? JSON.parse(body) : {};
    } catch {
      this.logger.warn(
        `EPO response for ${relativePath} was not valid JSON (${body.length} chars)`,
      );
      throw new ServiceUnavailableException('EPO returned invalid JSON');
    }
  }

  private parseBiblio(
    json: unknown,
    fallbackNumber: string,
  ): RegistryBibliographicData {
    const world = dig(json, ['ops:world-patent-data']) ?? json;
    const exchangeDocs =
      dig(world, ['exchange-documents', 'exchange-document']) ??
      dig(world, ['ops:exchange-documents', 'exchange-document']);
    const doc = asArray(exchangeDocs)[0] as Record<string, unknown> | undefined;
    const biblio =
      (doc?.['bibliographic-data'] as Record<string, unknown> | undefined) ??
      (dig(world, ['bibliographic-data']) as Record<string, unknown> | undefined);

    const title = pickEnglishOrFirst(biblio?.['invention-title']);

    const applicants = dig(biblio, [
      'parties',
      'applicants',
      'applicant',
    ]);
    let applicant: string | null = null;
    for (const a of asArray(applicants)) {
      const name =
        textOf(dig(a, ['applicant-name', 'name'])) ??
        textOf(dig(a, ['name'])) ??
        pickEnglishOrFirst(dig(a, ['applicant-name']));
      if (name) {
        applicant = name;
        break;
      }
    }

    const pubRefs = asArray(
      dig(biblio, ['publication-reference', 'document-id']),
    );
    let publicationDate: string | null = null;
    let publicationNumber = fallbackNumber;
    for (const ref of pubRefs) {
      const date = textOf(dig(ref, ['date']));
      if (date && !publicationDate) {
        publicationDate = this.formatOpsDate(date);
      }
      const country = textOf(dig(ref, ['country']));
      const docNumber = textOf(dig(ref, ['doc-number']));
      const kind = textOf(dig(ref, ['kind']));
      if (country && docNumber) {
        publicationNumber = `${country}${docNumber}${kind ? `.${kind}` : ''}`;
      }
    }

    return {
      publicationNumber,
      title,
      applicant,
      publicationDate,
    };
  }

  private parseSearchHits(json: unknown): RegistrySearchHit[] {
    const world = dig(json, ['ops:world-patent-data']) ?? json;
    const searchResult =
      dig(world, ['ops:biblio-search', 'ops:search-result']) ??
      dig(world, ['biblio-search', 'search-result']);

    const refs = asArray(
      dig(searchResult, ['ops:publication-reference']) ??
        dig(searchResult, ['publication-reference']),
    );

    const hits: RegistrySearchHit[] = [];
    for (const ref of refs) {
      const docIds = asArray(dig(ref, ['document-id']));
      for (const docId of docIds) {
        const country = textOf(dig(docId, ['country']));
        const docNumber = textOf(dig(docId, ['doc-number']));
        const kind = textOf(dig(docId, ['kind']));
        const date = textOf(dig(docId, ['date']));
        if (!country || !docNumber) continue;
        hits.push({
          publicationNumber: `${country}${docNumber}${kind ? `.${kind}` : ''}`,
          title: null,
          applicant: null,
          publicationDate: date ? this.formatOpsDate(date) : null,
        });
      }
    }

    // Deduplicate by publication number
    const seen = new Set<string>();
    return hits.filter((h) => {
      if (seen.has(h.publicationNumber)) return false;
      seen.add(h.publicationNumber);
      return true;
    });
  }

  /**
   * Extract EP application number + check digit from OPS application-reference.
   * @doc-id last digit is the check digit; document-id.doc-number is the 8-digit base.
   */
  private extractApplicationRef(json: unknown): EpoApplicationRef | null {
    const world = dig(json, ['ops:world-patent-data']) ?? json;
    const candidates: unknown[] = [];

    const collect = (container: unknown) => {
      if (!container || typeof container !== 'object') return;
      const obj = container as Record<string, unknown>;
      candidates.push(
        obj['application-reference'],
        obj['ops:application-reference'],
      );
    };

    collect(world);

    const family =
      dig(world, ['ops:patent-family']) ?? dig(world, ['patent-family']);
    for (const member of asArray(
      dig(family, ['ops:family-member']) ?? dig(family, ['family-member']),
    )) {
      collect(member);
      // Also under bibliographic-data on some payloads
      collect(dig(member, ['bibliographic-data']));
      collect(dig(member, ['ops:bibliographic-data']));
    }

    for (const ref of candidates) {
      for (const node of asArray(ref)) {
        if (!node || typeof node !== 'object') continue;
        const appRef = node as Record<string, unknown>;
        const docId =
          textOf(appRef['@doc-id']) ??
          textOf(appRef['doc-id']) ??
          textOf(appRef['@docId']);
        const docIds = asArray(
          dig(appRef, ['document-id']) ?? dig(appRef, ['ops:document-id']),
        );

        let baseNumber: string | null = null;
        for (const doc of docIds) {
          const n = textOf(dig(doc, ['doc-number'])) ?? textOf(dig(doc, ['ops:doc-number']));
          if (n && /^\d{6,}$/.test(n)) {
            baseNumber = n;
            break;
          }
        }

        if (!baseNumber || !docId || !/\d$/.test(docId)) continue;

        const checkDigit = docId.slice(-1);
        const fullAppNumber = `${baseNumber}${checkDigit}`;
        const result: EpoApplicationRef = {
          baseNumber,
          checkDigit,
          fullAppNumber,
          epodoc: `EP${fullAppNumber}`,
        };
        this.logger.log(
          `EPO application-reference extracted: ${JSON.stringify(result)} (doc-id=${docId})`,
        );
        return result;
      }
    }

    this.logger.debug('EPO application-reference not found in legal payload');
    return null;
  }

  private parseLegalEvents(json: unknown): RegistryLegalEvent[] {
    const world = dig(json, ['ops:world-patent-data']) ?? json;
    const rawEvents = this.extractAllLegalNodes(world);

    this.logger.debug(
      `EPO parseLegalEvents: extracted ${rawEvents.length} raw ops:legal node(s)`,
    );
    if (rawEvents.length > 0) {
      this.logger.debug(
        `EPO parseLegalEvents first raw node: ${JSON.stringify(rawEvents[0]).slice(0, 1500)}`,
      );
    }

    const events: RegistryLegalEvent[] = [];
    const seen = new Set<string>();

    for (const raw of rawEvents) {
      if (!raw || typeof raw !== 'object') continue;
      const node = raw as Record<string, unknown>;

      // OPS BadgerFish: code/desc are attributes; L007EP is the event date.
      const code =
        textOf(node['@code']) ??
        textOf(node['code']) ??
        textOf(dig(node, ['ops:L008EP'])) ??
        textOf(dig(node, ['L008EP'])) ??
        '';
      const dateRaw =
        textOf(dig(node, ['ops:L007EP'])) ??
        textOf(dig(node, ['L007EP'])) ??
        textOf(node['@date']) ??
        textOf(node['date']) ??
        textOf(dig(node, ['ops:L018EP'])) ??
        textOf(dig(node, ['L018EP']));
      const description =
        textOf(node['@desc']) ??
        pickEnglishOrFirst(node['ops:L500EP'] ?? node['L500EP']) ??
        textOf(node['description']) ??
        textOf(node['$']) ??
        null;

      const date = dateRaw ? this.formatOpsDate(dateRaw) : null;
      const eventId = [code || 'UNK', date ?? '', description ?? '']
        .join('|')
        .slice(0, 500);
      if (seen.has(eventId)) continue;
      seen.add(eventId);

      const kind = classifyLegalEvent(code, description);
      events.push({
        eventId,
        code: code || 'UNK',
        date,
        description,
        kind,
      });
    }

    events.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

    const byKind = events.reduce<Record<string, number>>((acc, e) => {
      acc[e.kind] = (acc[e.kind] ?? 0) + 1;
      return acc;
    }, {});
    this.logger.log(
      `EPO parseLegalEvents: ${events.length} event(s) parsed ${JSON.stringify(byKind)}` +
        (events[0] ? `; first=${JSON.stringify(events[0])}` : ''),
    );

    return events;
  }

  /**
   * Collect every ops:legal entry from the OPS legal payload.
   * Family responses nest legal arrays under each ops:family-member.
   */
  private extractAllLegalNodes(world: unknown): unknown[] {
    const nodes: unknown[] = [];

    const pushLegal = (container: unknown) => {
      if (!container || typeof container !== 'object') return;
      const obj = container as Record<string, unknown>;
      nodes.push(
        ...asArray(obj['ops:legal']),
        ...asArray(obj['legal']),
        ...asArray(obj['ops:legal-event']),
        ...asArray(obj['legal-event']),
      );
    };

    pushLegal(world);
    pushLegal(dig(world, ['ops:legal']));
    pushLegal(dig(world, ['legal']));

    const family =
      dig(world, ['ops:patent-family']) ?? dig(world, ['patent-family']);
    const members = asArray(
      dig(family, ['ops:family-member']) ?? dig(family, ['family-member']),
    );

    this.logger.debug(
      `EPO extractAllLegalNodes: ${members.length} family-member(s)`,
    );

    for (const member of members) {
      pushLegal(member);
    }

    // Flatten accidental nesting where ops:legal is a wrapper object
    // containing ops:legal-event children rather than the event itself.
    const flattened: unknown[] = [];
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const obj = node as Record<string, unknown>;
      const nestedEvents = [
        ...asArray(obj['ops:legal-event']),
        ...asArray(obj['legal-event']),
      ];
      if (
        nestedEvents.length > 0 &&
        !obj['@code'] &&
        !obj['code'] &&
        !obj['ops:L007EP'] &&
        !obj['L007EP']
      ) {
        flattened.push(...nestedEvents);
      } else {
        flattened.push(node);
      }
    }

    return flattened;
  }

  private formatOpsDate(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 8) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }
    return raw;
  }
}

function classifyLegalEvent(
  code: string,
  description: string | null,
): RegistryLegalEventKind {
  const codeUpper = code.trim().toUpperCase();
  // Explicit EPO / INPADOC codes that drive prosecution workflow
  if (
    [
      '17P',
      '17W',
      '18W',
      'STAA',
      'EXRE',
      'R1',
      'D1',
      'B1',
      'PGFP',
    ].includes(codeUpper)
  ) {
    if (['18W', '17W'].includes(codeUpper)) return 'refusal';
    if (['B1', 'PGFP'].includes(codeUpper)) return 'grant';
    return 'office_action';
  }

  const hay = `${code} ${description ?? ''}`.toLowerCase();
  if (
    /refus|reject|withdrawn|deemed.?withdrawn|abandoned/.test(hay)
  ) {
    return 'refusal';
  }
  if (/grant|decision to grant|pgfp|\bb1\b|patent granted/.test(hay)) {
    return 'grant';
  }
  if (
    /exam|office.?action|communication|search report|written opinion|17[wp]|exre|request for examination|substantive/.test(
      hay,
    )
  ) {
    return 'office_action';
  }
  return 'other';
}
