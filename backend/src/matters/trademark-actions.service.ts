import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FixedFeeCategory,
  MatterTimelineEventType,
  MatterType,
  Prisma,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BillingService } from '../billing/billing.service';
import { DeadlinesService } from '../deadlines/deadlines.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { TrademarkActionDto } from './dto/trademark-action.dto';
import {
  TRADEMARK_ACTION_TITLES,
  TRADEMARK_SECONDARY_ACTION_KINDS,
  type TrademarkActionKind,
} from './trademark-actions.constants';
import {
  goodsSummary,
  isIsoDateBefore,
  niceClassesFromGoods,
  normalizeGoodsAndServices,
  subtractReminderOffset,
} from './trademark-action.utils';
import { MattersService } from './matters.service';

const matterDetailInclude = {
  assignedTo: { select: { id: true, fullName: true, email: true } },
  jurisdictions: true,
  client: true,
  applicantClient: true,
  intermediaryClient: true,
  filedBy: { select: { id: true, fullName: true, email: true } },
  attributes: true,
  ipRights: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.MatterInclude;

@Injectable()
export class TrademarkActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mattersService: MattersService,
    private readonly deadlinesService: DeadlinesService,
    private readonly billingService: BillingService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async record(
    matterId: string,
    dto: TrademarkActionDto,
    user: AuthenticatedUser,
  ) {
    const matter = await this.mattersService.findOne(matterId, user);
    if (matter.matterType !== MatterType.trademark) {
      throw new BadRequestException(
        'Trademark actions are only available on trademark files',
      );
    }

    if (dto.documentVersionId) {
      await this.assertDocumentVersionOnMatter(matterId, dto.documentVersionId);
    }

    const isScope = dto.kind === 'scope_correction';
    if (isScope) {
      this.assertScopeFields(dto);
    } else {
      this.assertSecondaryFields(dto);
    }

    const existingAttrs = (matter.attributes?.attributes ?? {}) as Record<
      string,
      unknown
    >;
    const nextAttrs: Record<string, unknown> = { ...existingAttrs };

    let classSummary: string | undefined;
    if (isScope && dto.goodsAndServices) {
      const rows = normalizeGoodsAndServices(dto.goodsAndServices);
      nextAttrs.goodsAndServices = rows;
      nextAttrs.niceClasses = niceClassesFromGoods(rows);
      const summary = goodsSummary(rows);
      nextAttrs.markDescription = summary || undefined;
      classSummary = summary;
    }

    const legalBasisLabel = this.legalBasisLabel(dto);
    const historyEntry = {
      id: randomUUID(),
      kind: dto.kind,
      occurredAt: new Date().toISOString(),
      incomingReferenceNumber: dto.incomingReferenceNumber?.trim() || undefined,
      filingDate: dto.filingDate,
      legalBasis: legalBasisLabel,
      documentVersionId: dto.documentVersionId,
      generateProforma: dto.generateProforma ?? false,
      governmentFeeAmount: dto.governmentFeeAmount,
      governmentFeeCurrency: dto.governmentFeeCurrency,
      paymentDueDate: dto.paymentDueDate,
      filingDeadline: dto.filingDeadline,
    };
    const prevHistory = Array.isArray(nextAttrs.trademarkActions)
      ? nextAttrs.trademarkActions
      : [];
    nextAttrs.trademarkActions = [...prevHistory, historyEntry];

    const title = TRADEMARK_ACTION_TITLES[dto.kind];
    const description = this.buildDescription(dto, legalBasisLabel, classSummary);

    await this.prisma.$transaction(async (tx) => {
      await tx.matterAttributes.upsert({
        where: { matterId },
        create: {
          matterId,
          attributes: nextAttrs as Prisma.InputJsonValue,
        },
        update: { attributes: nextAttrs as Prisma.InputJsonValue },
      });

      await tx.matterTimelineEvent.create({
        data: {
          matterId,
          eventType: MatterTimelineEventType.note,
          title,
          description,
          occurredAt: dto.filingDate ? new Date(dto.filingDate) : new Date(),
          createdById: user.userId,
          metadata: {
            kind: dto.kind,
            incomingReferenceNumber: dto.incomingReferenceNumber ?? null,
            legalBasis: legalBasisLabel,
            documentVersionId: dto.documentVersionId ?? null,
            generateProforma: dto.generateProforma ?? false,
          } as Prisma.InputJsonValue,
        },
      });
    });

    const jurisdiction =
      matter.jurisdictions[0]?.countryCode?.trim() || 'BG';
    const assignedToId = matter.assignedTo?.id ?? user.userId;
    const deadlineIds: string[] = [];

    if (!isScope) {
      const created = await this.createActionDeadlines({
        matterId,
        kind: dto.kind,
        jurisdiction,
        assignedToId,
        userId: user.userId,
        dto,
      });
      deadlineIds.push(...created);
    }

    let invoiceId: string | undefined;
    if (!isScope && (dto.generateProforma || (dto.governmentFeeAmount ?? 0) > 0)) {
      invoiceId = await this.createBillingArtifacts({
        matterId,
        kind: dto.kind,
        title,
        userId: user.userId,
        dto,
      });
    }

    const updated = await this.prisma.matter.findUniqueOrThrow({
      where: { id: matterId },
      include: matterDetailInclude,
    });

    return {
      matter: updated,
      invoiceId: invoiceId ?? null,
      deadlineIds,
    };
  }

  private assertScopeFields(dto: TrademarkActionDto) {
    if (!dto.goodsAndServices || dto.goodsAndServices.length === 0) {
      throw new BadRequestException('At least one Nice class is required');
    }
    if (!dto.incomingReferenceNumber?.trim()) {
      throw new BadRequestException('Incoming reference number is required');
    }
    if (!dto.filingDate) {
      throw new BadRequestException('Filing date is required');
    }
    if (!dto.legalBasis) {
      throw new BadRequestException('Legal basis is required');
    }
  }

  private assertSecondaryFields(dto: TrademarkActionDto) {
    if (
      !(TRADEMARK_SECONDARY_ACTION_KINDS as readonly string[]).includes(dto.kind)
    ) {
      throw new BadRequestException('Unknown secondary action');
    }
    if (dto.generateProforma && !(dto.governmentFeeAmount && dto.governmentFeeAmount > 0)) {
      throw new BadRequestException(
        'Government fee is required to generate a proforma invoice',
      );
    }
  }

  private legalBasisLabel(dto: TrademarkActionDto): string | undefined {
    if (!dto.legalBasis) return undefined;
    if (dto.legalBasis === 'other') {
      return dto.legalBasisOther?.trim() || 'Other';
    }
    const labels: Record<string, string> = {
      opposition_settlement: 'Opposition Settlement',
      office_action_response: 'Office Action Response',
      voluntary_limitation: 'Voluntary Limitation',
      correction_of_error: 'Correction of Error',
    };
    return labels[dto.legalBasis] ?? dto.legalBasis;
  }

  private buildDescription(
    dto: TrademarkActionDto,
    legalBasisLabel: string | undefined,
    classSummary: string | undefined,
  ): string {
    const lines: string[] = [];
    if (dto.incomingReferenceNumber?.trim()) {
      lines.push(`Incoming number: ${dto.incomingReferenceNumber.trim()}`);
    }
    if (dto.filingDate) {
      lines.push(`Date: ${dto.filingDate}`);
    }
    if (legalBasisLabel) {
      lines.push(`Legal basis: ${legalBasisLabel}`);
    }
    if (classSummary) {
      lines.push(classSummary);
    }
    if (dto.generateProforma) {
      lines.push('Proforma invoice requested');
    }
    if (dto.governmentFeeAmount && dto.governmentFeeAmount > 0) {
      lines.push(
        `Government fee: ${dto.governmentFeeAmount} ${dto.governmentFeeCurrency ?? 'EUR'}`,
      );
    }
    return lines.join('\n') || TRADEMARK_ACTION_TITLES[dto.kind];
  }

  private async createActionDeadlines(input: {
    matterId: string;
    kind: TrademarkActionKind;
    jurisdiction: string;
    assignedToId: string;
    userId: string;
    dto: TrademarkActionDto;
  }): Promise<string[]> {
    const ids: string[] = [];
    const actionTitle = TRADEMARK_ACTION_TITLES[input.kind];

    const addDeadline = async (
      title: string,
      dueDate: string,
      notes?: string,
    ) => {
      const created = await this.deadlinesService.createManual(
        {
          matterId: input.matterId,
          title,
          jurisdiction: input.jurisdiction,
          dueDate,
          assignedToId: input.assignedToId,
          notes,
        },
        input.userId,
      );
      ids.push(created.id);
    };

    if (input.dto.paymentDueDate) {
      await addDeadline(
        `Payment deadline — ${actionTitle}`,
        input.dto.paymentDueDate,
      );
      const reminderDate = this.reminderDate(
        input.dto.paymentDueDate,
        input.dto.paymentReminder,
      );
      if (reminderDate) {
        await addDeadline(
          `Payment reminder — ${actionTitle}`,
          reminderDate,
          this.reminderNote(input.dto.paymentReminder),
        );
      }
    }

    if (input.dto.filingDeadline) {
      await addDeadline(
        `Filing / action deadline — ${actionTitle}`,
        input.dto.filingDeadline,
      );
      const reminderDate = this.reminderDate(
        input.dto.filingDeadline,
        input.dto.filingReminder,
      );
      if (reminderDate) {
        await addDeadline(
          `Filing reminder — ${actionTitle}`,
          reminderDate,
          this.reminderNote(input.dto.filingReminder),
        );
      }
    }

    return ids;
  }

  private reminderDate(
    dueDate: string,
    reminder?: { unit: 'months' | 'days'; amount: number },
  ): string | null {
    if (!reminder || reminder.amount <= 0) return null;
    const date = subtractReminderOffset(dueDate, reminder.unit, reminder.amount);
    if (!isIsoDateBefore(date, dueDate)) return null;
    return date;
  }

  private reminderNote(reminder?: {
    unit: 'months' | 'days';
    amount: number;
  }): string | undefined {
    if (!reminder || reminder.amount <= 0) return undefined;
    return `Alert ${reminder.amount} ${reminder.unit} before the deadline`;
  }

  private async createBillingArtifacts(input: {
    matterId: string;
    kind: TrademarkActionKind;
    title: string;
    userId: string;
    dto: TrademarkActionDto;
  }): Promise<string | undefined> {
    const amount = input.dto.governmentFeeAmount ?? 0;
    if (amount <= 0) return undefined;

    const fee = await this.billingService.createFixedFee(input.matterId, {
      description: `Government fee — ${input.title}`,
      amount,
      currency: input.dto.governmentFeeCurrency ?? 'EUR',
      category: FixedFeeCategory.disbursement,
      date: new Date().toISOString().slice(0, 10),
      isBillable: true,
    });

    if (!input.dto.generateProforma) return undefined;

    const invoice = await this.invoicesService.createDraft(
      input.matterId,
      {
        fixedFeeIds: [fee.id],
        timeEntryIds: [],
        dueDate: input.dto.paymentDueDate,
        notes: `Proforma invoice — ${input.title}`,
      },
      input.userId,
    );
    return invoice.id;
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
      throw new NotFoundException('Document version not found on this matter');
    }
  }
}
