import type { Prisma } from '../../generated/prisma/client';
import { DocumentCategory, IpRightStatus } from '../../generated/prisma/client';

export type PatentListFilterInput = {
  patentApplicant?: string;
  patentName?: string;
  patentIncoming?: string;
  patentRegNo?: string;
  patentTerritory?: string;
  patentRepresentative?: string;
  patentAppFrom?: string;
  patentAppTo?: string;
  patentRegFrom?: string;
  patentRegTo?: string;
  patentContact?: string;
  patentStage?: string;
  patentCountry?: string;
  patentCertificate?: string;
  patentAnnualFees?: string;
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

const PATENT_PROCEDURE_ROUTES = new Set([
  'national',
  'european',
  'ep_validation',
  'pct',
]);

function patentStageFilterWhere(stage: string): Prisma.MatterWhereInput {
  if (stage === 'registered') {
    return {
      OR: [
        jsonAttrEquals(['prosecution', 'stage'], 'registration'),
        {
          ipRights: {
            some: { status: IpRightStatus.registered },
          },
        },
      ],
    };
  }

  if (stage === 'translation_assigned') {
    return jsonAttrEquals(['prosecution', 'stage'], 'substantive_exam');
  }

  return jsonAttrEquals(['prosecution', 'stage'], stage);
}

/**
 * Optional patent portfolio filters for the patents list shelf.
 */
export function patentListFilterWhere(
  query: PatentListFilterInput,
): Prisma.MatterWhereInput | undefined {
  const clauses: Prisma.MatterWhereInput[] = [];

  const applicant = trim(query.patentApplicant);
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

  const name = trim(query.patentName);
  if (name) {
    clauses.push({
      OR: [
        { title: { contains: name, mode: 'insensitive' } },
        jsonAttrStringContains(['patentName'], name),
      ],
    });
  }

  const incoming = trim(query.patentIncoming);
  if (incoming) {
    clauses.push({
      OR: [
        jsonAttrStringContains(['applicationNumber'], incoming),
        jsonAttrStringContains(['epApplicationNumber'], incoming),
        jsonAttrStringContains(['prosecution', 'applicationNumber'], incoming),
        jsonAttrStringContains(['prosecution', 'poaIncomingNumber'], incoming),
        jsonAttrStringContains(['validationNumber'], incoming),
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

  const regNo = trim(query.patentRegNo);
  if (regNo) {
    clauses.push({
      OR: [
        jsonAttrStringContains(['registrationNumber'], regNo),
        jsonAttrStringContains(['epRegistrationNumber'], regNo),
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

  const territory = trim(query.patentTerritory);
  if (territory && PATENT_PROCEDURE_ROUTES.has(territory)) {
    clauses.push(jsonAttrEquals(['patentProcedure'], territory));
  }

  const representative = trim(query.patentRepresentative);
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

  const appFrom = trim(query.patentAppFrom);
  const appTo = trim(query.patentAppTo);
  if (appFrom || appTo) {
    const attrDate = jsonAttrDateRange(['applicationDate'], appFrom, appTo);
    const epDate = jsonAttrDateRange(['epApplicationDate'], appFrom, appTo);
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
      OR: [attrDate, epDate, prosecutionDate, ipDate].filter(
        (c): c is Prisma.MatterWhereInput => Boolean(c),
      ),
    });
  }

  const regFrom = trim(query.patentRegFrom);
  const regTo = trim(query.patentRegTo);
  if (regFrom || regTo) {
    const attrDate = jsonAttrDateRange(['registrationDate'], regFrom, regTo);
    const epDate = jsonAttrDateRange(['epRegistrationDate'], regFrom, regTo);
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
      OR: [attrDate, epDate, ipDate].filter(
        (c): c is Prisma.MatterWhereInput => Boolean(c),
      ),
    });
  }

  const contact = trim(query.patentContact);
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

  const stage = trim(query.patentStage);
  if (stage) {
    clauses.push(patentStageFilterWhere(stage));
  }

  const country = trim(query.patentCountry)?.toUpperCase();
  if (country) {
    clauses.push({
      OR: [
        jsonAttrEquals(['nationalCountry'], country),
        jsonAttrEquals(['validationCountry'], country),
        { jurisdictions: { some: { countryCode: country } } },
        { client: { country: country } },
      ],
    });
  }

  const certificate = trim(query.patentCertificate);
  if (certificate === 'with') {
    clauses.push({
      documents: { some: { category: DocumentCategory.certificate } },
    });
  } else if (certificate === 'without') {
    clauses.push({
      documents: { none: { category: DocumentCategory.certificate } },
    });
  }

  const annualFees = trim(query.patentAnnualFees);
  if (annualFees === 'yes') {
    clauses.push({
      renewalWindows: { some: {} },
    });
  } else if (annualFees === 'no') {
    clauses.push({
      renewalWindows: { none: {} },
    });
  }

  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0]!;
  return { AND: clauses };
}
