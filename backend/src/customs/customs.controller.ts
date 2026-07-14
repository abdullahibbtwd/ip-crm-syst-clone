import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CustomsService } from './customs.service';
import {
  CreateCustodyLogDto,
  CreateCustomsApplicationDto,
  CreateCustomsSeizureDto,
  UpdateCustomsApplicationDto,
  UpdateCustomsSeizureDto,
} from './dto/customs.dto';

@Controller()
@Audit({ action: 'customs', resource: 'customs', module: 'customs' })
export class CustomsController {
  constructor(private readonly customs: CustomsService) {}

  @Get('matters/:matterId/customs/seizures')
  @RequirePermissions('customs:read')
  listSeizures(@Param('matterId', ParseUUIDPipe) matterId: string) {
    return this.customs.listSeizures(matterId);
  }

  @Post('matters/:matterId/customs/seizures')
  @RequirePermissions('customs:create')
  createSeizure(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() dto: CreateCustomsSeizureDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.customs.createSeizure(matterId, dto, user.userId);
  }

  @Get('customs/seizures/:id')
  @RequirePermissions('customs:read')
  getSeizure(@Param('id', ParseUUIDPipe) id: string) {
    return this.customs.getSeizure(id);
  }

  @Patch('customs/seizures/:id')
  @RequirePermissions('customs:update')
  updateSeizure(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomsSeizureDto,
  ) {
    return this.customs.updateSeizure(id, dto);
  }

  @Post('customs/seizures/:id/custody')
  @RequirePermissions('customs:update')
  addCustody(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCustodyLogDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.customs.addCustody(id, dto, user.userId);
  }

  @Get('matters/:matterId/customs/applications')
  @RequirePermissions('customs:read')
  listApplications(@Param('matterId', ParseUUIDPipe) matterId: string) {
    return this.customs.listApplications(matterId);
  }

  @Post('matters/:matterId/customs/applications')
  @RequirePermissions('customs:create')
  createApplication(
    @Param('matterId', ParseUUIDPipe) matterId: string,
    @Body() dto: CreateCustomsApplicationDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.customs.createApplication(matterId, dto, user.userId);
  }

  @Patch('customs/applications/:id')
  @RequirePermissions('customs:update')
  updateApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomsApplicationDto,
  ) {
    return this.customs.updateApplication(id, dto);
  }
}
