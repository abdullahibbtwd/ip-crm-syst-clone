import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeadlineStatus,
  FixedFeeCategory,
  IpRightStatus,
  MatterTimelineEventType,
  Prisma,
  RenewalInstructionDecision,
  RenewalStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { ManagingPartnerAudienceService } from '../notifications/managing-partner-audience.service';
import {
  computeRenewalDates,
  getRenewalCycleConfig,
  supportsAutomaticRenewalCycle,
} from './renewal-cycle.config';
import { getDefaultRenewalFees } from './renewal-fees.config';
import { RenewalDeadlinesService } from './renewal-deadlines.service';
import type { RegisterIpRightDto } from './dto/register-ip-right.dto';
import type {
  CompleteRenewalDto,
  CreateRenewalWindowDto,
  InstructRenewalDto,
} from './dto/renewal-workflow.dto';
import type { ListRenewalsQueryDto } from './dto/renewal-query.dto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { parseLimit } from '../crm/dto/pagination.dto';
import {
  renewalPortalInstructInclude,
  renewalWindowDetailInclude,
  renewalWindowListInclude,
  renewalWorklistInclude,
  serializeRenewalWindowDetail,
  serializeRenewalWindowList,
  serializeRenewalWorklistItem,
  type RenewalPortalInstructRow,
} from './renewals.serialize';
import {
  renewalInstructionDb,
  renewalPaymentDb,
  renewalWindowDb,
} from './renewals.db';

const ipRightInclude = {
  filingDocumentVersion: {
    select: {
      id: true,
      version: true,
      fileName: true,
      document: { select: { id: true, displayName: true, category: true } },
    },
  },
  renewalWindows: {
    orderBy: { cycleNumber: 'asc' as const },
    select: {
      id: true,
      cycleNumber: true,
      dueDate: true,
      graceDate: true,
      status: true,
      jurisdiction: true,
    },
  },
} satisfies Prisma.IpRightInclude;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

@Injectable()
export class RenewalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renewalDeadlines: RenewalDeadlinesService,
    private readonly notifications: NotificationDispatchService,
    private readonly managingPartnerAudience: ManagingPartnerAudienceService,
  ) {}

  async listAll(query: ListRenewalsQueryDto) {
    return this.queryWorklist(query);
  }

  async listMy(user: AuthenticatedUser, query: ListRenewalsQueryDto) {
    return this.queryWorklist(query, user.userId);
  }

  async listForPortalClient(clientId: string) {
    const rows = await renewalWindowDb(this.prisma).findMany({
      where: {
        clientId,
        status: { in: [RenewalStatus.upcoming, RenewalStatus.instructed] },
      },
      orderBy: { dueDate: 'asc' },
      include: renewalWorklistInclude,
    });
    return rows.map(serializeRenewalWorklistItem);
  }

  async findOneForPortal(id: string, clientId: string) {
    const row = await renewalWindowDb(this.prisma).findFirst({
      where: { id, clientId },
      include: renewalWindowDetailInclude,
    });
    if (!row) throw new NotFoundException('Renewal not found');
    return serializeRenewalWindowDetail(row);
  }

  async portalInstruct(
    id: string,
    dto: InstructRenewalDto,
    user: AuthenticatedUser,
    clientId: string,
  ) {
    const window = await renewalWindowDb(this.prisma).findFirst({
      where: { id, clientId },
      include: renewalPortalInstructInclude,
    });
    if (!window) throw new NotFoundException('Renewal not found');

    const result = await this.instruct(id, dto, user.userId);
    await this.notifyRenewalInstruction(window, dto, user);

    return result;
  }

  private async notifyRenewalInstruction(
    window: RenewalPortalInstructRow,
    dto: InstructRenewalDto,
    actor: AuthenticatedUser,
  ) {
    const decisionLabel =
      dto.decision === RenewalInstructionDecision.proceed
        ? 'proceed'
        : 'abandon';
    const title = `Client renewal instruction: ${window.ipRight.title}`;
    const body = `Client (${actor.email}) instructed to ${decisionLabel} renewal (cycle ${window.cycleNumber}) on ${window.matter.title}.`;

    const recipientIds = new Set<string>();
    if (window.matter.assignedToId) {
      recipientIds.add(window.matter.assignedToId);
    }

    const partners =
      await this.managingPartnerAudience.listActiveManagingPartners();
    for (const partner of partners) {
      recipientIds.add(partner.id);
    }

    for (const userId of recipientIds) {
      const userRow = partners.find((p) => p.id === userId);
      const email =
        userId === window.matter.assignedToId
          ? (
              await this.prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
              })
            )?.email
          : userRow?.email;

      await this.notifications.dispatch({
        userId,
        type: 'renewal_instruction_received',
        title,
        body,
        resource: 'renewal',
        resourceId: window.id,
        linkUrl: `/matters/${window.matterId}/ip-rights`,
        emailTo: email,
        metadata: {
          matterId: window.matterId,
          renewalWindowId: window.id,
          decision: dto.decision,
          audience:
            userId === window.matter.assignedToId
              ? 'assignee'
              : 'managing_partner',
        },
      });
    }
  }

  private async queryWorklist(
    query: ListRenewalsQueryDto,
    assignedToId?: string,
  ) {
    const take = parseLimit(query.limit, 30);

    const rows = await renewalWindowDb(this.prisma).findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.jurisdiction
          ? { jurisdiction: query.jurisdiction.toUpperCase() }
          : {}),
        ...(query.dueBefore
          ? { dueDate: { lte: new Date(query.dueBefore) } }
          : {}),
        matter: {
          ...((assignedToId ?? query.assignedToId)
            ? { assignedToId: assignedToId ?? query.assignedToId }
            : {}),
        },
      },
      orderBy: [{ dueDate: 'asc' }, { cycleNumber: 'asc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: renewalWorklistInclude,
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items: items.map(serializeRenewalWorklistItem),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  async registerIpRight(
    matterId: string,
    ipRightId: string,
    dto: RegisterIpRightDto,
    userId: string,
  ) {
    const ipRight = await this.prisma.ipRight.findFirst({
      where: { id: ipRightId, matterId },
      include: { renewalWindows: { where: { cycleNumber: 1 } } },
    });
    if (!ipRight) {
      throw new NotFoundException('IP right not found on this matter');
    }

    if (ipRight.status === IpRightStatus.registered) {
      throw new BadRequestException('IP right is already registered');
    }
    if (ipRight.status === IpRightStatus.pending) {
      throw new BadRequestException(
        'File the application before registering the IP right',
      );
    }
    if (
      ipRight.status !== IpRightStatus.filed &&
      ipRight.status !== IpRightStatus.expired
    ) {
      throw new BadRequestException(
        `Cannot register IP right in status "${ipRight.status}"`,
      );
    }

    if (ipRight.renewalWindows.length > 0) {
      throw new BadRequestException(
        'Renewal window already exists for this IP right',
      );
    }

    const registrationDate = new Date(dto.registrationDate);
    const registrationNumber = dto.registrationNumber.trim();

    const cycle = computeRenewalDates({
      matterType: ipRight.rightType,
      jurisdiction: ipRight.jurisdiction,
      registrationDate,
      cycleNumber: 1,
    });

    if (!cycle && !dto.expiryDate) {
      throw new BadRequestException(
        'Automatic renewal cycle is not configured for this right type and jurisdiction. Provide expiryDate manually.',
      );
    }

    const expiryDate = dto.expiryDate
      ? new Date(dto.expiryDate)
      : cycle!.dueDate;
    const windowDueDate = expiryDate;
    const windowGraceDate = cycle?.graceDate ?? null;

    const ruleJurisdiction = cycle?.jurisdiction ?? ipRight.jurisdiction;

    const result = await this.prisma.$transaction(async (tx) => {
      const registered = await tx.ipRight.update({
        where: { id: ipRightId },
        data: {
          status: IpRightStatus.registered,
          registrationNumber,
          registrationDate,
          expiryDate,
        },
        include: ipRightInclude,
      });

      const renewalWindow = await renewalWindowDb(tx).create({
        data: {
          ipRightId,
          matterId,
          clientId: ipRight.clientId,
          cycleNumber: 1,
          jurisdiction: ruleJurisdiction,
          dueDate: windowDueDate,
          graceDate: windowGraceDate,
          status: RenewalStatus.upcoming,
        },
      });

      await tx.matterTimelineEvent.create({
        data: {
          matterId,
          eventType: MatterTimelineEventType.note,
          title: `IP right registered — ${registered.title}`,
          description: `Registration no. ${registrationNumber}. First renewal due ${formatDate(windowDueDate)}.`,
          occurredAt: registrationDate,
          createdById: userId,
          metadata: {
            ipRightId,
            renewalWindowId: renewalWindow.id,
            registrationNumber,
            registrationDate: dto.registrationDate,
            expiryDate: expiryDate.toISOString().slice(0, 10),
            cycleNumber: 1,
            automaticCycle: supportsAutomaticRenewalCycle(
              ipRight.rightType,
              ipRight.jurisdiction,
            ),
          },
        },
      });

      return { registered, renewalWindow };
    });

    const deadlines = await this.renewalDeadlines.generateFromWindow(
      result.renewalWindow.id,
      userId,
    );

    return {
      ipRight: result.registered,
      renewalWindow: result.renewalWindow,
      deadlines,
    };
  }

  async createWindow(
    matterId: string,
    ipRightId: string,
    params: {
      dueDate: Date;
      graceDate?: Date | null;
      cycleNumber: number;
      jurisdiction?: string;
    },
    userId: string,
  ) {
    const ipRight = await this.prisma.ipRight.findFirst({
      where: { id: ipRightId, matterId },
    });
    if (!ipRight) {
      throw new NotFoundException('IP right not found on this matter');
    }

    const existing = await renewalWindowDb(this.prisma).findUnique({
      where: {
        ipRightId_cycleNumber: {
          ipRightId,
          cycleNumber: params.cycleNumber,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Renewal window cycle ${params.cycleNumber} already exists`,
      );
    }

    const renewalWindow = await renewalWindowDb(this.prisma).create({
      data: {
        ipRightId,
        matterId,
        clientId: ipRight.clientId,
        cycleNumber: params.cycleNumber,
        jurisdiction: params.jurisdiction ?? ipRight.jurisdiction,
        dueDate: params.dueDate,
        graceDate: params.graceDate ?? null,
        status: RenewalStatus.upcoming,
      },
    });

    const deadlines = await this.renewalDeadlines.generateFromWindow(
      renewalWindow.id,
      userId,
    );

    return { renewalWindow, deadlines };
  }

  async listForIpRight(matterId: string, ipRightId: string) {
    const ipRight = await this.prisma.ipRight.findFirst({
      where: { id: ipRightId, matterId },
    });
    if (!ipRight) {
      throw new NotFoundException('IP right not found on this matter');
    }

    const rows = await renewalWindowDb(this.prisma).findMany({
      where: { ipRightId },
      orderBy: { cycleNumber: 'asc' },
      include: renewalWindowListInclude,
    });

    return rows.map(serializeRenewalWindowList);
  }

  async findOne(id: string) {
    const row = await renewalWindowDb(this.prisma).findUnique({
      where: { id },
      include: renewalWindowDetailInclude,
    });
    if (!row) throw new NotFoundException('Renewal window not found');
    return serializeRenewalWindowDetail(row);
  }

  async createWindowFromDto(
    matterId: string,
    ipRightId: string,
    dto: CreateRenewalWindowDto,
    userId: string,
  ) {
    return this.createWindow(
      matterId,
      ipRightId,
      {
        dueDate: new Date(dto.dueDate),
        graceDate: dto.graceDate ? new Date(dto.graceDate) : null,
        cycleNumber: dto.cycleNumber ?? 1,
        jurisdiction: dto.jurisdiction,
      },
      userId,
    );
  }

  async instruct(id: string, dto: InstructRenewalDto, userId: string) {
    const window = await this.requireActiveWindow(id);
    if (window.status !== RenewalStatus.upcoming) {
      throw new BadRequestException(
        'Instructions can only be recorded for upcoming renewals',
      );
    }

    const nextStatus =
      dto.decision === RenewalInstructionDecision.abandon
        ? RenewalStatus.lapsed
        : RenewalStatus.instructed;

    await this.prisma.$transaction(async (tx) => {
      await renewalInstructionDb(tx).create({
        data: {
          renewalWindowId: id,
          decision: dto.decision,
          notes: dto.notes?.trim() || null,
          capturedById: userId,
        },
      });

      await renewalWindowDb(tx).update({
        where: { id },
        data: { status: nextStatus },
      });

      if (dto.decision === RenewalInstructionDecision.abandon) {
        await tx.deadline.updateMany({
          where: {
            sourceRenewalWindowId: id,
            status: {
              in: [DeadlineStatus.pending, DeadlineStatus.in_progress],
            },
          },
          data: { status: DeadlineStatus.superseded },
        });
      }
    });

    return this.findOne(id);
  }

  async markFiled(id: string, userId: string) {
    const window = await this.requireActiveWindow(id);
    if (window.status !== RenewalStatus.instructed) {
      throw new BadRequestException(
        'Only instructed renewals can be marked as filed',
      );
    }

    await renewalWindowDb(this.prisma).update({
      where: { id },
      data: { status: RenewalStatus.filed },
    });

    await this.prisma.matterTimelineEvent.create({
      data: {
        matterId: window.matterId,
        eventType: MatterTimelineEventType.note,
        title: `Renewal filed — cycle ${window.cycleNumber}`,
        description: `Renewal submission recorded for ${window.ipRight.title}.`,
        occurredAt: new Date(),
        createdById: userId,
        metadata: {
          renewalWindowId: id,
          ipRightId: window.ipRightId,
        },
      },
    });

    return this.findOne(id);
  }

  async complete(id: string, dto: CompleteRenewalDto, userId: string) {
    const window = await renewalWindowDb(this.prisma).findUnique({
      where: { id },
      include: { ipRight: true },
    });
    if (!window) throw new NotFoundException('Renewal window not found');

    if (
      window.status !== RenewalStatus.instructed &&
      window.status !== RenewalStatus.filed
    ) {
      throw new BadRequestException(
        'Only instructed or filed renewals can be completed',
      );
    }

    const defaults = getDefaultRenewalFees(
      window.ipRight.rightType,
      window.jurisdiction,
    );
    const officialFee = dto.officialFeeAmount ?? defaults.officialFee;
    const serviceFee = dto.serviceFeeAmount ?? defaults.serviceFee;
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const cycleConfig = getRenewalCycleConfig(
      window.ipRight.rightType,
      window.ipRight.jurisdiction,
    );

    const nextExpiry = cycleConfig
      ? addYears(window.dueDate, cycleConfig.termYears)
      : window.dueDate;

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.proofDocumentVersionId || officialFee > 0) {
        await renewalPaymentDb(tx).create({
          data: {
            renewalWindowId: id,
            amount: officialFee > 0 ? officialFee : serviceFee,
            currency: defaults.currency,
            paidAt,
            proofDocumentVersionId: dto.proofDocumentVersionId ?? null,
            recordedById: userId,
          },
        });
      }

      if (officialFee > 0) {
        await tx.fixedFee.create({
          data: {
            matterId: window.matterId,
            sourceRenewalWindowId: id,
            description: `Renewal official fee — ${window.ipRight.title} (cycle ${window.cycleNumber})`,
            amount: officialFee,
            currency: defaults.currency,
            category: FixedFeeCategory.disbursement,
            date: paidAt,
          },
        });
      }

      if (serviceFee > 0) {
        await tx.fixedFee.create({
          data: {
            matterId: window.matterId,
            sourceRenewalWindowId: id,
            description: `Renewal service fee — ${window.ipRight.title} (cycle ${window.cycleNumber})`,
            amount: serviceFee,
            currency: defaults.currency,
            category: FixedFeeCategory.professional_fee,
            date: paidAt,
          },
        });
      }

      await tx.deadline.updateMany({
        where: {
          sourceRenewalWindowId: id,
          status: {
            in: [
              DeadlineStatus.pending,
              DeadlineStatus.in_progress,
              DeadlineStatus.missed,
              DeadlineStatus.escalated,
            ],
          },
        },
        data: {
          status: DeadlineStatus.completed,
          completedAt: new Date(),
        },
      });

      await renewalWindowDb(tx).update({
        where: { id },
        data: {
          status: RenewalStatus.completed,
          completedAt: new Date(),
        },
      });

      await tx.ipRight.update({
        where: { id: window.ipRightId },
        data: {
          status: IpRightStatus.registered,
          expiryDate: nextExpiry,
        },
      });

      let nextWindow: { id: string } | null = null;
      if (
        supportsAutomaticRenewalCycle(
          window.ipRight.rightType,
          window.ipRight.jurisdiction,
        ) &&
        window.ipRight.registrationDate
      ) {
        const nextCycle = window.cycleNumber + 1;
        const dates = computeRenewalDates({
          matterType: window.ipRight.rightType,
          jurisdiction: window.ipRight.jurisdiction,
          registrationDate: window.ipRight.registrationDate,
          cycleNumber: nextCycle,
        });

        if (dates) {
          nextWindow = await renewalWindowDb(tx).create({
            data: {
              ipRightId: window.ipRightId,
              matterId: window.matterId,
              clientId: window.clientId,
              cycleNumber: nextCycle,
              jurisdiction: dates.jurisdiction ?? window.jurisdiction,
              dueDate: dates.dueDate,
              graceDate: dates.graceDate,
              status: RenewalStatus.upcoming,
            },
          });
        }
      }

      await tx.matterTimelineEvent.create({
        data: {
          matterId: window.matterId,
          eventType: MatterTimelineEventType.note,
          title: `Renewal completed — cycle ${window.cycleNumber}`,
          description: `${window.ipRight.title} renewed. Next expiry ${formatDate(nextExpiry)}.`,
          occurredAt: new Date(),
          createdById: userId,
          metadata: {
            renewalWindowId: id,
            nextRenewalWindowId: nextWindow?.id ?? null,
            ipRightId: window.ipRightId,
          },
        },
      });

      return { nextWindowId: nextWindow?.id ?? null };
    });

    if (result.nextWindowId) {
      await this.renewalDeadlines.generateFromWindow(
        result.nextWindowId,
        userId,
      );
    }

    return this.findOne(id);
  }

  private async requireActiveWindow(id: string) {
    const window = await renewalWindowDb(this.prisma).findUnique({
      where: { id },
      include: { ipRight: true },
    });
    if (!window) throw new NotFoundException('Renewal window not found');
    if (
      window.status === RenewalStatus.completed ||
      window.status === RenewalStatus.lapsed
    ) {
      throw new BadRequestException(
        `Renewal window is already ${window.status}`,
      );
    }
    return window;
  }
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}
