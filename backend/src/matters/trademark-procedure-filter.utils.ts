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
