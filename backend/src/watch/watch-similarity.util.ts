import { PrismaService } from '../prisma/prisma.service';

export const WATCH_MATCH_METHOD = 'trgm';

/**
 * Score mark similarity via Postgres conflict_trgm_score (0–1).
 * Returns null when either side is empty after trim.
 */
export async function scoreMarkSimilarity(
  a: string,
  b: string,
  prisma: PrismaService,
): Promise<number | null> {
  const left = a?.trim() ?? '';
  const right = b?.trim() ?? '';
  if (!left || !right) return null;

  const rows = await prisma.$queryRaw<Array<{ score: number }>>`
    SELECT conflict_trgm_score(${left}::text, ${right}::text)::float8 AS score
  `;

  const score = rows[0]?.score;
  return typeof score === 'number' && Number.isFinite(score) ? score : null;
}
