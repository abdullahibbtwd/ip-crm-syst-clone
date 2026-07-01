import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CorrespondenceDirection,
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
): string {
  const prefix =
    direction === CorrespondenceDirection.incoming ? 'Received' : 'Sent';
  return `${prefix}: ${subject}`;
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
          documentVersionId: dto.documentVersionId,
          createdById: userId,
        },
        include: correspondenceInclude,
      });

      await tx.matterTimelineEvent.create({
        data: {
          matterId,
          eventType: MatterTimelineEventType.correspondence,
          title: timelineTitle(dto.direction, created.subject),
          description: `${created.sender} → ${created.recipient}`,
          occurredAt: correspondenceDate,
          sourceCorrespondenceId: created.id,
          createdById: userId,
          metadata: {
            direction: created.direction,
            status: created.status,
            category: created.category,
            correspondenceId: created.id,
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
}
