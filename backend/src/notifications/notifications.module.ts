import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DeadlineNotificationScanService } from './deadline-notification-scan.service';
import { DeadlineSchedulerService } from './deadline-scheduler.service';
import { EmailService } from './email.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import {
  DEADLINE_SCAN_QUEUE,
  NOTIFICATION_EMAIL_QUEUE,
} from './notifications.constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { DeadlineScanProcessor } from './processors/deadline-scan.processor';
import { NotificationEmailProcessor } from './processors/notification-email.processor';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: Number(config.get('REDIS_PORT', 6379)),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: NOTIFICATION_EMAIL_QUEUE },
      { name: DEADLINE_SCAN_QUEUE },
    ),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDispatchService,
    EmailService,
    NotificationsGateway,
    DeadlineNotificationScanService,
    DeadlineSchedulerService,
    NotificationEmailProcessor,
    DeadlineScanProcessor,
  ],
  exports: [NotificationDispatchService, NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
