import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import {
  SEARCH_LIMIT_PER_TYPE,
  SEARCH_MIN_QUERY_LENGTH,
} from './search.constants';
import type { SearchHit } from './search.types';

type RankedRow = {
  id: string;
  title: string;
  subtitle: string | null;
  snippet: string | null;
  href: string;
  rank: number;
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, user: AuthenticatedUser): Promise<{
    query: string;
    results: SearchHit[];
  }> {
    const q = query.trim();
    if (q.length < SEARCH_MIN_QUERY_LENGTH) {
      return { query: q, results: [] };
    }

    if (user.roles.includes(SYSTEM_ROLES.PORTAL_CLIENT)) {
      return this.searchPortal(q, user);
    }

    const buckets: SearchHit[][] = [];

    if (user.permissions.includes('client:read')) {
      buckets.push(await this.searchClients(q));
    }
    if (user.permissions.includes('matter:read')) {
      buckets.push(await this.searchMatters(q, user));
    }
    if (user.permissions.includes('correspondence:read')) {
      buckets.push(await this.searchCorrespondence(q, user));
    }
    if (user.permissions.includes('document:read')) {
      buckets.push(await this.searchDocuments(q, user));
    }
    if (user.permissions.includes('email_queue:read')) {
      buckets.push(await this.searchUnlinkedEmails(q));
    }

    const results = buckets
      .flat()
      .sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title))
      .slice(0, SEARCH_LIMIT_PER_TYPE * 4);

    return { query: q, results };
  }

  private async searchPortal(q: string, user: AuthenticatedUser) {
    if (!user.clientId) return { query: q, results: [] as SearchHit[] };
    const results: SearchHit[] = [];
    if (user.permissions.includes('matter:read')) {
      results.push(...(await this.searchMatters(q, user, user.clientId)));
    }
    if (user.permissions.includes('document:read')) {
      results.push(...(await this.searchDocuments(q, user, user.clientId)));
    }
    return {
      query: q,
      results: results.sort((a, b) => b.rank - a.rank).slice(0, 20),
    };
  }

  /** Attorneys see only assigned matters; firm roles see portfolio-wide. */
  private attorneyMatterFilter(user: AuthenticatedUser): boolean {
    const elevated = [
      SYSTEM_ROLES.MANAGING_PARTNER,
      SYSTEM_ROLES.COORDINATOR,
      SYSTEM_ROLES.DOCKETING_ADMIN,
      SYSTEM_ROLES.IT_ADMIN,
      SYSTEM_ROLES.PARALEGAL,
      SYSTEM_ROLES.FINANCE,
      SYSTEM_ROLES.DPO_COMPLIANCE,
    ];
    return !elevated.some((r) => user.roles.includes(r));
  }

  private matterScopeSql(
    user: AuthenticatedUser,
    portalClientId?: string,
  ): Prisma.Sql {
    const parts: Prisma.Sql[] = [];
    if (portalClientId) {
      parts.push(Prisma.sql`AND m.client_id = ${portalClientId}::uuid`);
    }
    if (this.attorneyMatterFilter(user) && !portalClientId) {
      parts.push(Prisma.sql`AND m.assigned_to_id = ${user.userId}::uuid`);
    }
    return parts.length ? Prisma.join(parts, ' ') : Prisma.empty;
  }

  private async searchClients(q: string): Promise<SearchHit[]> {
    const pattern = `%${q}%`;
    const rows = await this.prisma.$queryRaw<RankedRow[]>`
      SELECT
        c.id::text AS id,
        COALESCE(
          NULLIF(c.company_name, ''),
          NULLIF(TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))), ''),
          c.internal_code,
          'Client'
        ) AS title,
        c.internal_code AS subtitle,
        NULL::text AS snippet,
        '/clients/' || c.id::text || '/overview' AS href,
        GREATEST(
          similarity(COALESCE(c.company_name, ''), ${q}),
          similarity(COALESCE(c.internal_code, ''), ${q}),
          similarity(
            TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))),
            ${q}
          )
        )::float8 AS rank
      FROM clients c
      WHERE c.status <> 'archived'
        AND (
          c.company_name ILIKE ${pattern}
          OR c.internal_code ILIKE ${pattern}
          OR c.first_name ILIKE ${pattern}
          OR c.last_name ILIKE ${pattern}
        )
      ORDER BY rank DESC NULLS LAST
      LIMIT ${SEARCH_LIMIT_PER_TYPE}
    `;
    return rows.map((r) => this.toHit('client', r, 0.1));
  }

  private async searchMatters(
    q: string,
    user: AuthenticatedUser,
    portalClientId?: string,
  ): Promise<SearchHit[]> {
    const pattern = `%${q}%`;
    const scope = this.matterScopeSql(user, portalClientId);
    const rows = await this.prisma.$queryRaw<RankedRow[]>`
      SELECT
        m.id::text AS id,
        m.title AS title,
        COALESCE(cl.company_name, cl.internal_code, '') AS subtitle,
        LEFT(COALESCE(m.description, ''), 160) AS snippet,
        '/matters/' || m.id::text || '/overview' AS href,
        GREATEST(
          similarity(m.title, ${q}),
          similarity(COALESCE(m.description, ''), ${q})
        )::float8 AS rank
      FROM matters m
      JOIN clients cl ON cl.id = m.client_id
      WHERE (
          m.title ILIKE ${pattern}
          OR COALESCE(m.description, '') ILIKE ${pattern}
          OR cl.company_name ILIKE ${pattern}
          OR cl.internal_code ILIKE ${pattern}
        )
        ${scope}
      ORDER BY rank DESC NULLS LAST
      LIMIT ${SEARCH_LIMIT_PER_TYPE}
    `;
    return rows.map((r) =>
      this.toHit('matter', {
        ...r,
        subtitle: r.subtitle || null,
        snippet: r.snippet || null,
      }),
    );
  }

  private async searchCorrespondence(
    q: string,
    user: AuthenticatedUser,
  ): Promise<SearchHit[]> {
    const scope = this.matterScopeSql(user);
    const rows = await this.prisma.$queryRaw<RankedRow[]>`
      SELECT
        c.id::text AS id,
        c.subject AS title,
        m.title AS subtitle,
        ts_headline(
          'english',
          COALESCE(c.body_text, c.subject, ''),
          plainto_tsquery('english', ${q}),
          'MaxWords=18, MinWords=8, MaxFragments=1, StartSel=<<, StopSel=>>'
        ) AS snippet,
        '/matters/' || c.matter_id::text || '/correspondence' AS href,
        ts_rank(c.body_tsvector, plainto_tsquery('english', ${q}))::float8 AS rank
      FROM correspondence c
      JOIN matters m ON m.id = c.matter_id
      WHERE c.body_tsvector @@ plainto_tsquery('english', ${q})
        ${scope}
      ORDER BY rank DESC
      LIMIT ${SEARCH_LIMIT_PER_TYPE}
    `;
    return rows.map((r) => this.toHit('correspondence', r));
  }

  private async searchDocuments(
    q: string,
    user: AuthenticatedUser,
    portalClientId?: string,
  ): Promise<SearchHit[]> {
    const scope = this.matterScopeSql(user, portalClientId);
    const rows = await this.prisma.$queryRaw<RankedRow[]>`
      SELECT
        d.id::text AS id,
        d.display_name AS title,
        m.title AS subtitle,
        NULL::text AS snippet,
        '/matters/' || d.matter_id::text || '/documents' AS href,
        ts_rank(d.search_tsvector, plainto_tsquery('english', ${q}))::float8 AS rank
      FROM matter_documents d
      JOIN matters m ON m.id = d.matter_id
      WHERE d.search_tsvector @@ plainto_tsquery('english', ${q})
        ${scope}
      ORDER BY rank DESC
      LIMIT ${SEARCH_LIMIT_PER_TYPE}
    `;
    return rows.map((r) => this.toHit('document', r));
  }

  private async searchUnlinkedEmails(q: string): Promise<SearchHit[]> {
    const rows = await this.prisma.$queryRaw<RankedRow[]>`
      SELECT
        e.id::text AS id,
        e.subject AS title,
        e.sender AS subtitle,
        ts_headline(
          'english',
          COALESCE(e.body_text, e.subject, ''),
          plainto_tsquery('english', ${q}),
          'MaxWords=18, MinWords=8, MaxFragments=1, StartSel=<<, StopSel=>>'
        ) AS snippet,
        '/email-queue' AS href,
        ts_rank(e.body_tsvector, plainto_tsquery('english', ${q}))::float8 AS rank
      FROM unlinked_emails e
      WHERE e.status = 'pending'
        AND e.body_tsvector @@ plainto_tsquery('english', ${q})
      ORDER BY rank DESC
      LIMIT ${SEARCH_LIMIT_PER_TYPE}
    `;
    return rows.map((r) => this.toHit('unlinked_email', r));
  }

  private toHit(
    type: SearchHit['type'],
    r: RankedRow,
    fallbackRank = 0,
  ): SearchHit {
    return {
      type,
      id: r.id,
      title: r.title,
      subtitle: r.subtitle ?? undefined,
      snippet: r.snippet ?? undefined,
      href: r.href,
      rank: Number(r.rank) || fallbackRank,
    };
  }
}
