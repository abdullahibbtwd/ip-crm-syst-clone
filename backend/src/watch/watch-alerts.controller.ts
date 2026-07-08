import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CreateMockWatchAlertDto,
  ListWatchAlertsQueryDto,
} from './dto/watch-alert.dto';
import { WATCH_MODULE } from './watch.constants';
import { WatchService } from './watch.service';

@Controller('watch-alerts')
@RequirePermissions('matter:read')
@Audit({ action: 'watch_alert', resource: 'watch_alert', module: WATCH_MODULE })
export class WatchAlertsController {
  constructor(private readonly watch: WatchService) {}

  @Get()
  list(@Query() query: ListWatchAlertsQueryDto) {
    return this.watch.listAlerts(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.watch.findAlert(id);
  }

  @Post('mock')
  @RequirePermissions('matter:create')
  createMock(@Body() dto: CreateMockWatchAlertDto) {
    return this.watch.createMockAlert(dto);
  }

  @Post(':id/reject')
  @RequirePermissions('matter:update')
  reject(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.watch.rejectAlert(id, user.userId);
  }

  @Post(':id/accept')
  @RequirePermissions('matter:create')
  accept(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.watch.acceptAlert(id, user.userId);
  }
}
