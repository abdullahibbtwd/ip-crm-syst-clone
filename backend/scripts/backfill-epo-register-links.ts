/**
 * One-time: rewrite EPO correspondence metadata.epoRegisterLink to smartSearch
 * using full application number (base + check digit when available).
 *
 *   npx tsx scripts/backfill-epo-register-links.ts
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  epoRegisterUrl,
  epoRegisterUrlFromParts,
} from '../src/registry/epo-register.util';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const rows = await prisma.correspondence.findMany({
    where: {
      metadata: { path: ['source'], equals: 'epo_ops' },
    },
    select: { id: true, subject: true, metadata: true },
  });

  let updated = 0;
  for (const row of rows) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const base =
      typeof meta.epoBaseNumber === 'string'
        ? meta.epoBaseNumber.replace(/\D/g, '')
        : '';
    const check =
      typeof meta.epoCheckDigit === 'string'
        ? meta.epoCheckDigit.replace(/\D/g, '')
        : '';

    let link: string;
    let fullApp: string;

    if (base && check) {
      fullApp = `${base}${check}`;
      link = epoRegisterUrlFromParts(base, check);
    } else {
      const raw =
        (typeof meta.epoAppNumber === 'string' && meta.epoAppNumber) ||
        (typeof meta.applicationNumber === 'string' && meta.applicationNumber) ||
        '';
      if (!raw) continue;
      fullApp = raw.replace(/\D/g, '') || raw;
      link = epoRegisterUrl(raw.startsWith('EP') ? raw : `EP${fullApp}`);
    }

    const prev = typeof meta.epoRegisterLink === 'string' ? meta.epoRegisterLink : '';
    if (prev === link && meta.epoAppNumber === fullApp) continue;

    await prisma.correspondence.update({
      where: { id: row.id },
      data: {
        metadata: {
          ...meta,
          epoAppNumber: fullApp,
          ...(base ? { epoBaseNumber: base } : {}),
          ...(check ? { epoCheckDigit: check } : {}),
          epoRegisterLink: link,
        } as Prisma.InputJsonValue,
      },
    });
    updated += 1;
    console.log(`Updated ${row.id}: ${prev || '(none)'} → ${link}`);
  }

  console.log(`Done. ${updated}/${rows.length} EPO correspondence row(s) updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
