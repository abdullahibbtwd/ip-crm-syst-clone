import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import {
  CreatePrecedentDto,
  HarvestPrecedentDto,
  ListPrecedentsQueryDto,
  UpdatePrecedentDto,
} from './dto/precedent.dto';
import { PrecedentsService } from './precedents.service';

const MODULE = 'precedents';

@Controller('precedents')
@RequirePermissions('precedent:read')
@Audit({ action: 'precedent', resource: 'precedent', module: MODULE })
export class PrecedentsController {
  constructor(private readonly precedents: PrecedentsService) {}

  @Get()
  list(@Query() query: ListPrecedentsQueryDto, @Req() req: Request) {
    return this.precedents.list(query, req.user as AuthenticatedUser);
  }

  @Post('from-correspondence/:correspondenceId')
  @RequirePermissions('precedent:create')
  @Audit({
    action: 'precedent.harvest',
    resource: 'precedent',
    module: MODULE,
  })
  fromCorrespondence(
    @Param('correspondenceId') correspondenceId: string,
    @Body() body: HarvestPrecedentDto,
    @Req() req: Request,
  ) {
    return this.precedents.fromCorrespondence(
      correspondenceId,
      body,
      req.user as AuthenticatedUser,
    );
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: Request) {
    return this.precedents.get(id, req.user as AuthenticatedUser);
  }

  @Post()
  @RequirePermissions('precedent:create')
  @Audit({ action: 'precedent.create', resource: 'precedent', module: MODULE })
  create(@Body() body: CreatePrecedentDto, @Req() req: Request) {
    return this.precedents.create(body, req.user as AuthenticatedUser);
  }

  @Patch(':id')
  @RequirePermissions('precedent:update')
  @Audit({ action: 'precedent.update', resource: 'precedent', module: MODULE })
  update(
    @Param('id') id: string,
    @Body() body: UpdatePrecedentDto,
    @Req() req: Request,
  ) {
    return this.precedents.update(id, body, req.user as AuthenticatedUser);
  }

  @Post(':id/publish')
  @RequirePermissions('precedent:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER)
  @Audit({ action: 'precedent.publish', resource: 'precedent', module: MODULE })
  publish(@Param('id') id: string, @Req() req: Request) {
    return this.precedents.publish(id, req.user as AuthenticatedUser);
  }

  @Post(':id/archive')
  @RequirePermissions('precedent:update')
  @Audit({ action: 'precedent.archive', resource: 'precedent', module: MODULE })
  archive(@Param('id') id: string, @Req() req: Request) {
    return this.precedents.archive(id, req.user as AuthenticatedUser);
  }

  @Delete(':id')
  @RequirePermissions('precedent:delete')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER)
  @Audit({ action: 'precedent.delete', resource: 'precedent', module: MODULE })
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.precedents.delete(id, req.user as AuthenticatedUser);
  }
}
