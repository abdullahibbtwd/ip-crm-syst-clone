import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CorrespondenceDirection,
  CorrespondenceSource,
  CorrespondenceStatus,
  DocumentCategory,
  MatterTimelineEventType,
  Prisma,
} from '../../generated/prisma/client';
import { OfficeActionDeadlinesService } from '../deadlines/office-action-deadlines.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCorrespondenceDto,
  UpdateCorrespondenceDto,
} from './dto/correspondence.dto';

const userSelect = { id: true, fullName: true, email: true } as const;

const correspondenceInclude = {
  createdBy: { select: userSelect },
  documentVersion: {
    select: {
      id: true,
      version: true,
      fileName: true,
      document: { select: { id: true, displayName: true } },
    },
  },
} satisfies Prisma.CorrespondenceInclude;

const timelineInclude = {
  createdBy: { select: userSelect },
  correspondence: {
    select: {
      id: true,
      direction: true,
      status: true,
      subject: true,
    },
  },
} satisfies Prisma.MatterTimelineEventInclude;

function defaultStatusForDirection(
  direction: CorrespondenceDirection,
): CorrespondenceStatus {
  return direction === CorrespondenceDirection.outgoing
    ? CorrespondenceStatus.draft
    : CorrespondenceStatus.received;
}

function timelineTitle(
  direction: CorrespondenceDirection,
  subject: string,
  source: CorrespondenceSource = CorrespondenceSource.manual,
): string {
  const prefix =
    direction === CorrespondenceDirection.incoming ? 'Received' : 'Sent';
  const emailTag =
    source === CorrespondenceSource.synced ? ' (Synced)' : '';
  return `${prefix}${emailTag}: ${subject}`;
}

function timelineDescription(created: {
  sender: string;
  recipient: string;
  bodyText: string | null;
}): string {
  const route = `${created.sender} → ${created.recipient}`;
  if (created.bodyText) {
    const preview = created.bodyText.replace(/\s+/g, ' ').trim().slice(0, 160);
    return preview ? `${route}\n${preview}` : route;
  }
  return route;
}

@Injectable()
export class CorrespondenceService {
  private readonly logger = new Logger(CorrespondenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly officeActionDeadlines: OfficeActionDeadlinesService,
  ) {}

  async listForMatter(matterId: string) {
    await this.assertMatterExists(matterId);
    return this.prisma.correspondence.findMany({
      where: { matterId },
      orderBy: [{ correspondenceDate: 'desc' }, { createdAt: 'desc' }],
      include: correspondenceInclude,
    });
  }

  async listTimeline(matterId: string) {
    await this.assertMatterExists(matterId);
    return this.prisma.matterTimelineEvent.findMany({
      where: { matterId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      include: timelineInclude,
    });
  }

  async create(matterId: string, dto: CreateCorrespondenceDto, userId: string) {
    await this.assertMatterExists(matterId);
    if (dto.documentVersionId) {
      await this.assertDocumentVersionOnMatter(matterId, dto.documentVersionId);
    }

    const status = dto.status ?? defaultStatusForDirection(dto.direction);
    const correspondenceDate = new Date(dto.correspondenceDate);
    const source = dto.source ?? CorrespondenceSource.manual;
    const metadata = this.buildMetadata(dto.metadata, dto.bodyText);

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.correspondence.create({
        data: {
          matterId,
          direction: dto.direction,
          category: dto.category,
          correspondenceDate,
          sender: dto.sender.trim(),
          recipient: dto.recipient.trim(),
          subject: dto.subject.trim(),
          status,
          source,
          messageId: dto.messageId?.trim() || null,
          bodyText: dto.bodyText?.trim() || null,
          metadata: metadata as Prisma.InputJsonValue,
          documentVersionId: dto.documentVersionId,
          mailboxConnectionId: dto.mailboxConnectionId,
          createdById: userId,
        },
        include: correspondenceInclude,
      });

      await tx.matterTimelineEvent.create({
        data: {
          matterId,
          eventType: MatterTimelineEventType.correspondence,
          title: timelineTitle(dto.direction, created.subject, source),
          description: timelineDescription(created),
          occurredAt: correspondenceDate,
          sourceCorrespondenceId: created.id,
          createdById: userId,
          metadata: {
            direction: created.direction,
            status: created.status,
            category: created.category,
            correspondenceId: created.id,
            source: created.source,
          } as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    if (
      dto.direction === CorrespondenceDirection.incoming &&
      dto.category === DocumentCategory.office_action
    ) {
      try {
        await this.officeActionDeadlines.generateFromOfficeAction(
          matterId,
          row.id,
          correspondenceDate,
          userId,
        );
      } catch (err) {
        this.logger.error(
          `Office action deadline generation failed for correspondence ${row.id} on matter ${matterId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    return row;
  }

  async update(id: string, dto: UpdateCorrespondenceDto) {
    const existing = await this.prisma.correspondence.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Correspondence not found');

    if (dto.documentVersionId) {
      await this.assertDocumentVersionOnMatter(
        existing.matterId,
        dto.documentVersionId,
      );
    }

    return this.prisma.correspondence.update({
      where: { id },
      data: {
        status: dto.status,
        subject: dto.subject?.trim(),
        documentVersionId: dto.documentVersionId,
      },
      include: correspondenceInclude,
    });
  }

  private async assertMatterExists(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }

  private async assertDocumentVersionOnMatter(
    matterId: string,
    documentVersionId: string,
  ) {
    const version = await this.prisma.matterDocumentVersion.findFirst({
      where: {
        id: documentVersionId,
        document: { matterId },
      },
      select: { id: true },
    });
    if (!version) {
      throw new BadRequestException(
        'Document version not found on this matter',
      );
    }
  }

  private buildMetadata(
    metadata: Record<string, unknown> | undefined,
    bodyText: string | undefined,
  ): Prisma.InputJsonValue | undefined {
    const base = { ...(metadata ?? {}) };
    if (bodyText?.trim() && !base.logMethod) {
      base.logMethod = 'paste';
    }
    return Object.keys(base).length > 0 ? (base as Prisma.InputJsonValue) : undefined;
  }
}
