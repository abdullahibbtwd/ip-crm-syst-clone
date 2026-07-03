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
import { CreateIpRightDto } from './dto/ip-right.dto';
import { FileIpRightDto } from './dto/file-ip-right.dto';
import {
  CreateMatterDto,
  MatterQueryDto,
  UpdateMatterDto,
} from './dto/matter.dto';
import { MATTERS_MODULE } from './matters.constants';
import { MattersService } from './matters.service';

@Controller('matters')
@RequirePermissions('matter:read')
@Audit({ action: 'matter', resource: 'matter', module: MATTERS_MODULE })
export class MattersController {
  constructor(private readonly mattersService: MattersService) {}

  @Post()
  @RequirePermissions('matter:create')
  create(@Body() dto: CreateMatterDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.mattersService.create(dto, user.userId);
  }

  @Get()
  findAll(@Query() query: MatterQueryDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.mattersService.findAll(query, user);
  }

  @Get(':matterId/deadlines')
  @RequirePermissions('deadline:read')
  listDeadlines(@Param('matterId') matterId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.mattersService.listDeadlines(matterId, user);
  }

  @Get(':matterId/ip-rights')
  listIpRights(@Param('matterId') matterId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.mattersService.listIpRights(matterId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.mattersService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions('matter:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMatterDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.mattersService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER)
  @RequirePermissions('matter:delete')
  remove(@Param('id') id: string) {
    return this.mattersService.remove(id);
  }

  @Post(':matterId/ip-rights')
  @RequirePermissions('matter:update')
  createIpRight(
    @Param('matterId') matterId: string,
    @Body() dto: CreateIpRightDto,
  ) {
    return this.mattersService.createIpRight(matterId, dto);
  }

  @Post(':matterId/ip-rights/:ipRightId/file')
  @RequirePermissions('matter:update')
  fileIpRight(
    @Param('matterId') matterId: string,
    @Param('ipRightId') ipRightId: string,
    @Body() dto: FileIpRightDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.mattersService.fileIpRight(
      matterId,
      ipRightId,
      dto,
      user.userId,
    );
  }
}
