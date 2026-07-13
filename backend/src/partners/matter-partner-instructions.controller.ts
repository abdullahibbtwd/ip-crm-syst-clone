import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PortalAccessService } from '../common/portal-access.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import {
  CreatePartnerInstructionDto,
  ListMatterInstructionsQueryDto,
  TransitionPartnerInstructionDto,
  UpdatePartnerInstructionDto,
} from './dto/partner-instruction.dto';
import { PartnerInstructionsService } from './partner-instructions.service';
import { PARTNERS_MODULE } from './partners.constants';

const PARTNER_STAFF_ROLES = [
  SYSTEM_ROLES.MANAGING_PARTNER,
  SYSTEM_ROLES.IP_ATTORNEY,
  SYSTEM_ROLES.TRADEMARK_ATTORNEY,
  SYSTEM_ROLES.COORDINATOR,
  SYSTEM_ROLES.DOCKETING_ADMIN,
  SYSTEM_ROLES.PARALEGAL,
] as const;

@Controller('matters/:matterId/partner-instructions')
@RequirePermissions('partner:read')
@Roles(...PARTNER_STAFF_ROLES)
@Audit({
  action: 'partner_instruction',
  resource: 'partner_instruction',
  module: PARTNERS_MODULE,
})
export class MatterPartnerInstructionsController {
  constructor(
    private readonly instructions: PartnerInstructionsService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  async list(
    @Param('matterId') matterId: string,
    @Query() query: ListMatterInstructionsQueryDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.instructions.listForMatter(matterId, query);
  }

  @Post()
  @RequirePermissions('partner:create')
  @Audit({
    action: 'partner_instruction.create',
    resource: 'partner_instruction',
    module: PARTNERS_MODULE,
  })
  async create(
    @Param('matterId') matterId: string,
    @Body() dto: CreatePartnerInstructionDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.instructions.create(matterId, dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('partner:update')
  @Audit({
    action: 'partner_instruction.update',
    resource: 'partner_instruction',
    module: PARTNERS_MODULE,
  })
  async update(
    @Param('matterId') matterId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerInstructionDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.instructions.update(matterId, id, dto);
  }

  @Post(':id/transition')
  @RequirePermissions('partner:update')
  @Audit({
    action: 'partner_instruction.transition',
    resource: 'partner_instruction',
    module: PARTNERS_MODULE,
  })
  async transition(
    @Param('matterId') matterId: string,
    @Param('id') id: string,
    @Body() dto: TransitionPartnerInstructionDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.instructions.transition(matterId, id, dto.status);
  }
}
