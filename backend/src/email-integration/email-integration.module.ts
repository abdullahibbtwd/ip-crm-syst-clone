import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CorrespondenceModule } from '../correspondence/correspondence.module';
import { EMAIL_SYNC_QUEUE } from './email-integration.constants';
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
import { UnlinkedEmailService } from './unlinked-email.service';
import { EmailSyncProcessor } from './processors/email-sync.processor';

@Module({
  imports: [
    CorrespondenceModule,
    BullModule.registerQueue({ name: EMAIL_SYNC_QUEUE }),
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
    EmailSyncSchedulerService,
    EmailSyncProcessor,
  ],
  exports: [EmailSyncService, UnlinkedEmailService, MailboxConnectionsService],
})
export class EmailIntegrationModule {}
