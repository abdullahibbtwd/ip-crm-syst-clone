import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DeadlineStatus,
  FixedFeeCategory,
  IpRightStatus,
  MatterTimelineEventType,
  type MatterType,
  Prisma,
  RenewalInstructionDecision,
  RenewalStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';
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
  RecordRenewalPartPaymentDto,
  SplitRenewalPartDto,
} from './dto/renewal-workflow.dto';
import type { ListRenewalsQueryDto } from './dto/renewal-query.dto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { parseLimit } from '../crm/dto/pagination.dto';
import {
  renewalPortalInstructInclude,
  renewalWindowDetailInclude,
  renewalWindowListInclude,
  renewalWorklistInclude,
  serializeRenewalPart,
  serializeRenewalWindowDetail,
  serializeRenewalWindowList,
  serializeRenewalWorklistItem,
  type RenewalPortalInstructRow,
} from './renewals.serialize';
import {
  renewalInstructionDb,
  renewalPartDb,
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
  private readonly logger = new Logger(RenewalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly renewalDeadlines: RenewalDeadlinesService,
    private readonly notifications: NotificationDispatchService,
    private readonly managingPartnerAudience: ManagingPartnerAudienceService,
    private readonly invoices: InvoicesService,
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

  async portalInstructPart(
    partId: string,
    dto: InstructRenewalDto,
    user: AuthenticatedUser,
    clientId: string,
  ) {
    const part = await renewalPartDb(this.prisma).findFirst({
      where: { id: partId, renewalWindow: { clientId } },
      include: {
        renewalWindow: { include: renewalPortalInstructInclude },
      },
    });
    if (!part) throw new NotFoundException('Renewal part not found');

    const result = await this.instructPart(partId, dto, user.userId);
    await this.notifyRenewalInstruction(part.renewalWindow, dto, user);

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

    // Patents/utility models: prefer filing anniversary as the annuity anchor.
    const cycleAnchorDate =
      (ipRight.rightType === 'patent' ||
        ipRight.rightType === 'utility_model') &&
      ipRight.filingDate
        ? ipRight.filingDate
        : registrationDate;

    const cycle = computeRenewalDates({
      matterType: ipRight.rightType,
      jurisdiction: ipRight.jurisdiction,
      registrationDate: cycleAnchorDate,
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
          title: `IP right registered - ${registered.title}`,
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
    await this.assertNoParts(
      id,
      'This renewal has parts; instruct each part instead',
    );
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
    await this.assertNoParts(
      id,
      'This renewal has parts; mark each part as filed instead',
    );
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
        title: `Renewal filed - cycle ${window.cycleNumber}`,
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

    await this.assertNoParts(
      id,
      'This renewal has parts; complete each part instead',
    );

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

    const result = await this.prisma.$transaction(async (tx) => {
      const fixedFeeIds: string[] = [];

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
        const fee = await tx.fixedFee.create({
          data: {
            matterId: window.matterId,
            sourceRenewalWindowId: id,
            description: `Renewal official fee - ${window.ipRight.title} (cycle ${window.cycleNumber})`,
            amount: officialFee,
            currency: defaults.currency,
            category: FixedFeeCategory.disbursement,
            date: paidAt,
          },
        });
        fixedFeeIds.push(fee.id);
      }

      if (serviceFee > 0) {
        const fee = await tx.fixedFee.create({
          data: {
            matterId: window.matterId,
            sourceRenewalWindowId: id,
            description: `Renewal service fee - ${window.ipRight.title} (cycle ${window.cycleNumber})`,
            amount: serviceFee,
            currency: defaults.currency,
            category: FixedFeeCategory.professional_fee,
            date: paidAt,
          },
        });
        fixedFeeIds.push(fee.id);
      }

      const finalized = await this.finalizeWindowCompletion(tx, window, userId);
      return { ...finalized, fixedFeeIds };
    });

    if (result.nextWindowId) {
      await this.renewalDeadlines.generateFromWindow(
        result.nextWindowId,
        userId,
      );
    }

    await this.autoInvoiceRenewalFees({
      matterId: window.matterId,
      fixedFeeIds: result.fixedFeeIds,
      userId,
      notes: `Auto-invoiced on renewal completion — ${window.ipRight.title} (cycle ${window.cycleNumber})`,
    });

    return this.findOne(id);
  }

  async listParts(windowId: string) {
    const window = await renewalWindowDb(this.prisma).findUnique({
      where: { id: windowId },
      select: { id: true },
    });
    if (!window) throw new NotFoundException('Renewal window not found');

    const parts = await renewalPartDb(this.prisma).findMany({
      where: { renewalWindowId: windowId },
      orderBy: { createdAt: 'asc' },
    });
    return parts.map(serializeRenewalPart);
  }

  async splitWindow(
    windowId: string,
    parts: SplitRenewalPartDto[],
    _userId: string,
  ) {
    if (!parts.length) {
      throw new BadRequestException('At least one part is required');
    }

    const window = await renewalWindowDb(this.prisma).findUnique({
      where: { id: windowId },
      include: { ipRight: true, parts: true },
    });
    if (!window) throw new NotFoundException('Renewal window not found');

    if (window.status !== RenewalStatus.upcoming) {
      throw new BadRequestException(
        'Only upcoming renewals can be split into parts',
      );
    }

    if (
      window.parts.length > 0 &&
      window.parts.some((p) => p.status !== RenewalStatus.upcoming)
    ) {
      throw new BadRequestException(
        'Cannot replace parts unless all existing parts are still upcoming',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (window.parts.length > 0) {
        await renewalPartDb(tx).deleteMany({
          where: { renewalWindowId: windowId },
        });
      }

      for (const part of parts) {
        const jurisdiction = part.jurisdiction.trim().toUpperCase();
        const defaults = getDefaultRenewalFees(
          window.ipRight.rightType,
          jurisdiction,
        );
        await renewalPartDb(tx).create({
          data: {
            renewalWindowId: windowId,
            jurisdiction,
            niceClasses: part.niceClasses ?? [],
            status: RenewalStatus.upcoming,
            officialFee: part.officialFee ?? defaults.officialFee,
            serviceFee: part.serviceFee ?? defaults.serviceFee,
            currency: defaults.currency,
            dueDate: window.dueDate,
            graceDate: window.graceDate,
            notes: part.notes?.trim() || null,
          },
        });
      }
    });

    return this.findOne(windowId);
  }

  async instructPart(
    partId: string,
    dto: InstructRenewalDto,
    userId: string,
  ) {
    const part = await this.requireActivePart(partId);
    if (part.status !== RenewalStatus.upcoming) {
      throw new BadRequestException(
        'Instructions can only be recorded for upcoming renewal parts',
      );
    }

    const nextStatus =
      dto.decision === RenewalInstructionDecision.abandon
        ? RenewalStatus.lapsed
        : RenewalStatus.instructed;

    await this.prisma.$transaction(async (tx) => {
      await renewalInstructionDb(tx).create({
        data: {
          renewalWindowId: part.renewalWindowId,
          renewalPartId: partId,
          decision: dto.decision,
          notes: dto.notes?.trim() || null,
          capturedById: userId,
        },
      });

      await renewalPartDb(tx).update({
        where: { id: partId },
        data: {
          status: nextStatus,
          ...(nextStatus === RenewalStatus.lapsed
            ? { completedAt: new Date() }
            : {}),
        },
      });
    });

    await this.rollupWindowStatus(part.renewalWindowId, userId);
    return this.findOne(part.renewalWindowId);
  }

  async markPartFiled(partId: string, userId: string) {
    const part = await this.requireActivePart(partId);
    if (part.status !== RenewalStatus.instructed) {
      throw new BadRequestException(
        'Only instructed renewal parts can be marked as filed',
      );
    }

    await renewalPartDb(this.prisma).update({
      where: { id: partId },
      data: { status: RenewalStatus.filed },
    });

    await this.prisma.matterTimelineEvent.create({
      data: {
        matterId: part.renewalWindow.matterId,
        eventType: MatterTimelineEventType.note,
        title: `Renewal part filed - ${part.jurisdiction}`,
        description: `Partial renewal filed for ${part.renewalWindow.ipRight.title} (${part.jurisdiction}).`,
        occurredAt: new Date(),
        createdById: userId,
        metadata: {
          renewalWindowId: part.renewalWindowId,
          renewalPartId: partId,
          ipRightId: part.renewalWindow.ipRightId,
        },
      },
    });

    await this.rollupWindowStatus(part.renewalWindowId, userId);
    return this.findOne(part.renewalWindowId);
  }

  async recordPartPayment(
    partId: string,
    dto: RecordRenewalPartPaymentDto,
    userId: string,
  ) {
    const part = await this.requireActivePart(partId);
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    await renewalPaymentDb(this.prisma).create({
      data: {
        renewalWindowId: part.renewalWindowId,
        renewalPartId: partId,
        amount: dto.amount,
        currency: dto.currency?.trim().toUpperCase() || part.currency,
        paidAt,
        proofDocumentVersionId: dto.proofDocumentVersionId ?? null,
        recordedById: userId,
      },
    });

    return this.findOne(part.renewalWindowId);
  }

  async completePart(
    partId: string,
    dto: CompleteRenewalDto,
    userId: string,
  ) {
    const part = await this.requireActivePart(partId);
    if (
      part.status !== RenewalStatus.instructed &&
      part.status !== RenewalStatus.filed
    ) {
      throw new BadRequestException(
        'Only instructed or filed renewal parts can be completed',
      );
    }

    const defaults = getDefaultRenewalFees(
      part.renewalWindow.ipRight.rightType,
      part.jurisdiction,
    );
    const officialFee =
      dto.officialFeeAmount ??
      (part.officialFee == null
        ? defaults.officialFee
        : Number(part.officialFee));
    const serviceFee =
      dto.serviceFeeAmount ??
      (part.serviceFee == null
        ? defaults.serviceFee
        : Number(part.serviceFee));
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const currency = part.currency || defaults.currency;

    const fixedFeeIds = await this.prisma.$transaction(async (tx) => {
      const ids: string[] = [];

      if (dto.proofDocumentVersionId || officialFee > 0) {
        await renewalPaymentDb(tx).create({
          data: {
            renewalWindowId: part.renewalWindowId,
            renewalPartId: partId,
            amount: officialFee > 0 ? officialFee : serviceFee,
            currency,
            paidAt,
            proofDocumentVersionId: dto.proofDocumentVersionId ?? null,
            recordedById: userId,
          },
        });
      }

      if (officialFee > 0) {
        const fee = await tx.fixedFee.create({
          data: {
            matterId: part.renewalWindow.matterId,
            sourceRenewalWindowId: part.renewalWindowId,
            description: `Renewal official fee - ${part.renewalWindow.ipRight.title} (${part.jurisdiction}, cycle ${part.renewalWindow.cycleNumber})`,
            amount: officialFee,
            currency,
            category: FixedFeeCategory.disbursement,
            date: paidAt,
          },
        });
        ids.push(fee.id);
      }

      if (serviceFee > 0) {
        const fee = await tx.fixedFee.create({
          data: {
            matterId: part.renewalWindow.matterId,
            sourceRenewalWindowId: part.renewalWindowId,
            description: `Renewal service fee - ${part.renewalWindow.ipRight.title} (${part.jurisdiction}, cycle ${part.renewalWindow.cycleNumber})`,
            amount: serviceFee,
            currency,
            category: FixedFeeCategory.professional_fee,
            date: paidAt,
          },
        });
        ids.push(fee.id);
      }

      await renewalPartDb(tx).update({
        where: { id: partId },
        data: {
          status: RenewalStatus.completed,
          completedAt: new Date(),
        },
      });

      return ids;
    });

    await this.rollupWindowStatus(part.renewalWindowId, userId);

    await this.autoInvoiceRenewalFees({
      matterId: part.renewalWindow.matterId,
      fixedFeeIds,
      userId,
      notes: `Auto-invoiced on renewal part completion — ${part.renewalWindow.ipRight.title} (${part.jurisdiction})`,
    });

    return this.findOne(part.renewalWindowId);
  }

  async rollupWindowStatus(windowId: string, userId?: string) {
    const window = await renewalWindowDb(this.prisma).findUnique({
      where: { id: windowId },
      include: { ipRight: true, parts: true },
    });
    if (!window) throw new NotFoundException('Renewal window not found');
    if (window.parts.length === 0) return this.findOne(windowId);

    const statuses = window.parts.map((p) => p.status);
    const allTerminal = statuses.every(
      (s) => s === RenewalStatus.completed || s === RenewalStatus.lapsed,
    );
    const anyCompleted = statuses.some((s) => s === RenewalStatus.completed);
    const allLapsed = statuses.every((s) => s === RenewalStatus.lapsed);

    if (allTerminal && anyCompleted) {
      if (window.status === RenewalStatus.completed) {
        return this.findOne(windowId);
      }
      if (!userId) {
        throw new BadRequestException(
          'userId is required to finalize a completed partial renewal',
        );
      }
      const result = await this.prisma.$transaction(async (tx) => {
        return this.finalizeWindowCompletion(tx, window, userId);
      });
      if (result.nextWindowId) {
        await this.renewalDeadlines.generateFromWindow(
          result.nextWindowId,
          userId,
        );
      }
      return this.findOne(windowId);
    }

    if (allTerminal && allLapsed) {
      if (window.status === RenewalStatus.lapsed) {
        return this.findOne(windowId);
      }
      await this.prisma.$transaction(async (tx) => {
        await renewalWindowDb(tx).update({
          where: { id: windowId },
          data: { status: RenewalStatus.lapsed, completedAt: new Date() },
        });
        await tx.deadline.updateMany({
          where: {
            sourceRenewalWindowId: windowId,
            status: {
              in: [DeadlineStatus.pending, DeadlineStatus.in_progress],
            },
          },
          data: { status: DeadlineStatus.superseded },
        });
      });
      return this.findOne(windowId);
    }

    let nextStatus: RenewalStatus = RenewalStatus.upcoming;
    if (statuses.some((s) => s === RenewalStatus.filed)) {
      nextStatus = RenewalStatus.filed;
    } else if (statuses.some((s) => s === RenewalStatus.instructed)) {
      nextStatus = RenewalStatus.instructed;
    }

    if (window.status !== nextStatus) {
      await renewalWindowDb(this.prisma).update({
        where: { id: windowId },
        data: { status: nextStatus },
      });
    }

    return this.findOne(windowId);
  }

  private async finalizeWindowCompletion(
    tx: Prisma.TransactionClient,
    window: {
      id: string;
      matterId: string;
      clientId: string;
      ipRightId: string;
      cycleNumber: number;
      jurisdiction: string;
      dueDate: Date;
      ipRight: {
        id: string;
        title: string;
        rightType: MatterType;
        jurisdiction: string;
        registrationDate: Date | null;
      };
    },
    userId: string,
  ) {
    const cycleConfig = getRenewalCycleConfig(
      window.ipRight.rightType,
      window.ipRight.jurisdiction,
    );
    const nextExpiry = cycleConfig
      ? addYears(window.dueDate, cycleConfig.termYears)
      : window.dueDate;

    await tx.deadline.updateMany({
      where: {
        sourceRenewalWindowId: window.id,
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
      where: { id: window.id },
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
        title: `Renewal completed - cycle ${window.cycleNumber}`,
        description: `${window.ipRight.title} renewed. Next expiry ${formatDate(nextExpiry)}.`,
        occurredAt: new Date(),
        createdById: userId,
        metadata: {
          renewalWindowId: window.id,
          nextRenewalWindowId: nextWindow?.id ?? null,
          ipRightId: window.ipRightId,
        },
      },
    });

    return { nextWindowId: nextWindow?.id ?? null };
  }

  /** Best-effort: draft + issue renewal fees so portal sees the invoice immediately. */
  private async autoInvoiceRenewalFees(input: {
    matterId: string;
    fixedFeeIds: string[];
    userId: string;
    notes: string;
  }) {
    if (input.fixedFeeIds.length === 0) return;

    try {
      const invoice = await this.invoices.createAndIssueFromLines(
        input.matterId,
        {
          fixedFeeIds: input.fixedFeeIds,
          notes: input.notes,
        },
        input.userId,
      );
      this.logger.log(
        `Auto-issued invoice ${invoice.invoiceNumber ?? invoice.id} for renewal fees on matter ${input.matterId}`,
      );
    } catch (err) {
      this.logger.error(
        `Auto-invoice failed for matter ${input.matterId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  private async assertNoParts(windowId: string, message: string) {
    const count = await renewalPartDb(this.prisma).count({
      where: { renewalWindowId: windowId },
    });
    if (count > 0) throw new BadRequestException(message);
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

  private async requireActivePart(partId: string) {
    const part = await renewalPartDb(this.prisma).findUnique({
      where: { id: partId },
      include: {
        renewalWindow: { include: { ipRight: true } },
      },
    });
    if (!part) throw new NotFoundException('Renewal part not found');
    if (
      part.status === RenewalStatus.completed ||
      part.status === RenewalStatus.lapsed
    ) {
      throw new BadRequestException(`Renewal part is already ${part.status}`);
    }
    if (
      part.renewalWindow.status === RenewalStatus.completed ||
      part.renewalWindow.status === RenewalStatus.lapsed
    ) {
      throw new BadRequestException(
        `Renewal window is already ${part.renewalWindow.status}`,
      );
    }
    return part;
  }
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}
