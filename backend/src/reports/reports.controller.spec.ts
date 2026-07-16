import { ReportsController } from './reports.controller';
import type { ReportsService } from './reports.service';
import type { ReportsRevenueService } from './reports-revenue.service';
import type { ReportsFilingService } from './reports-filing.service';
import type { ReportsRenewalsSummaryService } from './reports-renewals-summary.service';
import type { ReportsTeamWorkloadService } from './reports-team-workload.service';
import type { ReportsClientProfitabilityService } from './reports-client-profitability.service';

describe('ReportsController', () => {
  const reports = { getDeadlineRisk: jest.fn() };
  const revenue = { getRevenueSummary: jest.fn() };
  const filing = { getFilingVolumes: jest.fn() };
  const renewalsSummary = { getRenewalsSummary: jest.fn() };
  const teamWorkload = { getTeamWorkload: jest.fn() };
  const clientProfitability = { getClientProfitability: jest.fn() };

  const controller = new ReportsController(
    reports as unknown as ReportsService,
    revenue as unknown as ReportsRevenueService,
    filing as unknown as ReportsFilingService,
    renewalsSummary as unknown as ReportsRenewalsSummaryService,
    teamWorkload as unknown as ReportsTeamWorkloadService,
    clientProfitability as unknown as ReportsClientProfitabilityService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('forwards all report endpoints', async () => {
    await controller.getDeadlineRisk({ dueWithinDays: 14 } as never);
    await controller.getRevenueSummary({} as never);
    await controller.getFilingVolumes({} as never);
    await controller.getRenewalsSummary({} as never);
    await controller.getTeamWorkload();
    await controller.getClientProfitability();

    expect(reports.getDeadlineRisk).toHaveBeenCalledWith({ dueWithinDays: 14 });
    expect(revenue.getRevenueSummary).toHaveBeenCalled();
    expect(filing.getFilingVolumes).toHaveBeenCalled();
    expect(renewalsSummary.getRenewalsSummary).toHaveBeenCalled();
    expect(teamWorkload.getTeamWorkload).toHaveBeenCalled();
    expect(clientProfitability.getClientProfitability).toHaveBeenCalled();
  });
});
