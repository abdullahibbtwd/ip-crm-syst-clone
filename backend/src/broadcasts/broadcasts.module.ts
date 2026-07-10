import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  BROADCAST_BACKOFF_MS,
  BROADCAST_EMAIL_QUEUE,
  BROADCAST_JOB_ATTEMPTS,
} from './broadcasts.constants';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastEmailProcessor } from './processors/broadcast-email.processor';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({
      name: BROADCAST_EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: BROADCAST_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: BROADCAST_BACKOFF_MS,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    }),
  ],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastEmailProcessor],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}
