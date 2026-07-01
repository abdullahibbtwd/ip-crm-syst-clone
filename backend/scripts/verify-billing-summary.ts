import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { computeTimeEntryAmount } from '../src/billing/billing.utils';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type SummaryRow = {
  matter_id: string;
  total_hours: string | number;
  total_billable_hours: string | number;
  total_billable_amount: string | number;
  total_fixed_fees: string | number;
  total_amount: string | number;
  unbilled_amount: string | number;
};

function num(v: string | number): number {
  return Number(v);
}

function assertClose(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 0.001) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function main() {
  const matter = await prisma.matter.findFirst({
    select: { id: true, title: true },
  });
  const user = await prisma.user.findFirst({
    where: { email: 'admin@ipconsulting.bg' },
    select: { id: true },
  });
  if (!matter || !user) {
    throw new Error('Need at least one matter and admin user in the database');
  }

  const matterId = matter.id;
  const prefix = `[billing-verify ${matter.title}]`;

  await prisma.timeEntry.deleteMany({ where: { matterId } });
  await prisma.fixedFee.deleteMany({ where: { matterId } });

  const entries = [
    { hours: 3, rate: 150, isBillable: true, desc: 'Billable patent work' },
    { hours: 1, rate: 150, isBillable: false, desc: 'Internal review' },
    { hours: 2, rate: 100, isBillable: true, desc: 'Billable TM work' },
  ];

  for (const e of entries) {
    await prisma.timeEntry.create({
      data: {
        matterId,
        loggedById: user.id,
        date: new Date('2026-06-01'),
        hours: e.hours,
        description: e.desc,
        isBillable: e.isBillable,
        rateSnapshot: e.rate,
        amount: computeTimeEntryAmount(e.hours, e.rate, e.isBillable),
      },
    });
  }

  await prisma.fixedFee.create({
    data: {
      matterId,
      description: 'BPO filing fee',
      amount: 500,
      category: 'disbursement',
      date: new Date('2026-06-15'),
      isBillable: true,
    },
  });
  await prisma.fixedFee.create({
    data: {
      matterId,
      description: 'Internal courier',
      amount: 50,
      category: 'expense',
      date: new Date('2026-06-16'),
      isBillable: false,
    },
  });

  const expected = {
    totalHours: 6,
    totalBillableHours: 5,
    totalBillableAmount: 650,
    totalFixedFees: 500,
    totalAmount: 1150,
    unbilledAmount: 1150,
  };

  const rows = await prisma.$queryRaw<SummaryRow[]>`
    SELECT * FROM billing_summary WHERE matter_id = ${matterId}::uuid
  `;
  const row = rows[0];
  if (!row) throw new Error('billing_summary returned no row for matter');

  const actual = {
    totalHours: num(row.total_hours),
    totalBillableHours: num(row.total_billable_hours),
    totalBillableAmount: num(row.total_billable_amount),
    totalFixedFees: num(row.total_fixed_fees),
    totalAmount: num(row.total_amount),
    unbilledAmount: num(row.unbilled_amount),
  };

  assertClose(actual.totalHours, expected.totalHours, 'total_hours');
  assertClose(actual.totalBillableHours, expected.totalBillableHours, 'total_billable_hours');
  assertClose(actual.totalBillableAmount, expected.totalBillableAmount, 'total_billable_amount');
  assertClose(actual.totalFixedFees, expected.totalFixedFees, 'total_fixed_fees');
  assertClose(actual.totalAmount, expected.totalAmount, 'total_amount');
  assertClose(actual.unbilledAmount, expected.unbilledAmount, 'unbilled_amount');

  console.log(`${prefix} PASS`, { matterId, expected, actual });

  await prisma.timeEntry.deleteMany({ where: { matterId } });
  await prisma.fixedFee.deleteMany({ where: { matterId } });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
