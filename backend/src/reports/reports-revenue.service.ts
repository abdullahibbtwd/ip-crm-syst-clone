import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '../../generated/prisma/client';
import { roundMoney } from '../billing/billing.utils';
import { PrismaService } from '../prisma/prisma.service';
import { RevenueSummaryQueryDto } from './dto/revenue-summary-query.dto';
import {
  AgingBucket,
  daysPastDue,
  OPEN_PAYMENT_STATUSES,
  receivablesAgingBucket,
} from './receivables-aging.util';

const invoiceClientSelect = {
  id: true,
  companyName: true,
  firstName: true,
  lastName: true,
  internalCode: true,
  type: true,
} as const;

type RevenueInvoiceRow = Prisma.InvoiceGetPayload<{
  select: {
    id: true;
    invoiceNumber: true;
    issueDate: true;
    dueDate: true;
    currency: true;
    totalAmount: true;
    paidAmount: true;
    paymentStatus: true;
    clientId: true;
    client: { select: typeof invoiceClientSelect };
  };
}>;

function decimalToNumber(value: Prisma.Decimal | number) {
  return roundMoney(Number(value));
}

function clientDisplayName(client: RevenueInvoiceRow['client']) {
  if (client.companyName) return client.companyName;
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  return name || client.internalCode || 'Client';
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function resolvePeriod(query: RevenueSummaryQueryDto) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getFullYear(), to.getMonth() - 11, 1);
  return { from, to };
}

type AgingCounts = Record<AgingBucket, { count: number; amount: number }>;

function emptyAgingCounts(): AgingCounts {
  return {
    current: { count: 0, amount: 0 },
    overdue30: { count: 0, amount: 0 },
    overdue60: { count: 0, amount: 0 },
    overdue90plus: { count: 0, amount: 0 },
  };
}

@Injectable()
export class ReportsRevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueSummary(query: RevenueSummaryQueryDto) {
    const now = new Date();
    const period = resolvePeriod(query);

    const issuedWhere: Prisma.InvoiceWhereInput = {
      status: InvoiceStatus.issued,
      issueDate: {
        gte: period.from,
        lte: period.to,
      },
      ...(query.clientId ? { clientId: query.clientId } : {}),
    };

    const openReceivablesWhere: Prisma.InvoiceWhereInput = {
      status: InvoiceStatus.issued,
      paymentStatus: { in: OPEN_PAYMENT_STATUSES },
      ...(query.clientId ? { clientId: query.clientId } : {}),
    };

    const [periodInvoices, openInvoices] = await Promise.all([
      this.prisma.invoice.findMany({
        where: issuedWhere,
        orderBy: [{ issueDate: 'asc' }],
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          dueDate: true,
          currency: true,
          totalAmount: true,
          paidAmount: true,
          paymentStatus: true,
          clientId: true,
          client: { select: invoiceClientSelect },
        },
      }),
      this.prisma.invoice.findMany({
        where: openReceivablesWhere,
        orderBy: [{ dueDate: 'asc' }],
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          dueDate: true,
          currency: true,
          totalAmount: true,
          paidAmount: true,
          paymentStatus: true,
          clientId: true,
          client: { select: invoiceClientSelect },
        },
      }),
    ]);

    const monthMap = new Map<
      string,
      {
        month: string;
        invoiced: number;
        paid: number;
        outstanding: number;
        byPaymentStatus: Record<string, { count: number; amount: number }>;
      }
    >();

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    const paymentStatusTotals: Record<string, { count: number; amount: number }> = {
      unpaid: { count: 0, amount: 0 },
      partial: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
    };

    for (const row of periodInvoices) {
      const invoiced = decimalToNumber(row.totalAmount);
      const paid = decimalToNumber(row.paidAmount);
      const outstanding = roundMoney(Math.max(invoiced - paid, 0));
      const issueDate = row.issueDate ? new Date(row.issueDate) : period.from;
      const key = monthKey(issueDate);

      totalInvoiced = roundMoney(totalInvoiced + invoiced);
      totalPaid = roundMoney(totalPaid + paid);
      totalOutstanding = roundMoney(totalOutstanding + outstanding);

      const statusKey = row.paymentStatus;
      paymentStatusTotals[statusKey].count += 1;
      paymentStatusTotals[statusKey].amount = roundMoney(
        paymentStatusTotals[statusKey].amount + invoiced,
      );

      let bucket = monthMap.get(key);
      if (!bucket) {
        bucket = {
          month: key,
          invoiced: 0,
          paid: 0,
          outstanding: 0,
          byPaymentStatus: {
            unpaid: { count: 0, amount: 0 },
            partial: { count: 0, amount: 0 },
            paid: { count: 0, amount: 0 },
          },
        };
        monthMap.set(key, bucket);
      }

      bucket.invoiced = roundMoney(bucket.invoiced + invoiced);
      bucket.paid = roundMoney(bucket.paid + paid);
      bucket.outstanding = roundMoney(bucket.outstanding + outstanding);
      bucket.byPaymentStatus[statusKey].count += 1;
      bucket.byPaymentStatus[statusKey].amount = roundMoney(
        bucket.byPaymentStatus[statusKey].amount + invoiced,
      );
    }

    const byMonth = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));

    const aging = emptyAgingCounts();
    const agingPreview: Array<{
      id: string;
      invoiceNumber: string | null;
      clientId: string;
      clientName: string;
      dueDate: string | null;
      outstanding: number;
      currency: string;
      agingBucket: AgingBucket;
      daysPastDue: number | null;
    }> = [];

    for (const row of openInvoices) {
      const invoiced = decimalToNumber(row.totalAmount);
      const paid = decimalToNumber(row.paidAmount);
      const outstanding = roundMoney(Math.max(invoiced - paid, 0));
      if (outstanding <= 0) continue;

      const dueDate = row.dueDate ? new Date(row.dueDate) : null;
      const bucket = receivablesAgingBucket(dueDate, now);
      aging[bucket].count += 1;
      aging[bucket].amount = roundMoney(aging[bucket].amount + outstanding);

      agingPreview.push({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        clientId: row.clientId,
        clientName: clientDisplayName(row.client),
        dueDate: dueDate?.toISOString() ?? null,
        outstanding,
        currency: row.currency,
        agingBucket: bucket,
        daysPastDue: dueDate ? daysPastDue(dueDate, now) : null,
      });
    }

    const AGING_SORT: Record<AgingBucket, number> = {
      overdue90plus: 0,
      overdue60: 1,
      overdue30: 2,
      current: 3,
    };

    agingPreview.sort(
      (a, b) =>
        AGING_SORT[a.agingBucket] - AGING_SORT[b.agingBucket] ||
        (b.daysPastDue ?? 0) - (a.daysPastDue ?? 0) ||
        b.outstanding - a.outstanding,
    );

    const openReceivablesTotal = roundMoney(
      Object.values(aging).reduce((sum, b) => roundMoney(sum + b.amount), 0),
    );

    const criticalReceivables = roundMoney(
      aging.overdue60.amount + aging.overdue90plus.amount,
    );

    const currency = periodInvoices[0]?.currency ?? openInvoices[0]?.currency ?? 'EUR';

    return {
      generatedAt: now.toISOString(),
      period: {
        from: startOfMonth(period.from).toISOString(),
        to: period.to.toISOString(),
      },
      currency,
      summary: {
        totalInvoiced,
        totalPaid,
        totalOutstanding: openReceivablesTotal,
        periodOutstanding: totalOutstanding,
        invoiceCount: periodInvoices.length,
        openInvoiceCount: openInvoices.filter(
          (r) => decimalToNumber(r.totalAmount) - decimalToNumber(r.paidAmount) > 0,
        ).length,
        criticalReceivables,
        byPaymentStatus: paymentStatusTotals,
      },
      byMonth,
      aging,
      agingPreview: agingPreview.slice(0, 50),
    };
  }
}
