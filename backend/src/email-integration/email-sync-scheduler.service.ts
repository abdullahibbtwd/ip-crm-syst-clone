import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  EMAIL_SYNC_BACKOFF_MS,
  EMAIL_SYNC_CONNECTION_JOB,
  EMAIL_SYNC_JOB,
  EMAIL_SYNC_JOB_ATTEMPTS,
  EMAIL_SYNC_QUEUE,
  MAILBOX_TOKEN_REFRESH_JOB,
} from './email-integration.constants';

const connectionJobOpts = {
  attempts: EMAIL_SYNC_JOB_ATTEMPTS,
  backoff: {
    type: 'exponential' as const,
    delay: EMAIL_SYNC_BACKOFF_MS,
  },
  removeOnComplete: 20,
  removeOnFail: 50,
};

@Injectable()
export class EmailSyncSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(EmailSyncSchedulerService.name);

  constructor(
    @InjectQueue(EMAIL_SYNC_QUEUE) private readonly syncQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.scheduleTokenRefresh();
    await this.scheduleMailboxSync();
  }

  private async scheduleTokenRefresh() {
    if (this.config.get('MAILBOX_TOKEN_REFRESH_ENABLED', 'true') === 'false') {
      this.logger.log('Mailbox token refresh scheduler disabled');
      return;
    }

    const pattern =
      this.config.get('MAILBOX_TOKEN_REFRESH_CRON') ?? '0 * * * *';

    await this.syncQueue.add(
      MAILBOX_TOKEN_REFRESH_JOB,
      {},
      {
        repeat: { pattern },
        jobId: 'mailbox-token-refresh-cron',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Scheduled mailbox token refresh (${pattern})`);
  }

  private async scheduleMailboxSync() {
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

  /** Fan-out helper used by the sync-mailbox processor. */
  async enqueueConnectionSync(connectionId: string) {
    await this.syncQueue.add(
      EMAIL_SYNC_CONNECTION_JOB,
      { connectionId },
      {
        ...connectionJobOpts,
        jobId: `sync-connection-${connectionId}-${Date.now()}`,
      },
    );
  }
}
