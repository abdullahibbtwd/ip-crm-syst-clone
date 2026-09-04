import { MatterType, type Prisma } from '../../generated/prisma/client';

/** Canonical create-file procedures → stored attribute values (incl. legacy drafts). */
export const TRADEMARK_PROCEDURE_STORED_VALUES: Record<string, readonly string[]> =
  {
    /** Combined list shelf: new brand + registered trademark files. */
    marks: ['new', 'registered'],
    new: ['new'],
    registered: ['registered'],
    objection: ['objection'],
    opposition: ['opposition', 'opposition_against_us', 'opposition_by_us'],
    cancellation: ['cancellation'],
    deletion: ['deletion', 'revocation'],
  };

export function trademarkProcedureFilter(
  procedure: string,
): Prisma.MatterWhereInput {
  const stored =
    TRADEMARK_PROCEDURE_STORED_VALUES[procedure] ?? ([procedure] as const);

  return {
    matterType: MatterType.trademark,
    OR: stored.map((value) => ({
      attributes: {
        is: {
          attributes: {
            path: ['trademarkProcedure'],
            equals: value,
          },
        },
      },
    })),
  };
}

export function readTrademarkProcedureFromAttributes(
  raw: unknown,
): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = (raw as Record<string, unknown>).trademarkProcedure;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export const SECONDARY_TRADEMARK_SHELVES = [
  'objection',
  'opposition',
  'cancellation',
  'deletion',
] as const;

/** Sidebar shelf for a stored procedure. Missing/legacy values land on Marks. */
export function trademarkShelfCountKey(
  stored: string | null | undefined,
): 'marks' | (typeof SECONDARY_TRADEMARK_SHELVES)[number] {
  const key = normalizeTrademarkProcedureShelfKey(stored);
  if (
    key === 'objection' ||
    key === 'opposition' ||
    key === 'cancellation' ||
    key === 'deletion'
  ) {
    return key;
  }
  return 'marks';
}

export function secondaryTrademarkProcedureWhere(): Prisma.MatterWhereInput {
  const values = SECONDARY_TRADEMARK_SHELVES.flatMap(
    (shelf) => TRADEMARK_PROCEDURE_STORED_VALUES[shelf] ?? [],
  );
  return {
    matterType: MatterType.trademark,
    OR: values.map((value) => ({
      attributes: {
        is: {
          attributes: {
            path: ['trademarkProcedure'],
            equals: value,
          },
        },
      },
    })),
  };
}

export function marksShelfWhere(
  secondaryMatterIds: string[],
): Prisma.MatterWhereInput {
  return {
    matterType: MatterType.trademark,
    ...(secondaryMatterIds.length > 0
      ? { id: { notIn: secondaryMatterIds } }
      : {}),
  };
}

/** Map stored DB value to sidebar shelf key. */
export function normalizeTrademarkProcedureShelfKey(
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;
  for (const [key, values] of Object.entries(
    TRADEMARK_PROCEDURE_STORED_VALUES,
  )) {
    // Combined list shelf — not used when bucketing individual stored values.
    if (key === 'marks') continue;
    if ((values as readonly string[]).includes(stored)) return key;
  }
  return stored;
}
