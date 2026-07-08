import { Injectable } from '@nestjs/common';
import { ReportsRevenueService } from '../reports/reports-revenue.service';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { decimalToNumber } from './billing.utils';

export type ProfitabilityBasis = 'revenue_proxy' | 'true_margin';

export type BillingOverviewResponse = {
  generatedAt: string;
  revenueSummary: Awaited<
    ReturnType<ReportsRevenueService['getRevenueSummary']>
  >;
  rateCardsHealth: {
    rateCardsTotal: number;
    hasInternalCostConfigured: boolean;
    internalCostRateCards: number;
    profitabilityBasis: ProfitabilityBasis;
    unratedTimeEntries: {
      count: number;
      totalHours: number;
      totalAmount: number;
    };
  };
};

@Injectable()
export class BillingOverviewService {
  constructor(
    private readonly reportsRevenue: ReportsRevenueService,
    private readonly billing: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  async getOverview(): Promise<BillingOverviewResponse> {
    const revenueSummary = await this.reportsRevenue.getRevenueSummary({});

    const rateCards = await this.billing.listRateCards();
    const rateCardsTotal = rateCards.length;
    const internalCostRateCards = rateCards.filter((c) => c.internalCostPerHour != null)
      .length;
    const hasInternalCostConfigured = internalCostRateCards > 0;

    const profitabilityBasis: ProfitabilityBasis = hasInternalCostConfigured
      ? 'true_margin'
      : 'revenue_proxy';

    // Match the default revenue period used in the revenue summary report:
    // last 12 months, from first day of (current month - 11) to now.
    const now = new Date();
    const periodFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const periodTo = now;

    const unratedAgg = await this.prisma.timeEntry.aggregate({
      where: {
        rateSnapshot: 0,
        date: {
          gte: periodFrom,
          lte: periodTo,
        },
      },
      _count: { _all: true },
      _sum: { hours: true, amount: true },
    });

    return {
      generatedAt: new Date().toISOString(),
      revenueSummary,
      rateCardsHealth: {
        rateCardsTotal,
        hasInternalCostConfigured,
        internalCostRateCards,
        profitabilityBasis,
        unratedTimeEntries: {
          count: unratedAgg._count._all ?? 0,
          totalHours: decimalToNumber(unratedAgg._sum.hours ?? 0),
          totalAmount: decimalToNumber(unratedAgg._sum.amount ?? 0),
        },
      },
    };
  }
}

