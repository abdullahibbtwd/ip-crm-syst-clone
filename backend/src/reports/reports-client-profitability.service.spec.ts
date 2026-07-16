import {
  PROFITABILITY_BASIS_REVENUE_PROXY,
  PROFITABILITY_BASIS_TRUE_MARGIN,
  ReportsClientProfitabilityService,
} from './reports-client-profitability.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsClientProfitabilityService', () => {
  let service: ReportsClientProfitabilityService;
  let prisma: {
    rateCard: { count: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      rateCard: { count: jest.fn() },
      $queryRaw: jest.fn(),
    };
    service = new ReportsClientProfitabilityService(
      prisma as unknown as PrismaService,
    );
  });

  it('returns revenue proxy basis when no cost cards configured', async () => {
    prisma.rateCard.count.mockResolvedValue(0);
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.getClientProfitability();

    expect(result.profitabilityBasis).toBe(PROFITABILITY_BASIS_REVENUE_PROXY);
    expect(result.summary.clientCount).toBe(0);
    expect(result.clients).toEqual([]);
    expect(result.currency).toBe('EUR');
  });

  it('maps client rows and uses true margin basis when cost cards exist', async () => {
    prisma.rateCard.count.mockResolvedValue(2);
    prisma.$queryRaw.mockResolvedValue([
      {
        client_id: 'c1',
        internal_code: 'CL-1',
        company_name: 'Acme Corp',
        first_name: null,
        last_name: null,
        type: 'company',
        matter_count: 3,
        total_billable_amount: '8000.00',
        total_internal_cost: '2000.00',
        total_fixed_fees: '500.00',
        total_revenue: '8500.00',
        unbilled_amount: '100.00',
      },
    ]);

    const result = await service.getClientProfitability();

    expect(result.profitabilityBasis).toBe(PROFITABILITY_BASIS_TRUE_MARGIN);
    expect(result.clients).toHaveLength(1);
    expect(result.clients[0]).toMatchObject({
      client: {
        id: 'c1',
        displayName: 'Acme Corp',
      },
      matterCount: 3,
      totalRevenue: 8500,
      totalInternalCost: 2000,
      totalMargin: 6500,
      unbilledAmount: 100,
    });
    expect(result.summary).toMatchObject({
      clientCount: 1,
      matterCount: 3,
      totalRevenue: 8500,
      totalMargin: 6500,
    });
  });
});
