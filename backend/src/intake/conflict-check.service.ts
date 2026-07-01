import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Flag for human review when composite pg_trgm score exceeds this (0–1). */
export const CONFLICT_SIMILARITY_THRESHOLD = 0.3;

export type ConflictHit = {
  entityType:
    | 'client'
    | 'contact'
    | 'related_company'
    | 'counterparty'
    | 'matter'
    | 'ip_right'
    | 'sign';
  entityId: string;
  label: string;
  matchField: string;
  matchedTerm: string;
  similarity: number;
};

type FuzzyRow = {
  entity_type: ConflictHit['entityType'];
  entity_id: string;
  label: string;
  match_field: string;
  similarity: number;
};

const MIN_SEARCH_TERM_LENGTH = 2;

@Injectable()
export class ConflictCheckService {
  constructor(private readonly prisma: PrismaService) {}

  async runCheck(input: {
    companyName?: string | null;
    fullName?: string | null;
    country?: string | null;
    email?: string | null;
    phone?: string | null;
    description?: string | null;
    excludeIntakeLeadId?: string;
    counterpartyTerms?: Array<{
      name?: string | null;
      company?: string | null;
    }>;
  }): Promise<ConflictHit[]> {
    const bestByKey = new Map<string, ConflictHit>();
    const threshold = CONFLICT_SIMILARITY_THRESHOLD;

    const addHit = (hit: ConflictHit) => {
      const key = `${hit.entityType}:${hit.entityId}:${hit.matchField}`;
      const existing = bestByKey.get(key);
      if (!existing || hit.similarity > existing.similarity) {
        bestByKey.set(key, hit);
      }
    };

    const terms = this.collectSearchTerms(input);

    for (const term of terms) {
      const rows = await this.fuzzySearch(
        term,
        threshold,
        input.excludeIntakeLeadId,
      );
      for (const row of rows) {
        addHit({
          entityType: row.entity_type,
          entityId: row.entity_id,
          label: row.label,
          matchField: row.match_field,
          matchedTerm: term,
          similarity: Number(row.similarity),
        });
      }
    }

    const email = input.email?.trim().toLowerCase();
    if (email) {
      const contacts = await this.prisma.contact.findMany({
        where: {
          isActive: true,
          email: { equals: email, mode: 'insensitive' },
        },
        take: 10,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      for (const contact of contacts) {
        addHit({
          entityType: 'contact',
          entityId: contact.id,
          label: `${contact.email} - ${contact.firstName} ${contact.lastName}`,
          matchField: 'email',
          matchedTerm: email,
          similarity: 1,
        });
      }
    }

    const phone = input.phone?.trim();
    if (phone) {
      const normalized = phone.replace(/\s+/g, '');
      const contacts = await this.prisma.contact.findMany({
        where: {
          isActive: true,
          OR: [
            { phone: { contains: normalized, mode: 'insensitive' } },
            { mobile: { contains: normalized, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          phone: true,
          mobile: true,
          firstName: true,
          lastName: true,
        },
      });

      for (const contact of contacts) {
        addHit({
          entityType: 'contact',
          entityId: contact.id,
          label: `${contact.phone ?? contact.mobile} - ${contact.firstName} ${contact.lastName}`,
          matchField: 'phone',
          matchedTerm: phone,
          similarity: 1,
        });
      }
    }

    return Array.from(bestByKey.values()).sort(
      (a, b) => b.similarity - a.similarity,
    );
  }

  private collectSearchTerms(input: {
    companyName?: string | null;
    fullName?: string | null;
    description?: string | null;
    counterpartyTerms?: Array<{
      name?: string | null;
      company?: string | null;
    }>;
  }): string[] {
    const terms = new Set<string>();

    const add = (value?: string | null) => {
      const trimmed = value?.trim();
      if (trimmed && trimmed.length >= MIN_SEARCH_TERM_LENGTH) {
        terms.add(trimmed);
      }
    };

    add(input.companyName);
    add(input.fullName);
    add(input.description);

    for (const part of input.description?.split(/[\n;]+/) ?? []) {
      add(part);
    }

    for (const cp of input.counterpartyTerms ?? []) {
      add(cp.name);
      add(cp.company);
    }

    return [...terms];
  }

  private async fuzzySearch(
    term: string,
    threshold: number,
    excludeIntakeLeadId?: string,
  ): Promise<FuzzyRow[]> {
    const excludeLead = excludeIntakeLeadId
      ? Prisma.sql`AND cp.intake_lead_id <> ${excludeIntakeLeadId}::uuid`
      : Prisma.empty;

    return this.prisma.$queryRaw<FuzzyRow[]>`
      SELECT * FROM (
        SELECT
          'client'::text AS entity_type,
          c.id::text AS entity_id,
          (COALESCE(c.internal_code, '-') || ' - ' || COALESCE(c.company_name, '')) AS label,
          'company_name'::text AS match_field,
          conflict_trgm_score(lower(c.company_name), lower(${term}))::float8 AS similarity
        FROM clients c
        WHERE c.status != 'archived'
          AND c.company_name IS NOT NULL
          AND conflict_trgm_score(lower(c.company_name), lower(${term})) > ${threshold}

        UNION ALL

        SELECT
          'client'::text,
          c.id::text,
          (COALESCE(c.internal_code, '-') || ' - ' ||
            trim(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))) AS label,
          'individual_name'::text,
          conflict_trgm_score(
            lower(trim(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))),
            lower(${term})
          )::float8
        FROM clients c
        WHERE c.status != 'archived'
          AND c.type = 'individual'
          AND trim(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) <> ''
          AND conflict_trgm_score(
            lower(trim(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, ''))),
            lower(${term})
          ) > ${threshold}

        UNION ALL

        SELECT
          'contact'::text,
          ct.id::text,
          (trim(ct.first_name || ' ' || ct.last_name) || ' (' || COALESCE(cl.internal_code, 'client') || ')') AS label,
          'contact_name'::text,
          conflict_trgm_score(lower(trim(ct.first_name || ' ' || ct.last_name)), lower(${term}))::float8
        FROM contacts ct
        INNER JOIN clients cl ON cl.id = ct.client_id
        WHERE ct.is_active = true
          AND conflict_trgm_score(lower(trim(ct.first_name || ' ' || ct.last_name)), lower(${term})) > ${threshold}

        UNION ALL

        SELECT
          'related_company'::text,
          rc.id::text,
          (COALESCE(rc.external_name, 'Related') || ' (under ' ||
            COALESCE(cl.internal_code, '-') || ' - ' ||
            COALESCE(cl.company_name, trim(COALESCE(cl.first_name, '') || ' ' || COALESCE(cl.last_name, ''))) || ')') AS label,
          'external_name'::text,
          conflict_trgm_score(lower(rc.external_name), lower(${term}))::float8
        FROM related_companies rc
        INNER JOIN clients cl ON cl.id = rc.client_id
        WHERE rc.external_name IS NOT NULL
          AND conflict_trgm_score(lower(rc.external_name), lower(${term})) > ${threshold}

        UNION ALL

        SELECT
          'counterparty'::text,
          cp.id::text,
          (COALESCE(cp.name, cp.company, 'Counterparty') ||
            CASE WHEN cp.name IS NOT NULL AND cp.company IS NOT NULL THEN ' / ' || cp.company ELSE '' END ||
            ' [' || cp.relationship::text || ']') AS label,
          'counterparty_name'::text,
          conflict_trgm_score(lower(cp.name), lower(${term}))::float8
        FROM counterparties cp
        WHERE cp.name IS NOT NULL
          AND conflict_trgm_score(lower(cp.name), lower(${term})) > ${threshold}
          ${excludeLead}

        UNION ALL

        SELECT
          'counterparty'::text,
          cp.id::text,
          (COALESCE(cp.company, cp.name, 'Counterparty') ||
            CASE WHEN cp.name IS NOT NULL AND cp.company IS NOT NULL THEN ' (' || cp.name || ')' ELSE '' END ||
            ' [' || cp.relationship::text || ']') AS label,
          'counterparty_company'::text,
          conflict_trgm_score(lower(cp.company), lower(${term}))::float8
        FROM counterparties cp
        WHERE cp.company IS NOT NULL
          AND conflict_trgm_score(lower(cp.company), lower(${term})) > ${threshold}
          ${excludeLead}

        UNION ALL

        SELECT
          'matter'::text AS entity_type,
          m.id::text AS entity_id,
          (COALESCE(cl.internal_code, '-') || ' - ' || m.title || ' [' || m.matter_type::text || ']') AS label,
          'matter_title'::text AS match_field,
          conflict_trgm_score(lower(m.title), lower(${term}))::float8 AS similarity
        FROM matters m
        INNER JOIN clients cl ON cl.id = m.client_id
        WHERE m.status NOT IN ('closed', 'abandoned')
          AND m.title IS NOT NULL
          AND trim(m.title) <> ''
          AND conflict_trgm_score(lower(m.title), lower(${term})) > ${threshold}

        UNION ALL

        SELECT
          'ip_right'::text,
          ir.id::text,
          (ir.title || ' (' || ir.jurisdiction || ', ' || ir.status::text || ') · ' ||
            COALESCE(cl.internal_code, 'client') || ')') AS label,
          'ip_right_title'::text,
          conflict_trgm_score(lower(ir.title), lower(${term}))::float8
        FROM ip_rights ir
        INNER JOIN clients cl ON cl.id = ir.client_id
        WHERE ir.title IS NOT NULL
          AND trim(ir.title) <> ''
          AND ir.status NOT IN ('expired', 'cancelled')
          AND conflict_trgm_score(lower(ir.title), lower(${term})) > ${threshold}

        UNION ALL

        SELECT
          'ip_right'::text,
          ir.id::text,
          (COALESCE(ir.application_number, '-') || ' (' || ir.jurisdiction || ' · ' ||
            COALESCE(cl.internal_code, 'client') || ')') AS label,
          'application_number'::text,
          conflict_trgm_score(lower(ir.application_number), lower(${term}))::float8
        FROM ip_rights ir
        INNER JOIN clients cl ON cl.id = ir.client_id
        WHERE ir.application_number IS NOT NULL
          AND trim(ir.application_number) <> ''
          AND ir.status NOT IN ('expired', 'cancelled')
          AND conflict_trgm_score(lower(ir.application_number), lower(${term})) > ${threshold}

        UNION ALL

        SELECT
          'ip_right'::text,
          ir.id::text,
          (COALESCE(ir.registration_number, '-') || ' (' || ir.jurisdiction || ' · ' ||
            COALESCE(cl.internal_code, 'client') || ')') AS label,
          'registration_number'::text,
          conflict_trgm_score(lower(ir.registration_number), lower(${term}))::float8
        FROM ip_rights ir
        INNER JOIN clients cl ON cl.id = ir.client_id
        WHERE ir.registration_number IS NOT NULL
          AND trim(ir.registration_number) <> ''
          AND ir.status NOT IN ('expired', 'cancelled')
          AND conflict_trgm_score(lower(ir.registration_number), lower(${term})) > ${threshold}

        UNION ALL

        SELECT
          'sign'::text,
          m.id::text,
          (COALESCE(cl.internal_code, '-') || ' - ' || m.title || ' · mark: ' ||
            (ma.attributes->>'markDescription')) AS label,
          'mark_description'::text,
          conflict_trgm_score(lower(ma.attributes->>'markDescription'), lower(${term}))::float8
        FROM matter_attributes ma
        INNER JOIN matters m ON m.id = ma.matter_id
        INNER JOIN clients cl ON cl.id = m.client_id
        WHERE m.status NOT IN ('closed', 'abandoned')
          AND ma.attributes->>'markDescription' IS NOT NULL
          AND trim(ma.attributes->>'markDescription') <> ''
          AND conflict_trgm_score(
            lower(ma.attributes->>'markDescription'),
            lower(${term})
          ) > ${threshold}
      ) hits
      ORDER BY similarity DESC
      LIMIT 80
    `;
  }
}
