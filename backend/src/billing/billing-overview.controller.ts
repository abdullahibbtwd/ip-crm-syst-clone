import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { BILLING_MODULE } from './billing.constants';
import { BillingOverviewService } from './billing-overview.service';

@Controller('billing')
@RequirePermissions('registry:read', 'invoice:read', 'billing:read')
@Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
@Audit({ action: 'billing', resource: 'billing_overview', module: BILLING_MODULE })
export class BillingOverviewController {
  constructor(private readonly overview: BillingOverviewService) {}

  @Get('overview')
  getOverview() {
    return this.overview.getOverview();
  }
}

