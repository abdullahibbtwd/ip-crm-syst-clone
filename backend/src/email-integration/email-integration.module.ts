import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CorrespondenceModule } from '../correspondence/correspondence.module';
import { DocumentsModule } from '../documents/documents.module';
import {
  EMAIL_SYNC_BACKOFF_MS,
  EMAIL_SYNC_JOB_ATTEMPTS,
  EMAIL_SYNC_QUEUE,
  OUTBOUND_EMAIL_BACKOFF_MS,
  OUTBOUND_EMAIL_JOB_ATTEMPTS,
  OUTBOUND_EMAIL_QUEUE,
} from './email-integration.constants';
import { EmailIntegrationController } from './email-integration.controller';
import { EmailQueueController } from './email-queue.controller';
import { EmailSyncSchedulerService } from './email-sync-scheduler.service';
import { EmailSyncService } from './email-sync.service';
import { GoogleMailService } from './google-mail.service';
import { MailboxConnectionsService } from './mailbox-connections.service';
import { MailboxOAuthService } from './mailbox-oauth.service';
import { MailboxTokenService } from './mailbox-token.service';
import { MatterSuggestionService } from './matter-suggestion.service';
import { MicrosoftMailService } from './microsoft-mail.service';
import { OutboundEmailService } from './outbound-email.service';
import { UnlinkedEmailService } from './unlinked-email.service';
import { EmailSyncProcessor } from './processors/email-sync.processor';
import { OutboundEmailProcessor } from './processors/outbound-email.processor';

@Module({
  imports: [
    CorrespondenceModule,
    DocumentsModule,
    AiModule,
    BullModule.registerQueue(
      {
        name: EMAIL_SYNC_QUEUE,
        defaultJobOptions: {
          attempts: EMAIL_SYNC_JOB_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: EMAIL_SYNC_BACKOFF_MS,
          },
          removeOnComplete: 20,
          removeOnFail: 50,
        },
      },
      {
        name: OUTBOUND_EMAIL_QUEUE,
        defaultJobOptions: {
          attempts: OUTBOUND_EMAIL_JOB_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: OUTBOUND_EMAIL_BACKOFF_MS,
          },
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      },
    ),
  ],
  controllers: [EmailIntegrationController, EmailQueueController],
  providers: [
    MailboxTokenService,
    MailboxConnectionsService,
    MailboxOAuthService,
    MicrosoftMailService,
    GoogleMailService,
    MatterSuggestionService,
    EmailSyncService,
    UnlinkedEmailService,
    OutboundEmailService,
    EmailSyncSchedulerService,
    EmailSyncProcessor,
    OutboundEmailProcessor,
  ],
  exports: [
    EmailSyncService,
    UnlinkedEmailService,
    MailboxConnectionsService,
    OutboundEmailService,
  ],
})
export class EmailIntegrationModule {}
