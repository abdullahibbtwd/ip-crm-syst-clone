import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { DeadlineNotificationScanService } from './deadline-notification-scan.service';
import { ListNotificationsQueryDto } from './dto/notification.dto';
import { NOTIFICATIONS_MODULE } from './notifications.constants';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@Audit({ action: 'notification', resource: 'notification', module: NOTIFICATIONS_MODULE })
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly deadlineScan: DeadlineNotificationScanService,
  ) {}

  @Get()
  list(@Query() query: ListNotificationsQueryDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.notifications.listForUser(
      user.userId,
      query.limit,
      query.cursor,
    );
  }

  @Get('unread-count')
  async unreadCount(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const count = await this.notifications.getUnreadCount(user.userId);
    return { count };
  }

  @Post('deadline-scan')
  @Roles(
    SYSTEM_ROLES.MANAGING_PARTNER,
    SYSTEM_ROLES.IT_ADMIN,
    SYSTEM_ROLES.DOCKETING_ADMIN,
  )
  runDeadlineScan() {
    return this.deadlineScan.run();
  }

  @Patch('read-all')
  markAllRead(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.notifications.markAllRead(user.userId);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.notifications.markRead(user.userId, id);
  }
}
