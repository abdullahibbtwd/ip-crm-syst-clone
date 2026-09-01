import type { Prisma } from '../../generated/prisma/client';
import { DocumentCategory, IpRightStatus } from '../../generated/prisma/client';

export type SpcListFilterInput = {
  spcApplicant?: string;
  spcName?: string;
  spcIncoming?: string;
  spcRegNo?: string;
  spcTerritory?: string;
  spcRepresentative?: string;
  spcAppFrom?: string;
  spcAppTo?: string;
  spcRegFrom?: string;
  spcRegTo?: string;
  spcContact?: string;
  spcStage?: string;
  spcCertificate?: string;
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function spcListFilterWhere(
  query: SpcListFilterInput,
): Prisma.MatterWhereInput | undefined {
  const clauses: Prisma.MatterWhereInput[] = [];

  const applicant = trim(query.spcApplicant);
  if (applicant) {
    clauses.push({
      OR: [
        { client: clientNameSearch(applicant) },
        { applicantClient: clientNameSearch(applicant) },
        jsonAttrStringContains(['ownerLegalName'], applicant),
        jsonAttrStringContains(['clientLegalName'], applicant),
      ],
    });
  }

  const name = trim(query.spcName);
  if (name) {
    clauses.push({
      OR: [
        { title: { contains: name, mode: 'insensitive' } },
        jsonAttrStringContains(['spcName'], name),
        jsonAttrStringContains(['patentName'], name),
      ],
    });
  }

  const incoming = trim(query.spcIncoming);
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

  const regNo = trim(query.spcRegNo);
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

  const territory = trim(query.spcTerritory)?.toUpperCase();
  if (territory) {
    clauses.push({
      OR: [
        { jurisdictions: { some: { countryCode: territory } } },
        jsonAttrEquals(['filingCountry'], territory),
      ],
    });
  }

  const representative = trim(query.spcRepresentative);
  if (representative) {
    if (UUID_RE.test(representative)) {
      clauses.push({
        OR: [
          {
            attributes: {
              is: {
                attributes: {
                  path: ['representativeHoldingGroupIds'],
                  array_contains: representative,
                },
              },
            },
          },
          { client: { holdingGroupId: representative } },
        ],
      });
    } else {
      clauses.push({
        OR: [
          jsonAttrStringContains(['mol'], representative),
          jsonAttrStringContains(['prosecution', 'representatives'], representative),
        ],
      });
    }
  }

  const appFrom = trim(query.spcAppFrom);
  const appTo = trim(query.spcAppTo);
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

  const regFrom = trim(query.spcRegFrom);
  const regTo = trim(query.spcRegTo);
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

  const contact = trim(query.spcContact);
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
        jsonAttrStringContains(['contactPerson', 'name'], contact),
        jsonAttrStringContains(['contactPerson', 'email'], contact),
        jsonAttrStringContains(['contactPerson', 'phone'], contact),
      ],
    });
  }

  const stage = trim(query.spcStage);
  if (stage) {
    if (stage === 'registered') {
      clauses.push({
        OR: [
          jsonAttrEquals(['prosecution', 'stage'], 'registration'),
          {
            ipRights: {
              some: { status: IpRightStatus.registered },
            },
          },
          {
            attributes: {
              is: {
                attributes: {
                  path: ['registrationNumber'],
                  not: '',
                },
              },
            },
          },
        ],
      });
    } else {
      clauses.push(jsonAttrEquals(['prosecution', 'stage'], stage));
    }
  }

  const certificate = trim(query.spcCertificate);
  if (certificate === 'with') {
    clauses.push({
      documents: { some: { category: DocumentCategory.certificate } },
    });
  } else if (certificate === 'without') {
    clauses.push({
      documents: { none: { category: DocumentCategory.certificate } },
    });
  }

  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0]!;
  return { AND: clauses };
}
