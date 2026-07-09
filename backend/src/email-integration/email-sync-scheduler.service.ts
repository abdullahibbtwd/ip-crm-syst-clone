import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  EMAIL_SYNC_JOB,
  EMAIL_SYNC_QUEUE,
} from './email-integration.constants';

@Injectable()
export class EmailSyncSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(EmailSyncSchedulerService.name);

  constructor(
    @InjectQueue(EMAIL_SYNC_QUEUE) private readonly syncQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    if (this.config.get('EMAIL_SYNC_ENABLED', 'false') !== 'true') {
      this.logger.log('Email sync scheduler disabled');
      return;
    }

    const pattern = this.config.get('EMAIL_SYNC_CRON') ?? '*/15 * * * *';

    await this.syncQueue.add(
      EMAIL_SYNC_JOB,
      {},
      {
        repeat: { pattern },
        jobId: 'mailbox-sync-cron',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Scheduled mailbox sync (${pattern})`);
  }
}
