import { Controller, Get, Query } from '@nestjs/common';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { DeadlineRiskQueryDto } from './dto/deadline-risk-query.dto';
import { FilingVolumesQueryDto } from './dto/filing-volumes-query.dto';
import { RenewalsSummaryQueryDto } from './dto/renewals-summary-query.dto';
import { RevenueSummaryQueryDto } from './dto/revenue-summary-query.dto';
import { ReportsClientProfitabilityService } from './reports-client-profitability.service';
import { ReportsFilingService } from './reports-filing.service';
import { ReportsRenewalsSummaryService } from './reports-renewals-summary.service';
import { ReportsRevenueService } from './reports-revenue.service';
import { ReportsTeamWorkloadService } from './reports-team-workload.service';
import { REPORTS_MODULE } from './reports.constants';
import { ReportsService } from './reports.service';

@Controller('reports')
@RequirePermissions('registry:read')
@Audit({ action: 'report', resource: 'registry', module: REPORTS_MODULE })
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly revenue: ReportsRevenueService,
    private readonly filing: ReportsFilingService,
    private readonly renewalsSummary: ReportsRenewalsSummaryService,
    private readonly teamWorkload: ReportsTeamWorkloadService,
    private readonly clientProfitability: ReportsClientProfitabilityService,
  ) {}

  @Get('deadline-risk')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  getDeadlineRisk(@Query() query: DeadlineRiskQueryDto) {
    return this.reports.getDeadlineRisk(query);
  }

  @Get('revenue-summary')
  @RequirePermissions('invoice:read')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
  getRevenueSummary(@Query() query: RevenueSummaryQueryDto) {
    return this.revenue.getRevenueSummary(query);
  }

  @Get('filing-volumes')
  @RequirePermissions('matter:read')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.COORDINATOR)
  getFilingVolumes(@Query() query: FilingVolumesQueryDto) {
    return this.filing.getFilingVolumes(query);
  }

  @Get('renewals-summary')
  @RequirePermissions('renewal:read')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.COORDINATOR)
  getRenewalsSummary(@Query() query: RenewalsSummaryQueryDto) {
    return this.renewalsSummary.getRenewalsSummary(query);
  }

  @Get('team-workload')
  @RequirePermissions('matter:read')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER)
  getTeamWorkload() {
    return this.teamWorkload.getTeamWorkload();
  }

  @Get('client-profitability')
  @RequirePermissions('billing:read')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER)
  getClientProfitability() {
    return this.clientProfitability.getClientProfitability();
  }
}
