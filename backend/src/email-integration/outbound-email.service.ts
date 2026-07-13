import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  CorrespondenceDirection,
  CorrespondenceSource,
  CorrespondenceStatus,
  DocumentCategory,
  UnlinkedEmailStatus,
} from '../../generated/prisma/client';
import { CorrespondenceService } from '../correspondence/correspondence.service';
import {
  applyMergeFields,
  buildDocumentMergeContext,
} from '../documents/document-merge.util';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioStorageService } from '../storage/minio-storage.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import {
  OFFICE_ACTION_REPLY_TEMPLATE_SLUG,
  OUTBOUND_EMAIL_BACKOFF_MS,
  OUTBOUND_EMAIL_JOB,
  OUTBOUND_EMAIL_JOB_ATTEMPTS,
  OUTBOUND_EMAIL_QUEUE,
} from './email-integration.constants';
import type { SendOutboundEmailDto } from './dto/outbound-email.dto';
import { GoogleMailService } from './google-mail.service';
import { MailboxConnectionsService } from './mailbox-connections.service';
import {
  extractEmailAddress,
  htmlToPlainText,
  plainTextToHtml,
  replySubject,
} from './mailbox-mail.util';
import { MicrosoftMailService } from './microsoft-mail.service';
import { UnlinkedEmailService } from './unlinked-email.service';

export type OutboundEmailJobData = SendOutboundEmailDto & {
  userId: string;
  roles: string[];
};

export type OutboundSendResult = {
  correspondenceId: string;
  matterId: string;
  providerMessageId: string | null;
  linkedIncoming: boolean;
};

@Injectable()
export class OutboundEmailService {
  private readonly logger = new Logger(OutboundEmailService.name);
  private queueEvents: QueueEvents | null = null;

  constructor(
    @InjectQueue(OUTBOUND_EMAIL_QUEUE) private readonly outboundQueue: Queue,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly connections: MailboxConnectionsService,
    private readonly microsoftMail: MicrosoftMailService,
    private readonly googleMail: GoogleMailService,
    private readonly correspondence: CorrespondenceService,
    private readonly unlinkedEmails: UnlinkedEmailService,
    private readonly storage: MinioStorageService,
    private readonly ai: AiService,
  ) {}

  async enqueueAndWait(
    dto: SendOutboundEmailDto,
    userId: string,
    roles: string[],
  ): Promise<OutboundSendResult> {
    await this.assertCanSend(userId, roles, dto);

    const job = await this.outboundQueue.add(
      OUTBOUND_EMAIL_JOB,
      { ...dto, userId, roles } satisfies OutboundEmailJobData,
      {
        attempts: OUTBOUND_EMAIL_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: OUTBOUND_EMAIL_BACKOFF_MS,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );

    const events = this.getQueueEvents();
    const result = (await job.waitUntilFinished(
      events,
      90_000,
    )) as OutboundSendResult;
    return result;
  }

  async processSend(data: OutboundEmailJobData): Promise<OutboundSendResult> {
    const connection = await this.prisma.mailboxConnection.findFirst({
      where: {
        id: data.connectionId,
        userId: data.userId,
        status: 'active',
      },
      select: {
        id: true,
        provider: true,
        emailAddress: true,
      },
    });
    if (!connection) {
      throw new NotFoundException('Active mailbox connection not found');
    }

    let linkedIncoming = false;
    if (data.replyToUnlinkedEmailId) {
      const queued = await this.prisma.unlinkedEmail.findUnique({
        where: { id: data.replyToUnlinkedEmailId },
        select: { status: true },
      });
      if (queued?.status === UnlinkedEmailStatus.pending) {
        await this.unlinkedEmails.linkToMatter(
          data.replyToUnlinkedEmailId,
          data.matterId,
          data.userId,
          data.roles,
          data.category ?? DocumentCategory.correspondence,
        );
        linkedIncoming = true;
      }
    }

    const bodyHtml = data.bodyHtml?.trim() || plainTextToHtml(data.bodyText);
    const bodyText = data.bodyText.trim() || htmlToPlainText(bodyHtml);
    const accessToken = await this.connections.getAccessToken(connection.id);

    const sendInput = {
      fromAddress: connection.emailAddress,
      to: data.to.map(extractEmailAddress),
      cc: data.cc?.map(extractEmailAddress),
      subject: data.subject.trim(),
      bodyHtml,
      bodyText,
      inReplyToMessageId: data.inReplyToMessageId,
      attachments: data.attachments,
    };

    const sent =
      connection.provider === 'microsoft'
        ? await this.microsoftMail.sendMail(accessToken, sendInput)
        : await this.googleMail.sendMail(accessToken, sendInput);

    const emlBuffer = this.buildSentEmlCopy(sendInput);
    const documentVersionId = await this.storeSentCopyOnMatter(
      data.matterId,
      emlBuffer,
      data.subject,
      data.userId,
    );

    const correspondence = await this.correspondence.create(
      data.matterId,
      {
        direction: CorrespondenceDirection.outgoing,
        category: data.category ?? DocumentCategory.correspondence,
        correspondenceDate: new Date().toISOString().slice(0, 10),
        sender: connection.emailAddress,
        recipient: sendInput.to.join(', '),
        subject: data.subject.trim(),
        status: CorrespondenceStatus.sent,
        source: CorrespondenceSource.synced,
        messageId: sent.providerMessageId ?? undefined,
        bodyText,
        documentVersionId,
        mailboxConnectionId: connection.id,
        isClientVisible: data.isClientVisible ?? false,
        metadata: {
          logMethod: 'outbound_reply',
          provider: connection.provider,
          providerMessageId: sent.providerMessageId,
          inReplyToMessageId: data.inReplyToMessageId ?? null,
          replyToUnlinkedEmailId: data.replyToUnlinkedEmailId ?? null,
          replyToCorrespondenceId: data.replyToCorrespondenceId ?? null,
          cc: sendInput.cc ?? [],
        },
      },
      data.userId,
    );

    if (data.replyToCorrespondenceId) {
      try {
        await this.correspondence.update(data.replyToCorrespondenceId, {
          status: CorrespondenceStatus.replied,
        });
      } catch (err) {
        this.logger.warn(
          `Could not mark correspondence ${data.replyToCorrespondenceId} as replied: ${err}`,
        );
      }
    }

    return {
      correspondenceId: correspondence.id,
      matterId: data.matterId,
      providerMessageId: sent.providerMessageId,
      linkedIncoming,
    };
  }

  async buildDraftReply(input: {
    matterId: string;
    unlinkedEmailId?: string;
    correspondenceId?: string;
    /** When true, replace the template/stub body with an AI-generated draft. */
    useAi?: boolean;
  }) {
    await this.assertMatterExists(input.matterId);

    let originalSubject = '';
    let originalSender = '';
    let originalBody = '';
    let inReplyToMessageId: string | undefined;
    let categoryHint: DocumentCategory = DocumentCategory.correspondence;

    if (input.unlinkedEmailId) {
      const row = await this.prisma.unlinkedEmail.findUnique({
        where: { id: input.unlinkedEmailId },
      });
      if (!row) throw new NotFoundException('Queued email not found');
      originalSubject = row.subject;
      originalSender = row.sender;
      inReplyToMessageId = row.internetMessageId ?? undefined;
      originalBody =
        row.bodyText?.trim() ||
        (typeof (row.metadata as { bodyPreview?: string } | null)?.bodyPreview ===
        'string'
          ? (row.metadata as { bodyPreview: string }).bodyPreview
          : '');
      if (row.suggestedCategory) categoryHint = row.suggestedCategory;
    } else if (input.correspondenceId) {
      const row = await this.prisma.correspondence.findFirst({
        where: { id: input.correspondenceId, matterId: input.matterId },
      });
      if (!row) throw new NotFoundException('Correspondence not found');
      originalSubject = row.subject;
      originalSender = row.sender;
      originalBody = row.bodyText ?? '';
      inReplyToMessageId = row.messageId ?? undefined;
      categoryHint = row.category;
    }

    const matter = await this.prisma.matter.findUnique({
      where: { id: input.matterId },
      include: {
        client: { include: { offices: true } },
        assignedTo: { select: { fullName: true } },
        jurisdictions: true,
        ipRights: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    const useOfficeActionDraft =
      categoryHint === DocumentCategory.office_action ||
      /office\s*action/i.test(originalSubject);

    let bodyHtml = '';
    let bodyText = '';
    let templateSlug: string | null = null;
    let usedAi = false;

    if (input.useAi) {
      const clientName =
        matter.client.companyName ||
        [matter.client.firstName, matter.client.lastName]
          .filter(Boolean)
          .join(' ') ||
        'Client';
      const jurisdictions = matter.jurisdictions
        .map((j) => j.countryCode)
        .join(', ');
      const matterContext = [
        `matter type ${matter.matterType}`,
        jurisdictions ? `jurisdiction ${jurisdictions}` : null,
        `attorney ${matter.assignedTo?.fullName ?? 'unassigned'}`,
        `client ${clientName}`,
        `matter title ${matter.title}`,
      ]
        .filter(Boolean)
        .join(', ');

      const incoming =
        originalBody.trim() ||
        `Subject: ${originalSubject}\nFrom: ${originalSender}`;
      bodyText = await this.ai.generateDraft(incoming, matterContext);
      bodyHtml = plainTextToHtml(bodyText);
      usedAi = true;
    } else if (useOfficeActionDraft) {
      const template = await this.prisma.documentTemplate.findUnique({
        where: { slug: OFFICE_ACTION_REPLY_TEMPLATE_SLUG },
      });
      if (template?.isActive) {
        const fields = buildDocumentMergeContext(matter);
        fields.referenceLine = template.referenceLine
          ? applyMergeFields(template.referenceLine, fields)
          : '';
        bodyHtml = applyMergeFields(template.htmlBody, fields);
        bodyText = htmlToPlainText(bodyHtml);
        templateSlug = template.slug;
      }
    }

    if (!bodyText) {
      bodyText = [
        `Dear ${extractEmailAddress(originalSender) || 'Sir/Madam'},`,
        '',
        'Thank you for your email. Please find our response below.',
        '',
        'Kind regards,',
        matter.assignedTo?.fullName ?? '',
      ]
        .filter((line, idx, arr) => line !== '' || arr[idx - 1] !== '')
        .join('\n');
      bodyHtml = plainTextToHtml(bodyText);
    }

    return {
      to: originalSender ? [extractEmailAddress(originalSender)] : [],
      subject: replySubject(originalSubject || 'Correspondence'),
      bodyText,
      bodyHtml,
      inReplyToMessageId: inReplyToMessageId ?? null,
      templateSlug,
      usedAi,
      quotedOriginal: originalBody
        ? originalBody.replace(/\s+/g, ' ').trim().slice(0, 500)
        : null,
    };
  }

  private async assertCanSend(
    userId: string,
    roles: string[],
    dto: SendOutboundEmailDto,
  ) {
    const connection = await this.prisma.mailboxConnection.findFirst({
      where: { id: dto.connectionId, userId, status: 'active' },
      select: { id: true },
    });
    if (!connection) {
      throw new BadRequestException(
        'Connect an active mailbox under Settings → Email integration before sending',
      );
    }

    await this.assertMatterExists(dto.matterId);

    const isGatekeeper =
      roles.includes(SYSTEM_ROLES.MANAGING_PARTNER) ||
      roles.includes(SYSTEM_ROLES.COORDINATOR) ||
      roles.includes(SYSTEM_ROLES.DOCKETING_ADMIN) ||
      roles.includes(SYSTEM_ROLES.PARALEGAL);
    if (isGatekeeper) return;

    const isAttorney =
      roles.includes(SYSTEM_ROLES.IP_ATTORNEY) ||
      roles.includes(SYSTEM_ROLES.TRADEMARK_ATTORNEY);
    if (!isAttorney) {
      throw new ForbiddenException('Not allowed to send mailbox replies');
    }

    const matter = await this.prisma.matter.findUnique({
      where: { id: dto.matterId },
      select: { assignedToId: true },
    });
    if (matter?.assignedToId !== userId) {
      throw new ForbiddenException(
        'Attorneys can only send replies on their assigned matters',
      );
    }
  }

  private async assertMatterExists(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }

  private buildSentEmlCopy(input: {
    fromAddress: string;
    to: string[];
    cc?: string[];
    subject: string;
    bodyHtml: string;
    inReplyToMessageId?: string;
  }): Buffer {
    const lines = [
      `From: ${input.fromAddress}`,
      `To: ${input.to.join(', ')}`,
      input.cc?.length ? `Cc: ${input.cc.join(', ')}` : null,
      `Subject: ${input.subject}`,
      `Date: ${new Date().toUTCString()}`,
      input.inReplyToMessageId
        ? `In-Reply-To: ${input.inReplyToMessageId}`
        : null,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      input.bodyHtml,
    ].filter((line) => line != null);
    return Buffer.from(lines.join('\r\n'), 'utf8');
  }

  private async storeSentCopyOnMatter(
    matterId: string,
    buffer: Buffer,
    subject: string,
    userId: string,
  ) {
    const displayName = subject.trim() || 'Sent email';
    const fileName = `${displayName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80)}.eml`;
    const storageKey = `matters/${matterId}/sent-emails/${Date.now()}-${fileName}`;

    const document = await this.prisma.matterDocument.create({
      data: {
        matterId,
        displayName,
        category: DocumentCategory.correspondence,
        tags: ['email', 'outbound', 'sent', 'eml'],
        createdById: userId,
      },
    });

    await this.storage.putObject(storageKey, buffer, 'message/rfc822');

    const version = await this.prisma.matterDocumentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        fileName,
        mimeType: 'message/rfc822',
        sizeBytes: buffer.length,
        storageKey,
        uploadedById: userId,
      },
    });

    return version.id;
  }

  private getQueueEvents() {
    if (!this.queueEvents) {
      this.queueEvents = new QueueEvents(OUTBOUND_EMAIL_QUEUE, {
        connection: {
          host: this.config.get('REDIS_HOST', 'localhost'),
          port: Number(this.config.get('REDIS_PORT', '6379')),
        },
      });
    }
    return this.queueEvents;
  }
}
