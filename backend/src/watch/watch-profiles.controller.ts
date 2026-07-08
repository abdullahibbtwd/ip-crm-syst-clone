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
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CreateWatchProfileDto,
  UpdateWatchProfileDto,
} from './dto/watch-profile.dto';
import { WATCH_MODULE } from './watch.constants';
import { WatchService } from './watch.service';

@Controller('clients/:clientId/watch-profiles')
@RequirePermissions('matter:read')
@Audit({ action: 'watch_profile', resource: 'watch_profile', module: WATCH_MODULE })
export class WatchProfilesController {
  constructor(private readonly watch: WatchService) {}

  @Get()
  list(@Param('clientId') clientId: string) {
    return this.watch.listProfilesForClient(clientId);
  }

  @Post()
  @RequirePermissions('matter:create')
  create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateWatchProfileDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.watch.createProfile(clientId, dto, user.userId);
  }
}

@Controller('watch-profiles')
@RequirePermissions('matter:read')
@Audit({ action: 'watch_profile', resource: 'watch_profile', module: WATCH_MODULE })
export class WatchProfileActionsController {
  constructor(private readonly watch: WatchService) {}

  @Patch(':id')
  @RequirePermissions('matter:update')
  update(@Param('id') id: string, @Body() dto: UpdateWatchProfileDto) {
    return this.watch.updateProfile(id, dto);
  }
}
