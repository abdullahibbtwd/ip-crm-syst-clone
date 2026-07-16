import { Prisma } from '../../generated/prisma/client';
import type { ReportsRevenueService } from '../reports/reports-revenue.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingOverviewService } from './billing-overview.service';
import type { BillingService } from './billing.service';

describe('BillingOverviewService', () => {
  let service: BillingOverviewService;
  let reportsRevenue: { getRevenueSummary: jest.Mock };
  let billing: { listRateCards: jest.Mock };
  let prisma: {
    timeEntry: { aggregate: jest.Mock };
  };

  beforeEach(() => {
    reportsRevenue = {
      getRevenueSummary: jest.fn().mockResolvedValue({
        periodFrom: '2025-08-01',
        periodTo: '2026-07-16',
        totalRevenue: 10000,
      }),
    };
    billing = {
      listRateCards: jest.fn().mockResolvedValue([
        { id: 'rc1', internalCostPerHour: 80 },
        { id: 'rc2', internalCostPerHour: null },
      ]),
    };
    prisma = {
      timeEntry: {
        aggregate: jest.fn().mockResolvedValue({
          _count: { _all: 3 },
          _sum: {
            hours: new Prisma.Decimal('4.5'),
            amount: new Prisma.Decimal('0'),
          },
        }),
      },
    };

    service = new BillingOverviewService(
      reportsRevenue as unknown as ReportsRevenueService,
      billing as unknown as BillingService,
      prisma as unknown as PrismaService,
    );
  });

  it('returns overview with true_margin when internal cost exists', async () => {
    const result = await service.getOverview();

    expect(reportsRevenue.getRevenueSummary).toHaveBeenCalledWith({});
    expect(billing.listRateCards).toHaveBeenCalled();
    expect(result.revenueSummary.totalRevenue).toBe(10000);
    expect(result.rateCardsHealth).toMatchObject({
      rateCardsTotal: 2,
      hasInternalCostConfigured: true,
      internalCostRateCards: 1,
      profitabilityBasis: 'true_margin',
      unratedTimeEntries: {
        count: 3,
        totalHours: 4.5,
        totalAmount: 0,
      },
    });
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('uses revenue_proxy when no internal cost configured', async () => {
    billing.listRateCards.mockResolvedValue([
      { id: 'rc1', internalCostPerHour: null },
    ]);

    const result = await service.getOverview();

    expect(result.rateCardsHealth.profitabilityBasis).toBe('revenue_proxy');
    expect(result.rateCardsHealth.hasInternalCostConfigured).toBe(false);
  });
});
