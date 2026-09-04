import type { Prisma } from '../../generated/prisma/client';

/** Matters filed as Supplementary Protection Certificates (patent subtype). */
export function spcMatterWhere(): Prisma.MatterWhereInput {
  return {
    OR: [
      {
        attributes: {
          is: {
            attributes: {
              path: ['spc'],
              equals: true,
            },
          },
        },
      },
      {
        attributes: {
          is: {
            attributes: {
              path: ['patentProcedure'],
              equals: 'spc',
            },
          },
        },
      },
    ],
  };
}

/** Exclude SPC files from the regular patent shelf. */
export function excludeSpcMatterWhere(
  spcMatterIds: string[] = [],
): Prisma.MatterWhereInput {
  if (spcMatterIds.length === 0) return {};
  return { id: { notIn: spcMatterIds } };
}
