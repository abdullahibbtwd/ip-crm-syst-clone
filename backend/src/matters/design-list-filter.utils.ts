import type { Prisma } from '../../generated/prisma/client';
import { DocumentCategory, IpRightStatus } from '../../generated/prisma/client';

export type DesignListFilterInput = {
  designApplicant?: string;
  designName?: string;
  designIncoming?: string;
  designRegNo?: string;
  designTerritory?: string;
  designProcedure?: string;
  designRepresentative?: string;
  designAppFrom?: string;
  designAppTo?: string;
  designRegFrom?: string;
  designRegTo?: string;
  designContact?: string;
  designStage?: string;
  designCountry?: string;
  designCertificate?: string;
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

const DESIGN_PROCEDURE_ROUTES = new Set(['national', 'euipo', 'wipo']);

function designStageFilterWhere(stage: string): Prisma.MatterWhereInput {
  return jsonAttrEquals(['prosecution', 'stage'], stage);
}

/**
 * Optional design portfolio filters for the designs list shelf.
 */
export function designListFilterWhere(
  query: DesignListFilterInput,
): Prisma.MatterWhereInput | undefined {
  const clauses: Prisma.MatterWhereInput[] = [];

  const applicant = trim(query.designApplicant);
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

  const name = trim(query.designName);
  if (name) {
    clauses.push({
      OR: [
        { title: { contains: name, mode: 'insensitive' } },
        jsonAttrStringContains(['designName'], name),
      ],
    });
  }

  const incoming = trim(query.designIncoming);
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

  const regNo = trim(query.designRegNo);
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

  const territory = trim(query.designTerritory)?.toUpperCase();
  if (territory) {
    clauses.push({
      jurisdictions: { some: { countryCode: territory } },
    });
  }

  const procedure = trim(query.designProcedure);
  if (procedure && DESIGN_PROCEDURE_ROUTES.has(procedure)) {
    clauses.push(jsonAttrEquals(['designProcedure'], procedure));
  }

  const representative = trim(query.designRepresentative);
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

  const appFrom = trim(query.designAppFrom);
  const appTo = trim(query.designAppTo);
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

  const regFrom = trim(query.designRegFrom);
  const regTo = trim(query.designRegTo);
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

  const contact = trim(query.designContact);
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

  const stage = trim(query.designStage);
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
      clauses.push(designStageFilterWhere(stage));
    }
  }

  const country = trim(query.designCountry)?.toUpperCase();
  if (country) {
    clauses.push({
      OR: [
        { jurisdictions: { some: { countryCode: country } } },
        { client: { country: country } },
        {
          attributes: {
            is: {
              attributes: {
                path: ['designCountries'],
                array_contains: country,
              },
            },
          },
        },
      ],
    });
  }

  const certificate = trim(query.designCertificate);
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
