import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CorrespondenceDirection,
  CorrespondenceSource,
  CorrespondenceStatus,
  DocumentCategory,
  Prisma,
  UnlinkedEmailStatus,
} from '../../generated/prisma/client';
import { CorrespondenceService } from '../correspondence/correspondence.service';
import { EmlParserService } from '../correspondence/eml-parser.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioStorageService } from '../storage/minio-storage.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';

const queueInclude = {
  mailboxConnection: {
    select: {
      id: true,
      provider: true,
      emailAddress: true,
      userId: true,
    },
  },
  suggestedMatter: {
    select: {
      id: true,
      title: true,
      assignedToId: true,
      client: {
        select: {
          id: true,
          internalCode: true,
          companyName: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} satisfies Prisma.UnlinkedEmailInclude;

@Injectable()
export class UnlinkedEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioStorageService,
    private readonly correspondence: CorrespondenceService,
    private readonly emlParser: EmlParserService,
  ) {}

  async listQueue(status: UnlinkedEmailStatus = UnlinkedEmailStatus.pending) {
    return this.prisma.unlinkedEmail.findMany({
      where: { status },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      include: queueInclude,
    });
  }

  async getStats() {
    const pending = await this.prisma.unlinkedEmail.count({
      where: { status: UnlinkedEmailStatus.pending },
    });
    return { pending };
  }

  async getById(id: string) {
    const row = await this.prisma.unlinkedEmail.findUnique({
      where: { id },
      include: queueInclude,
    });
    if (!row) throw new NotFoundException('Queued email not found');
    return row;
  }

  async getDownloadUrl(id: string) {
    const row = await this.getById(id);
    const url = await this.storage.getPresignedDownloadUrl(row.emlStorageKey);
    return {
      url,
      fileName: `${row.subject.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'email'}.eml`,
      mimeType: 'message/rfc822',
    };
  }

  async getPreview(id: string) {
    const row = await this.getById(id);
    const emlBuffer = await this.storage.getObjectBuffer(row.emlStorageKey);
    const parsed = await this.emlParser.parseBuffer(emlBuffer);

    return {
      id: row.id,
      sender: parsed.sender || row.sender || 'Unknown sender',
      recipient: parsed.recipient || row.recipient || '',
      subject: parsed.subject || row.subject || '(No subject)',
      receivedAt: row.receivedAt,
      hasAttachments: row.hasAttachments || parsed.attachments.length > 0,
      bodyText: parsed.bodyText ?? row.bodyText,
      bodyHtml: parsed.bodyHtml,
      attachments: parsed.attachments,
      internetMessageId: row.internetMessageId,
      externalMessageId: row.externalMessageId,
      mailboxConnectionId: row.mailboxConnectionId,
      mailboxConnection: row.mailboxConnection,
      suggestedMatter: row.suggestedMatter,
      suggestedCategory: row.suggestedCategory,
      metadata: row.metadata,
    };
  }

  async dismiss(id: string, userId: string, roles: string[]) {
    const row = await this.getById(id);
    if (!this.canLink(roles)) {
      throw new ForbiddenException('Not allowed to dismiss queued emails');
    }
    const updated = await this.prisma.unlinkedEmail.update({
      where: { id },
      data: {
        status: UnlinkedEmailStatus.dismissed,
        linkedById: userId,
        linkedAt: new Date(),
      },
      include: queueInclude,
    });

    try {
      await this.storage.deleteObject(row.emlStorageKey);
    } catch {
      // Lifecycle rule will eventually clean up if delete fails
    }

    return updated;
  }

  async linkToMatter(
    id: string,
    matterId: string,
    userId: string,
    roles: string[],
    category: DocumentCategory = DocumentCategory.correspondence,
  ) {
    if (!this.canLink(roles)) {
      throw new ForbiddenException('Not allowed to link queued emails');
    }

    await this.assertCanLinkToMatter(userId, roles, matterId);

    const row = await this.prisma.unlinkedEmail.findUnique({
      where: { id },
      include: { mailboxConnection: true },
    });
    if (!row || row.status !== UnlinkedEmailStatus.pending) {
      throw new NotFoundException('Queued email not found or already processed');
    }

    const emlBuffer = await this.storage.getObjectBuffer(row.emlStorageKey);
    const parsed = await this.emlParser.parseBuffer(emlBuffer);
    const metadata = row.metadata as Record<string, unknown> | null;

    const sender = parsed.sender || row.sender || 'Unknown sender';
    const recipient = parsed.recipient || row.recipient || '';
    const subject = parsed.subject || row.subject || '(No subject)';
    const bodyText =
      parsed.bodyText ??
      (typeof metadata?.bodyPreview === 'string' ? metadata.bodyPreview : undefined);

    const documentVersionId = await this.storeEmlOnMatter(
      matterId,
      emlBuffer,
      subject,
      userId,
    );

    const correspondence = await this.correspondence.create(
      matterId,
      {
        direction: CorrespondenceDirection.incoming,
        category,
        correspondenceDate: row.receivedAt.toISOString().slice(0, 10),
        sender,
        recipient,
        subject,
        status: CorrespondenceStatus.received,
        source: CorrespondenceSource.synced,
        messageId: row.internetMessageId ?? parsed.messageId ?? undefined,
        bodyText,
        documentVersionId,
        mailboxConnectionId: row.mailboxConnectionId,
        metadata: {
          logMethod: 'synced',
          unlinkedEmailId: row.id,
          mailboxProvider: row.mailboxConnection.provider,
        },
      },
      userId,
    );

    await this.prisma.unlinkedEmail.update({
      where: { id },
      data: {
        status: UnlinkedEmailStatus.linked,
        linkedCorrespondenceId: correspondence.id,
        linkedById: userId,
        linkedAt: new Date(),
      },
    });

    return { correspondence, unlinkedEmailId: id };
  }

  private canLink(roles: string[]): boolean {
    const allowed = new Set<string>([
      SYSTEM_ROLES.MANAGING_PARTNER,
      SYSTEM_ROLES.COORDINATOR,
      SYSTEM_ROLES.DOCKETING_ADMIN,
      SYSTEM_ROLES.IP_ATTORNEY,
      SYSTEM_ROLES.TRADEMARK_ATTORNEY,
    ]);
    return roles.some((role) => allowed.has(role));
  }

  private async assertCanLinkToMatter(
    userId: string,
    roles: string[],
    matterId: string,
  ) {
    const isGatekeeper =
      roles.includes(SYSTEM_ROLES.MANAGING_PARTNER) ||
      roles.includes(SYSTEM_ROLES.COORDINATOR) ||
      roles.includes(SYSTEM_ROLES.DOCKETING_ADMIN);
    if (isGatekeeper) return;

    const isAttorney =
      roles.includes(SYSTEM_ROLES.IP_ATTORNEY) ||
      roles.includes(SYSTEM_ROLES.TRADEMARK_ATTORNEY);
    if (!isAttorney) return;

    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { assignedToId: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
    if (matter.assignedToId !== userId) {
      throw new ForbiddenException(
        'Attorneys can only link emails to their own matters',
      );
    }
  }

  private async storeEmlOnMatter(
    matterId: string,
    buffer: Buffer,
    subject: string,
    userId: string,
  ) {
    const displayName = subject.trim() || 'Synced email';
    const fileName = `${displayName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80)}.eml`;
    const storageKey = `matters/${matterId}/synced-emails/${Date.now()}-${fileName}`;

    const document = await this.prisma.matterDocument.create({
      data: {
        matterId,
        displayName,
        category: DocumentCategory.correspondence,
        tags: ['email', 'synced', 'eml'],
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
}
