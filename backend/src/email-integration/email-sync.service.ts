import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnlinkedEmailStatus } from '../../generated/prisma/client';
import { EmlParserService } from '../correspondence/eml-parser.service';
import { MinioStorageService } from '../storage/minio-storage.service';
import { MailboxConnectionsService } from './mailbox-connections.service';
import { GoogleMailService } from './google-mail.service';
import { MicrosoftMailService } from './microsoft-mail.service';
import { classifyIncomingEmail } from './email-classification';
import { MatterSuggestionService } from './matter-suggestion.service';
import {
  MANUAL_MAILBOX_FETCH_LIMIT,
  SCHEDULED_MAILBOX_FETCH_LIMIT,
} from './email-integration.constants';
import { PrismaService } from '../prisma/prisma.service';

export type SyncConnectionOptions = {
  limit?: number;
  /** Manual inbox pull; does not advance lastSyncAt. */
  manual?: boolean;
};

@Injectable()
export class EmailSyncService {
  private readonly logger = new Logger(EmailSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly connections: MailboxConnectionsService,
    private readonly microsoftMail: MicrosoftMailService,
    private readonly googleMail: GoogleMailService,
    private readonly emlParser: EmlParserService,
    private readonly suggestions: MatterSuggestionService,
    private readonly storage: MinioStorageService,
  ) {}

  isEnabled(): boolean {
    return this.config.get('EMAIL_SYNC_ENABLED', 'false') === 'true';
  }

  async syncAllConnections() {
    if (!this.isEnabled()) {
      this.logger.debug('Email sync disabled (EMAIL_SYNC_ENABLED != true)');
      return { synced: 0, ingested: 0 };
    }

    const connections = await this.connections.listActiveConnections();
    let ingested = 0;
    for (const connection of connections) {
      try {
        ingested += await this.syncConnection(connection.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.connections.markSyncError(connection.id, message);
        this.logger.error(`Sync failed for connection ${connection.id}: ${message}`);
      }
    }
    return { synced: connections.length, ingested };
  }

  async syncConnection(
    connectionId: string,
    options: SyncConnectionOptions = {},
  ): Promise<number> {
    const connection = await this.prisma.mailboxConnection.findUnique({
      where: { id: connectionId },
      select: {
        id: true,
        provider: true,
        lastSyncAt: true,
        status: true,
      },
    });
    if (!connection || connection.status !== 'active') return 0;

    const manual = options.manual === true;
    const limit =
      options.limit ??
      (manual ? MANUAL_MAILBOX_FETCH_LIMIT : SCHEDULED_MAILBOX_FETCH_LIMIT);

    const accessToken = await this.connections.getAccessToken(connectionId);
    const fetchOptions = manual
      ? { limit, latestOnly: true as const }
      : {
          since: connection.lastSyncAt ?? undefined,
          limit,
        };

    const fetched =
      connection.provider === 'microsoft'
        ? await this.microsoftMail.fetchNewMessages(accessToken, fetchOptions)
        : await this.googleMail.fetchNewMessages(accessToken, fetchOptions);

    let ingested = 0;
    for (const message of fetched) {
      const created = await this.ingestMessage(connectionId, message);
      if (created) ingested += 1;
    }

    if (!manual) {
      await this.connections.markSyncSuccess(
        connectionId,
        new Date().toISOString(),
      );
    }

    return ingested;
  }

  async fetchForUser(userId: string): Promise<{ ingested: number; limit: number }> {
    const connections = await this.prisma.mailboxConnection.findMany({
      where: { userId, status: 'active' },
      select: { id: true },
    });

    let ingested = 0;
    for (const connection of connections) {
      try {
        ingested += await this.syncConnection(connection.id, { manual: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.connections.markSyncError(connection.id, message);
        this.logger.error(
          `Manual fetch failed for connection ${connection.id}: ${message}`,
        );
        throw err;
      }
    }

    return { ingested, limit: MANUAL_MAILBOX_FETCH_LIMIT };
  }

  private async ingestMessage(
    connectionId: string,
    message: {
      externalMessageId: string;
      internetMessageId: string | null;
      rawMime: Buffer;
      sender: string;
      recipient: string;
      subject: string;
      receivedAt: Date;
      hasAttachments: boolean;
    },
  ): Promise<boolean> {
    const existing = await this.prisma.unlinkedEmail.findFirst({
      where: {
        OR: [
          {
            mailboxConnectionId: connectionId,
            externalMessageId: message.externalMessageId,
          },
          ...(message.internetMessageId
            ? [{ internetMessageId: message.internetMessageId }]
            : []),
        ],
      },
      select: { id: true },
    });
    if (existing) return false;

    let parsedBody: string | null = null;
    try {
      const parsed = await this.emlParser.parseBuffer(message.rawMime);
      parsedBody = parsed.bodyText;
      if (!message.internetMessageId && parsed.messageId) {
        message.internetMessageId = parsed.messageId;
      }
      if (parsed.sender) message.sender = parsed.sender;
      if (parsed.recipient) message.recipient = parsed.recipient;
      if (parsed.subject) message.subject = parsed.subject;
    } catch {
      // keep header fields from provider
    }

    const suggestion = await this.suggestions.suggest(
      message.sender,
      message.subject,
      parsedBody,
    );
    const classification = classifyIncomingEmail(message.subject, parsedBody);

    const storageKey = `mailbox/${connectionId}/${message.externalMessageId}.eml`;
    await this.storage.putObject(storageKey, message.rawMime, 'message/rfc822');

    await this.prisma.unlinkedEmail.create({
      data: {
        mailboxConnectionId: connectionId,
        externalMessageId: message.externalMessageId,
        internetMessageId: message.internetMessageId,
        sender: message.sender,
        recipient: message.recipient,
        subject: message.subject,
        receivedAt: message.receivedAt,
        hasAttachments: message.hasAttachments,
        status: UnlinkedEmailStatus.pending,
        suggestedMatterId: suggestion.suggestedMatterId,
        suggestedClientId: suggestion.suggestedClientId,
        suggestionReason: suggestion.suggestionReason,
        suggestedCategory: classification.suggestedCategory,
        emlStorageKey: storageKey,
        bodyText: parsedBody?.trim() || null,
        metadata: {
          bodyPreview: parsedBody?.slice(0, 280) ?? null,
          sender: message.sender,
          subject: message.subject,
          classificationReason: classification.classificationReason,
        },
      },
    });

    return true;
  }
}
