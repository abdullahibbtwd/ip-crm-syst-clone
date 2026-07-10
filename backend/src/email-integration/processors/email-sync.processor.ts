import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import {
  EMAIL_SYNC_CONNECTION_JOB,
  EMAIL_SYNC_JOB,
  EMAIL_SYNC_QUEUE,
  MAILBOX_TOKEN_REFRESH_JOB,
} from '../email-integration.constants';
import { EmailSyncSchedulerService } from '../email-sync-scheduler.service';
import { EmailSyncService } from '../email-sync.service';
import {
  MailboxAuthError,
  MailboxRateLimitError,
} from '../mailbox-http.errors';
import { MailboxConnectionsService } from '../mailbox-connections.service';

@Processor(EMAIL_SYNC_QUEUE)
export class EmailSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailSyncProcessor.name);

  constructor(
    private readonly sync: EmailSyncService,
    private readonly connections: MailboxConnectionsService,
    private readonly scheduler: EmailSyncSchedulerService,
  ) {
    super();
  }

  async process(job: Job) {
    if (job.name === MAILBOX_TOKEN_REFRESH_JOB) {
      const result = await this.connections.refreshExpiringTokens();
      this.logger.log(
        `Mailbox token refresh: checked=${result.checked} refreshed=${result.refreshed} failed=${result.failed}`,
      );
      return result;
    }

    if (job.name === EMAIL_SYNC_JOB) {
      if (!this.sync.isEnabled()) {
        this.logger.debug('Email sync disabled — skipping fan-out');
        return { enqueued: 0 };
      }
      const connections = await this.connections.listActiveConnections();
      for (const connection of connections) {
        await this.scheduler.enqueueConnectionSync(connection.id);
      }
      this.logger.log(
        `Enqueued ${connections.length} mailbox sync-connection job(s)`,
      );
      return { enqueued: connections.length };
    }

    if (job.name === EMAIL_SYNC_CONNECTION_JOB) {
      const connectionId = job.data?.connectionId as string | undefined;
      if (!connectionId) return;

      try {
        const ingested = await this.sync.syncConnection(connectionId);
        this.logger.log(
          `Synced connection ${connectionId}: ${ingested} new emails`,
        );
        return { connectionId, ingested };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.connections.markSyncError(connectionId, message);

        if (err instanceof MailboxAuthError) {
          throw new UnrecoverableError(message);
        }

        if (err instanceof MailboxRateLimitError) {
          this.logger.warn(
            `Rate limited syncing ${connectionId} (attempt ${job.attemptsMade + 1}): ${message}`,
          );
          throw err;
        }

        throw err;
      }
    }
  }
}
