import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PortalAccessService } from '../common/portal-access.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { ApprovalsService } from './approvals.service';
import { APPROVALS_MODULE } from './approvals.constants';
import { DecideApprovalDto } from './dto/approval.dto';

@Controller('portal/approvals')
@RequirePermissions('approval:read')
@Roles(SYSTEM_ROLES.PORTAL_CLIENT)
@Audit({
  action: 'approval',
  resource: 'approval',
  module: APPROVALS_MODULE,
})
export class PortalApprovalsController {
  constructor(
    private readonly approvals: ApprovalsService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  list(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.approvals.listForPortalClient(clientId);
  }

  @Post(':id/decide')
  @RequirePermissions('approval:update')
  @Audit({
    action: 'approval.decide',
    resource: 'approval',
    module: APPROVALS_MODULE,
  })
  decide(
    @Param('id') id: string,
    @Body() dto: DecideApprovalDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.approvals.decide(id, clientId, user.userId, dto);
  }
}
