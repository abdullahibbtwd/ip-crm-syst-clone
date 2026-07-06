import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PortalAccessService } from '../common/portal-access.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { InstructRenewalDto } from './dto/renewal-workflow.dto';
import { RENEWALS_MODULE } from './renewals.constants';
import { RenewalsService } from './renewals.service';

@Controller('portal/renewals')
@RequirePermissions('renewal:read')
@Roles(SYSTEM_ROLES.PORTAL_CLIENT)
@Audit({ action: 'renewal', resource: 'renewal', module: RENEWALS_MODULE })
export class PortalRenewalsController {
  constructor(
    private readonly renewals: RenewalsService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  list(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.renewals.listForPortalClient(clientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.renewals.findOneForPortal(id, clientId);
  }

  @Post(':id/instruct')
  @RequirePermissions('renewal:instruct')
  instruct(
    @Param('id') id: string,
    @Body() dto: InstructRenewalDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.renewals.portalInstruct(id, dto, user, clientId);
  }
}
