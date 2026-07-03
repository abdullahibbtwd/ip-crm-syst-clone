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
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PortalAccessService } from '../common/portal-access.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CORRESPONDENCE_MODULE } from './correspondence.constants';
import { CorrespondenceService } from './correspondence.service';
import {
  CreateCorrespondenceDto,
  UpdateCorrespondenceDto,
} from './dto/correspondence.dto';

@Controller('matters/:matterId/correspondence')
@RequirePermissions('correspondence:read')
@Audit({
  action: 'correspondence',
  resource: 'correspondence',
  module: CORRESPONDENCE_MODULE,
})
export class MatterCorrespondenceController {
  constructor(
    private readonly correspondenceService: CorrespondenceService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  async list(@Param('matterId') matterId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.correspondenceService.listForMatter(matterId);
  }

  @Post()
  @RequirePermissions('correspondence:create')
  create(
    @Param('matterId') matterId: string,
    @Body() dto: CreateCorrespondenceDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.correspondenceService.create(matterId, dto, user.userId);
  }
}

@Controller('matters/:matterId/timeline')
@RequirePermissions('matter:read')
@Audit({
  action: 'timeline',
  resource: 'matter',
  module: CORRESPONDENCE_MODULE,
})
export class MatterTimelineController {
  constructor(
    private readonly correspondenceService: CorrespondenceService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  async list(@Param('matterId') matterId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.correspondenceService.listTimeline(matterId);
  }
}

@Controller('correspondence')
@RequirePermissions('correspondence:read')
@Audit({
  action: 'correspondence',
  resource: 'correspondence',
  module: CORRESPONDENCE_MODULE,
})
export class CorrespondenceController {
  constructor(private readonly correspondenceService: CorrespondenceService) {}

  @Patch(':id')
  @RequirePermissions('correspondence:update')
  update(@Param('id') id: string, @Body() dto: UpdateCorrespondenceDto) {
    return this.correspondenceService.update(id, dto);
  }
}
