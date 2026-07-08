import { Module } from '@nestjs/common';
import { MattersModule } from '../matters/matters.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  WatchAlertsController,
} from './watch-alerts.controller';
import {
  WatchProfileActionsController,
  WatchProfilesController,
} from './watch-profiles.controller';
import { WatchService } from './watch.service';

@Module({
  imports: [PrismaModule, MattersModule, NotificationsModule],
  controllers: [
    WatchProfilesController,
    WatchProfileActionsController,
    WatchAlertsController,
  ],
  providers: [WatchService],
  exports: [WatchService],
})
export class WatchModule {}
