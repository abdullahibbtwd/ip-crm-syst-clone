import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ListNotificationsQueryDto } from './dto/notification.dto';
import { NOTIFICATIONS_MODULE } from './notifications.constants';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@Audit({ action: 'notification', resource: 'notification', module: NOTIFICATIONS_MODULE })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

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
