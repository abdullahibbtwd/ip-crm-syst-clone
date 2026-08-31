import type { Prisma } from '../../generated/prisma/client';
import { DocumentCategory } from '../../generated/prisma/client';

export type TrademarkListFilterInput = {
  trademarkApplicant?: string;
  trademarkName?: string;
  trademarkIncoming?: string;
  trademarkRegNo?: string;
  trademarkMarkType?: string;
  trademarkMarkKind?: string;
  trademarkTerritory?: string;
  trademarkRepresentative?: string;
  trademarkAppFrom?: string;
  trademarkAppTo?: string;
  trademarkRegFrom?: string;
  trademarkRegTo?: string;
  trademarkContact?: string;
  trademarkStage?: string;
  trademarkClass?: string;
  trademarkCountry?: string;
  trademarkCertificate?: boolean;
};

function trim(value: string | undefined): string | undefined {
  const s = value?.trim();
  return s ? s : undefined;
}

function clientNameSearch(term: string): Prisma.ClientWhereInput {
  return {
    OR: [
      { companyName: { contains: term, mode: 'insensitive' } },
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { internalCode: { contains: term, mode: 'insensitive' } },
    ],
  };
}

function contactSearch(term: string): Prisma.ContactWhereInput {
  return {
    OR: [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
    ],
  };
}

function jsonAttrEquals(path: string[], value: string): Prisma.MatterWhereInput {
  return {
    attributes: {
      is: {
        attributes: {
          path,
          equals: value,
        },
      },
    },
  };
}

function jsonAttrStringContains(
  path: string[],
  value: string,
): Prisma.MatterWhereInput {
  return {
    attributes: {
      is: {
        attributes: {
          path,
          string_contains: value,
        },
      },
    },
  };
}

function jsonAttrDateRange(
  path: string[],
  from?: string,
  to?: string,
): Prisma.MatterWhereInput | undefined {
  if (!from && !to) return undefined;
  return {
    attributes: {
      is: {
        attributes: {
          path,
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      },
    },
  };
}

/**
 * Optional trademark portfolio filters for the marks list shelf.
 */
export function trademarkListFilterWhere(
  query: TrademarkListFilterInput,
): Prisma.MatterWhereInput | undefined {
  const clauses: Prisma.MatterWhereInput[] = [];

  const applicant = trim(query.trademarkApplicant);
  if (applicant) {
    clauses.push({
      OR: [
        { client: clientNameSearch(applicant) },
        { applicantClient: clientNameSearch(applicant) },
      ],
    });
  }

  const name = trim(query.trademarkName);
  if (name) {
    clauses.push({ title: { contains: name, mode: 'insensitive' } });
  }

  const incoming = trim(query.trademarkIncoming);
  if (incoming) {
    clauses.push({
      OR: [
        jsonAttrStringContains(['applicationNumber'], incoming),
        jsonAttrStringContains(['prosecution', 'applicationNumber'], incoming),
        jsonAttrStringContains(['prosecution', 'poaIncomingNumber'], incoming),
        {
          ipRights: {
            some: { applicationNumber: { contains: incoming, mode: 'insensitive' } },
          },
        },
        {
          jurisdictions: {
            some: { localRefNumber: { contains: incoming, mode: 'insensitive' } },
          },
        },
      ],
    });
  }

  const regNo = trim(query.trademarkRegNo);
  if (regNo) {
    clauses.push({
      OR: [
        jsonAttrStringContains(['registrationNumber'], regNo),
        {
          ipRights: {
            some: {
              registrationNumber: { contains: regNo, mode: 'insensitive' },
            },
          },
        },
      ],
    });
  }

  const markType = trim(query.trademarkMarkType);
  if (markType) {
    clauses.push(jsonAttrEquals(['markType'], markType));
  }

  const markKind = trim(query.trademarkMarkKind);
  if (markKind) {
    clauses.push(jsonAttrEquals(['markKind'], markKind));
  }

  const territory = trim(query.trademarkTerritory);
  if (territory) {
    clauses.push(jsonAttrEquals(['territory'], territory));
  }

  const representative = trim(query.trademarkRepresentative);
  if (representative) {
    clauses.push({
      OR: [
        jsonAttrStringContains(['mol'], representative),
        jsonAttrStringContains(['prosecution', 'representatives'], representative),
      ],
    });
  }

  const appFrom = trim(query.trademarkAppFrom);
  const appTo = trim(query.trademarkAppTo);
  if (appFrom || appTo) {
    const attrDate = jsonAttrDateRange(['applicationDate'], appFrom, appTo);
    const prosecutionDate = jsonAttrDateRange(
      ['prosecution', 'applicationDate'],
      appFrom,
      appTo,
    );
    const ipDate: Prisma.MatterWhereInput | undefined =
      appFrom || appTo
        ? {
            ipRights: {
              some: {
                filingDate: {
                  ...(appFrom ? { gte: new Date(`${appFrom}T00:00:00.000Z`) } : {}),
                  ...(appTo ? { lte: new Date(`${appTo}T23:59:59.999Z`) } : {}),
                },
              },
            },
          }
        : undefined;

    clauses.push({
      OR: [attrDate, prosecutionDate, ipDate].filter(
        (c): c is Prisma.MatterWhereInput => Boolean(c),
      ),
    });
  }

  const regFrom = trim(query.trademarkRegFrom);
  const regTo = trim(query.trademarkRegTo);
  if (regFrom || regTo) {
    const attrDate = jsonAttrDateRange(['registrationDate'], regFrom, regTo);
    const ipDate: Prisma.MatterWhereInput | undefined =
      regFrom || regTo
        ? {
            ipRights: {
              some: {
                registrationDate: {
                  ...(regFrom ? { gte: new Date(`${regFrom}T00:00:00.000Z`) } : {}),
                  ...(regTo ? { lte: new Date(`${regTo}T23:59:59.999Z`) } : {}),
                },
              },
            },
          }
        : undefined;

    clauses.push({
      OR: [attrDate, ipDate].filter(
        (c): c is Prisma.MatterWhereInput => Boolean(c),
      ),
    });
  }

  const contact = trim(query.trademarkContact);
  if (contact) {
    clauses.push({
      OR: [
        {
          client: {
            contacts: { some: contactSearch(contact) },
          },
        },
        {
          applicantClient: {
            contacts: { some: contactSearch(contact) },
          },
        },
      ],
    });
  }

  const stage = trim(query.trademarkStage);
  if (stage) {
    clauses.push(jsonAttrEquals(['prosecution', 'stage'], stage));
  }

  const niceClass = trim(query.trademarkClass);
  if (niceClass) {
    const n = Number.parseInt(niceClass, 10);
    if (!Number.isNaN(n)) {
      clauses.push({
        OR: [
          {
            attributes: {
              is: {
                attributes: {
                  path: ['niceClasses'],
                  array_contains: n,
                },
              },
            },
          },
          {
            attributes: {
              is: {
                attributes: {
                  path: ['niceClasses'],
                  array_contains: String(n),
                },
              },
            },
          },
        ],
      });
    }
  }

  const country = trim(query.trademarkCountry)?.toUpperCase();
  if (country) {
    clauses.push({
      jurisdictions: { some: { countryCode: country } },
    });
  }

  if (query.trademarkCertificate === true) {
    clauses.push({
      documents: { some: { category: DocumentCategory.certificate } },
    });
  }

  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0]!;
  return { AND: clauses };
}

export function hasTrademarkListFilters(
  query: TrademarkListFilterInput,
): boolean {
  return Boolean(
    trim(query.trademarkApplicant) ||
      trim(query.trademarkName) ||
      trim(query.trademarkIncoming) ||
      trim(query.trademarkRegNo) ||
      trim(query.trademarkMarkType) ||
      trim(query.trademarkMarkKind) ||
      trim(query.trademarkTerritory) ||
      trim(query.trademarkRepresentative) ||
      trim(query.trademarkAppFrom) ||
      trim(query.trademarkAppTo) ||
      trim(query.trademarkRegFrom) ||
      trim(query.trademarkRegTo) ||
      trim(query.trademarkContact) ||
      trim(query.trademarkStage) ||
      trim(query.trademarkClass) ||
      trim(query.trademarkCountry) ||
      query.trademarkCertificate === true,
  );
}
