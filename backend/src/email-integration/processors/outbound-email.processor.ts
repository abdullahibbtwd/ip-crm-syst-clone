import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import {
  OUTBOUND_EMAIL_JOB,
  OUTBOUND_EMAIL_QUEUE,
} from '../email-integration.constants';
import {
  MailboxAuthError,
  MailboxRateLimitError,
} from '../mailbox-http.errors';
import {
  OutboundEmailService,
  type OutboundEmailJobData,
} from '../outbound-email.service';

@Processor(OUTBOUND_EMAIL_QUEUE)
export class OutboundEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(OutboundEmailProcessor.name);

  constructor(private readonly outbound: OutboundEmailService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== OUTBOUND_EMAIL_JOB) return;

    const data = job.data as OutboundEmailJobData;
    try {
      const result = await this.outbound.processSend(data);
      this.logger.log(
        `Outbound email sent for matter ${result.matterId} → correspondence ${result.correspondenceId}`,
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof MailboxAuthError) {
        throw new UnrecoverableError(message);
      }
      if (err instanceof MailboxRateLimitError) {
        this.logger.warn(
          `Outbound rate limited (attempt ${job.attemptsMade + 1}): ${message}`,
        );
        throw err;
      }
      throw err;
    }
  }
}
