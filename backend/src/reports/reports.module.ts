import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsClientProfitabilityService } from './reports-client-profitability.service';
import { ReportsFilingService } from './reports-filing.service';
import { ReportsRenewalsSummaryService } from './reports-renewals-summary.service';
import { ReportsRevenueService } from './reports-revenue.service';
import { ReportsService } from './reports.service';
import { ReportsTeamWorkloadService } from './reports-team-workload.service';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsRevenueService,
    ReportsFilingService,
    ReportsRenewalsSummaryService,
    ReportsTeamWorkloadService,
    ReportsClientProfitabilityService,
  ],
  exports: [
    ReportsService,
    ReportsRevenueService,
    ReportsFilingService,
    ReportsRenewalsSummaryService,
    ReportsTeamWorkloadService,
    ReportsClientProfitabilityService,
  ],
})
export class ReportsModule {}
