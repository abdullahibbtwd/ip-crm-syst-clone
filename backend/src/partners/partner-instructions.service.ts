import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PartnerInstructionStatus,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { ManagingPartnerAudienceService } from '../notifications/managing-partner-audience.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import {
  CreatePartnerInstructionDto,
  ListMatterInstructionsQueryDto,
  UpdatePartnerInstructionDto,
} from './dto/partner-instruction.dto';

const instructionInclude = {
  partner: true,
  deadline: {
    select: { id: true, title: true, dueDate: true },
  },
  createdBy: {
    select: { id: true, fullName: true, email: true },
  },
  matter: {
    select: {
      id: true,
      title: true,
      assignedToId: true,
      assignedTo: { select: { id: true, email: true, fullName: true } },
    },
  },
} satisfies Prisma.PartnerInstructionInclude;

type InstructionRow = Prisma.PartnerInstructionGetPayload<{
  include: typeof instructionInclude;
}>;

const ALLOWED_TRANSITIONS: Record<
  PartnerInstructionStatus,
  PartnerInstructionStatus | null
> = {
  [PartnerInstructionStatus.draft]: PartnerInstructionStatus.sent,
  [PartnerInstructionStatus.sent]: PartnerInstructionStatus.acknowledged,
  [PartnerInstructionStatus.acknowledged]: PartnerInstructionStatus.complete,
  [PartnerInstructionStatus.complete]: null,
};

@Injectable()
export class PartnerInstructionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationDispatchService,
    private readonly managingPartnerAudience: ManagingPartnerAudienceService,
    private readonly email: EmailService,
  ) {}

  async listForMatter(
    matterId: string,
    query: ListMatterInstructionsQueryDto = {},
  ) {
    await this.assertMatterExists(matterId);
    return this.prisma.partnerInstruction.findMany({
      where: {
        matterId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: instructionInclude,
    });
  }

  async create(
    matterId: string,
    dto: CreatePartnerInstructionDto,
    userId: string,
  ) {
    await this.assertMatterExists(matterId);

    const partner = await this.prisma.partner.findUnique({
      where: { id: dto.partnerId },
    });
    if (!partner) throw new NotFoundException('Partner not found');
    if (!partner.isActive) {
      throw new BadRequestException('Partner is inactive');
    }

    if (dto.deadlineId) {
      const deadline = await this.prisma.deadline.findFirst({
        where: { id: dto.deadlineId, matterId },
      });
      if (!deadline) {
        throw new BadRequestException(
          'Deadline not found on this matter',
        );
      }
    }

    return this.prisma.partnerInstruction.create({
      data: {
        matterId,
        partnerId: dto.partnerId,
        title: dto.title.trim(),
        body: dto.body?.trim() || null,
        deadlineId: dto.deadlineId ?? null,
        createdById: userId,
        status: PartnerInstructionStatus.draft,
      },
      include: instructionInclude,
    });
  }

  async update(
    matterId: string,
    id: string,
    dto: UpdatePartnerInstructionDto,
  ) {
    const row = await this.getForMatterOrThrow(matterId, id);
    if (row.status !== PartnerInstructionStatus.draft) {
      throw new BadRequestException(
        'Only draft instructions can be edited',
      );
    }

    if (dto.deadlineId) {
      const deadline = await this.prisma.deadline.findFirst({
        where: { id: dto.deadlineId, matterId },
      });
      if (!deadline) {
        throw new BadRequestException(
          'Deadline not found on this matter',
        );
      }
    }

    return this.prisma.partnerInstruction.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        body: dto.body === undefined ? undefined : dto.body?.trim() || null,
        deadlineId:
          dto.deadlineId === undefined ? undefined : dto.deadlineId,
      },
      include: instructionInclude,
    });
  }

  async transition(
    matterId: string,
    id: string,
    nextStatus: PartnerInstructionStatus,
  ) {
    const row = await this.getForMatterOrThrow(matterId, id);
    const allowed = ALLOWED_TRANSITIONS[row.status];
    if (allowed !== nextStatus) {
      throw new BadRequestException(
        `Cannot transition from ${row.status} to ${nextStatus}`,
      );
    }

    const now = new Date();
    const data: Prisma.PartnerInstructionUpdateInput = {
      status: nextStatus,
    };
    if (nextStatus === PartnerInstructionStatus.sent) {
      data.sentAt = now;
    } else if (nextStatus === PartnerInstructionStatus.acknowledged) {
      data.acknowledgedAt = now;
    } else if (nextStatus === PartnerInstructionStatus.complete) {
      data.completedAt = now;
    }

    const updated = await this.prisma.partnerInstruction.update({
      where: { id },
      data,
      include: instructionInclude,
    });

    if (nextStatus === PartnerInstructionStatus.sent) {
      await this.notifyInstructionSent(updated);
    }

    return updated;
  }

  private async notifyInstructionSent(row: InstructionRow) {
    const title = `Partner instruction sent: ${row.title}`;
    const body = `Instruction for ${row.partner.name} on matter "${row.matter.title}" was marked as sent.`;
    const linkUrl = `/matters/${row.matterId}`;

    const recipientIds = new Set<string>();
    if (row.matter.assignedToId) {
      recipientIds.add(row.matter.assignedToId);
    }

    const partners =
      await this.managingPartnerAudience.listActiveManagingPartners();
    for (const partner of partners) {
      recipientIds.add(partner.id);
    }

    for (const userId of recipientIds) {
      const mp = partners.find((p) => p.id === userId);
      const email =
        userId === row.matter.assignedToId
          ? row.matter.assignedTo?.email
          : mp?.email;

      await this.notifications.dispatch({
        userId,
        type: 'partner_instruction_update',
        title,
        body,
        resource: 'partner_instruction',
        resourceId: row.id,
        linkUrl,
        emailTo: email ?? undefined,
        metadata: {
          matterId: row.matterId,
          partnerId: row.partnerId,
          partnerInstructionId: row.id,
          status: PartnerInstructionStatus.sent,
          audience:
            userId === row.matter.assignedToId
              ? 'assignee'
              : 'managing_partner',
        },
      });
    }

    if (row.partner.email) {
      await this.email.send({
        to: row.partner.email,
        subject: title,
        text: [
          body,
          '',
          row.body?.trim() || '',
          '',
          `Matter: ${row.matter.title}`,
        ]
          .filter(Boolean)
          .join('\n'),
      });
    }
  }

  private async getForMatterOrThrow(matterId: string, id: string) {
    const row = await this.prisma.partnerInstruction.findFirst({
      where: { id, matterId },
      include: instructionInclude,
    });
    if (!row) throw new NotFoundException('Partner instruction not found');
    return row;
  }

  private async assertMatterExists(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }
}
