import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  EMAIL_SYNC_CONNECTION_JOB,
  EMAIL_SYNC_JOB,
  EMAIL_SYNC_QUEUE,
} from '../email-integration.constants';
import { EmailSyncService } from '../email-sync.service';

@Processor(EMAIL_SYNC_QUEUE)
export class EmailSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailSyncProcessor.name);

  constructor(private readonly sync: EmailSyncService) {
    super();
  }

  async process(job: Job) {
    if (job.name === EMAIL_SYNC_JOB) {
      const result = await this.sync.syncAllConnections();
      this.logger.log(
        `Mailbox sync complete: ${result.ingested} new emails from ${result.synced} connections`,
      );
      return result;
    }

    if (job.name === EMAIL_SYNC_CONNECTION_JOB) {
      const connectionId = job.data?.connectionId as string | undefined;
      if (!connectionId) return;
      const ingested = await this.sync.syncConnection(connectionId);
      this.logger.log(
        `Synced connection ${connectionId}: ${ingested} new emails`,
      );
      return { connectionId, ingested };
    }
  }
}
