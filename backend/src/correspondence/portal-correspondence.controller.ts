import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PortalAccessService } from '../common/portal-access.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { CorrespondenceService } from './correspondence.service';

const CORRESPONDENCE_MODULE = 'correspondence';

@Controller('portal/correspondence')
@RequirePermissions('correspondence:read')
@Roles(SYSTEM_ROLES.PORTAL_CLIENT)
@Audit({
  action: 'correspondence',
  resource: 'correspondence',
  module: CORRESPONDENCE_MODULE,
})
export class PortalCorrespondenceController {
  constructor(
    private readonly correspondence: CorrespondenceService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  list(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.correspondence.listForPortalClient(clientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.correspondence.findOneForPortal(id, clientId);
  }
}
