import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PortalAccessService } from '../common/portal-access.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { ApprovalsService } from './approvals.service';
import { APPROVALS_MODULE } from './approvals.constants';
import { CreateApprovalDto, UpdateApprovalDto } from './dto/approval.dto';

const APPROVAL_STAFF_ROLES = [
  SYSTEM_ROLES.MANAGING_PARTNER,
  SYSTEM_ROLES.IP_ATTORNEY,
  SYSTEM_ROLES.TRADEMARK_ATTORNEY,
  SYSTEM_ROLES.COORDINATOR,
  SYSTEM_ROLES.DOCKETING_ADMIN,
  SYSTEM_ROLES.PARALEGAL,
] as const;

@Controller('matters/:matterId/approvals')
@RequirePermissions('approval:read')
@Roles(...APPROVAL_STAFF_ROLES)
@Audit({
  action: 'approval',
  resource: 'approval',
  module: APPROVALS_MODULE,
})
export class MatterApprovalsController {
  constructor(
    private readonly approvals: ApprovalsService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  async list(
    @Param('matterId') matterId: string,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.approvals.listForMatter(matterId);
  }

  @Post()
  @RequirePermissions('approval:create')
  @Audit({
    action: 'approval.create',
    resource: 'approval',
    module: APPROVALS_MODULE,
  })
  async create(
    @Param('matterId') matterId: string,
    @Body() dto: CreateApprovalDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.approvals.create(matterId, dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('approval:update')
  @Audit({
    action: 'approval.update',
    resource: 'approval',
    module: APPROVALS_MODULE,
  })
  async update(
    @Param('matterId') matterId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApprovalDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    await this.approvals.assertOnMatter(id, matterId);
    return this.approvals.update(id, dto);
  }

  @Post(':id/submit')
  @RequirePermissions('approval:update')
  @Audit({
    action: 'approval.submit',
    resource: 'approval',
    module: APPROVALS_MODULE,
  })
  async submit(
    @Param('matterId') matterId: string,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    await this.approvals.assertOnMatter(id, matterId);
    return this.approvals.submit(id, user.userId);
  }
}
