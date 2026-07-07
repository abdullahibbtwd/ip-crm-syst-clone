import { Injectable } from '@nestjs/common';
import { roundMoney } from '../billing/billing.utils';
import { PrismaService } from '../prisma/prisma.service';

export const PROFITABILITY_BASIS_REVENUE_PROXY = 'revenue_proxy' as const;
export const PROFITABILITY_BASIS_TRUE_MARGIN = 'true_margin' as const;

export type ProfitabilityBasis =
  | typeof PROFITABILITY_BASIS_REVENUE_PROXY
  | typeof PROFITABILITY_BASIS_TRUE_MARGIN;

const REVENUE_PROXY_NOTE =
  'Based on billed revenue from the billing_summary view (billable time + fixed fees). Does not subtract internal attorney cost.';

const TRUE_MARGIN_NOTE =
  'Based on billed revenue minus internal time cost (hours × cost_snapshot from rate card resolution). Fixed fees are included in revenue only; internal cost applies to billable time entries.';

type ClientProfitabilityRow = {
  client_id: string;
  internal_code: string | null;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  type: string;
  matter_count: bigint | number;
  total_billable_amount: string | number;
  total_internal_cost: string | number;
  total_fixed_fees: string | number;
  total_revenue: string | number;
  unbilled_amount: string | number;
};

function clientDisplayName(row: ClientProfitabilityRow) {
  if (row.company_name) return row.company_name;
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return name || row.internal_code || 'Client';
}

function toNumber(value: string | number | bigint) {
  return roundMoney(Number(value));
}

@Injectable()
export class ReportsClientProfitabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getClientProfitability() {
    const now = new Date();

    const configuredCostCards = await this.prisma.rateCard.count({
      where: { internalCostPerHour: { not: null } },
    });

    const rows = await this.prisma.$queryRaw<ClientProfitabilityRow[]>`
      SELECT
        c.id AS client_id,
        c.internal_code,
        c.company_name,
        c.first_name,
        c.last_name,
        c.type,
        COUNT(m.id)::int AS matter_count,
        COALESCE(SUM(bs.total_billable_amount), 0)::decimal(12, 2) AS total_billable_amount,
        COALESCE(SUM(bs.total_internal_cost), 0)::decimal(12, 2) AS total_internal_cost,
        COALESCE(SUM(bs.total_fixed_fees), 0)::decimal(12, 2) AS total_fixed_fees,
        COALESCE(SUM(bs.total_amount), 0)::decimal(12, 2) AS total_revenue,
        COALESCE(SUM(bs.unbilled_amount), 0)::decimal(12, 2) AS unbilled_amount
      FROM clients c
      INNER JOIN matters m ON m.client_id = c.id
      LEFT JOIN billing_summary bs ON bs.matter_id = m.id
      GROUP BY
        c.id,
        c.internal_code,
        c.company_name,
        c.first_name,
        c.last_name,
        c.type
      ORDER BY total_revenue DESC, c.company_name ASC NULLS LAST, c.internal_code ASC
    `;

    const clients = rows.map((row) => {
      const totalRevenue = toNumber(row.total_revenue);
      const totalInternalCost = toNumber(row.total_internal_cost);
      return {
        client: {
          id: row.client_id,
          internalCode: row.internal_code,
          companyName: row.company_name,
          firstName: row.first_name,
          lastName: row.last_name,
          type: row.type,
          displayName: clientDisplayName(row),
        },
        matterCount: Number(row.matter_count),
        totalBillableAmount: toNumber(row.total_billable_amount),
        totalInternalCost,
        totalFixedFees: toNumber(row.total_fixed_fees),
        totalRevenue,
        totalMargin: roundMoney(totalRevenue - totalInternalCost),
        unbilledAmount: toNumber(row.unbilled_amount),
      };
    });

    const summary = clients.reduce(
      (acc, row) => ({
        clientCount: acc.clientCount + 1,
        matterCount: acc.matterCount + row.matterCount,
        totalBillableAmount: roundMoney(
          acc.totalBillableAmount + row.totalBillableAmount,
        ),
        totalInternalCost: roundMoney(
          acc.totalInternalCost + row.totalInternalCost,
        ),
        totalFixedFees: roundMoney(acc.totalFixedFees + row.totalFixedFees),
        totalRevenue: roundMoney(acc.totalRevenue + row.totalRevenue),
        totalMargin: roundMoney(acc.totalMargin + row.totalMargin),
        totalUnbilledAmount: roundMoney(
          acc.totalUnbilledAmount + row.unbilledAmount,
        ),
      }),
      {
        clientCount: 0,
        matterCount: 0,
        totalBillableAmount: 0,
        totalInternalCost: 0,
        totalFixedFees: 0,
        totalRevenue: 0,
        totalMargin: 0,
        totalUnbilledAmount: 0,
      },
    );

    const profitabilityBasis: ProfitabilityBasis =
      configuredCostCards > 0
        ? PROFITABILITY_BASIS_TRUE_MARGIN
        : PROFITABILITY_BASIS_REVENUE_PROXY;

    return {
      generatedAt: now.toISOString(),
      profitabilityBasis,
      methodologyNote:
        profitabilityBasis === PROFITABILITY_BASIS_TRUE_MARGIN
          ? TRUE_MARGIN_NOTE
          : REVENUE_PROXY_NOTE,
      currency: 'EUR',
      summary,
      clients,
    };
  }
}
