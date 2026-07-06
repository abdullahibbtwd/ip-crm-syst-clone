import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFixedFeeDto,
  CreateRateCardDto,
  CreateTimeEntryDto,
  UpdateFixedFeeDto,
  UpdateRateCardDto,
  UpdateTimeEntryDto,
} from './dto/billing.dto';
import { RateResolutionService } from './rate-resolution.service';
import {
  assertBillableHasRate,
  assertQuarterHourIncrement,
  computeTimeEntryAmount,
  decimalToNumber,
  roundMoney,
} from './billing.utils';

const userSelect = { id: true, fullName: true, email: true } as const;

const timeEntryInclude = {
  loggedBy: { select: userSelect },
} satisfies Prisma.TimeEntryInclude;

function serializeTimeEntry(row: Prisma.TimeEntryGetPayload<{
  include: typeof timeEntryInclude;
}>) {
  return {
    ...row,
    hours: decimalToNumber(row.hours),
    rateSnapshot: decimalToNumber(row.rateSnapshot),
    amount: decimalToNumber(row.amount),
    isUnrated: row.isBillable && decimalToNumber(row.rateSnapshot) === 0,
  };
}

function serializeFixedFee(row: {
  id: string;
  matterId: string;
  description: string;
  amount: Prisma.Decimal;
  currency: string;
  category: string;
  date: Date;
  isBillable: boolean;
  invoiceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    amount: decimalToNumber(row.amount),
  };
}

function serializeRateCard(row: {
  id: string;
  role: string;
  matterType: string | null;
  clientId: string | null;
  hourlyRate: Prisma.Decimal;
  currency: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    hourlyRate: decimalToNumber(row.hourlyRate),
  };
}

type BillingSummaryRow = {
  matter_id: string;
  total_hours: string | number;
  total_billable_hours: string | number;
  total_billable_amount: string | number;
  total_fixed_fees: string | number;
  total_amount: string | number;
  unbilled_amount: string | number;
};

type ClientMatterBillingRow = BillingSummaryRow & {
  title: string;
  matter_type: string;
  status: string;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateResolution: RateResolutionService,
  ) {}

  // --- Rate cards ---

  listRateCards() {
    return this.prisma.rateCard.findMany({
      orderBy: [{ role: 'asc' }, { matterType: 'asc' }, { effectiveFrom: 'desc' }],
      include: {
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
    }).then((rows) => rows.map(serializeRateCard));
  }

  createRateCard(dto: CreateRateCardDto) {
    return this.prisma.rateCard
      .create({
        data: {
          role: dto.role,
          matterType: dto.matterType,
          clientId: dto.clientId,
          hourlyRate: dto.hourlyRate,
          currency: dto.currency ?? 'EUR',
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        },
      })
      .then(serializeRateCard);
  }

  async updateRateCard(id: string, dto: UpdateRateCardDto) {
    await this.assertRateCardExists(id);
    return this.prisma.rateCard
      .update({
        where: { id },
        data: {
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
          hourlyRate: dto.hourlyRate,
        },
      })
      .then(serializeRateCard);
  }

  resolveRate(matterId: string, userRoles: string[], roleOverride?: string) {
    return this.rateResolution.resolveForMatter({
      matterId,
      userRoles,
      roleOverride: roleOverride as never,
    });
  }

  // --- Time entries ---

  async listTimeEntries(matterId: string) {
    await this.assertMatterExists(matterId);
    const rows = await this.prisma.timeEntry.findMany({
      where: { matterId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: timeEntryInclude,
    });
    return rows.map(serializeTimeEntry);
  }

  async createTimeEntry(
    matterId: string,
    dto: CreateTimeEntryDto,
    userId: string,
    userRoles: string[],
  ) {
    await this.assertMatterExists(matterId);
    try {
      assertQuarterHourIncrement(dto.hours);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid hours',
      );
    }

    const isBillable = dto.isBillable ?? true;
    const entryDate = new Date(dto.date);

    let rateSnapshot = dto.rateSnapshot ?? null;
    let isUnrated = false;
    let effectiveBillable = isBillable;

    if (rateSnapshot == null) {
      const resolved = await this.rateResolution.resolveForMatter({
        matterId,
        userRoles,
        asOfDate: entryDate,
      });
      rateSnapshot = resolved.hourlyRate;
      isUnrated = resolved.isUnrated;
      if (resolved.isUnrated) {
        effectiveBillable = false;
      }
    } else {
      isUnrated = isBillable && rateSnapshot === 0;
      try {
        assertBillableHasRate(isBillable, rateSnapshot);
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'Invalid rate',
        );
      }
    }

    const amount = computeTimeEntryAmount(
      dto.hours,
      rateSnapshot,
      effectiveBillable,
    );

    const row = await this.prisma.timeEntry.create({
      data: {
        matterId,
        loggedById: userId,
        date: entryDate,
        hours: dto.hours,
        description: dto.description.trim(),
        isBillable: effectiveBillable,
        rateSnapshot,
        amount,
      },
      include: timeEntryInclude,
    });

    return { ...serializeTimeEntry(row), isUnrated };
  }

  async updateTimeEntry(id: string, dto: UpdateTimeEntryDto) {
    const existing = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Time entry not found');
    this.assertNotInvoiced(existing.invoiceId, 'Time entry');

    if (dto.hours != null) {
      try {
        assertQuarterHourIncrement(dto.hours);
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : 'Invalid hours',
        );
      }
    }

    const hours = dto.hours ?? decimalToNumber(existing.hours);
    const isBillable = dto.isBillable ?? existing.isBillable;
    const rateSnapshot =
      dto.rateSnapshot ?? decimalToNumber(existing.rateSnapshot);
    try {
      assertBillableHasRate(isBillable, rateSnapshot);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Invalid rate',
      );
    }
    const amount = computeTimeEntryAmount(hours, rateSnapshot, isBillable);

    const row = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        hours: dto.hours,
        description: dto.description?.trim(),
        isBillable: dto.isBillable,
        rateSnapshot: dto.rateSnapshot,
        amount,
      },
      include: timeEntryInclude,
    });

    return serializeTimeEntry(row);
  }

  async deleteTimeEntry(id: string) {
    const existing = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Time entry not found');
    this.assertNotInvoiced(existing.invoiceId, 'Time entry');
    await this.prisma.timeEntry.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Fixed fees ---

  async listFixedFees(matterId: string) {
    await this.assertMatterExists(matterId);
    const rows = await this.prisma.fixedFee.findMany({
      where: { matterId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializeFixedFee);
  }

  async createFixedFee(matterId: string, dto: CreateFixedFeeDto) {
    await this.assertMatterExists(matterId);
    const row = await this.prisma.fixedFee.create({
      data: {
        matterId,
        description: dto.description.trim(),
        amount: dto.amount,
        currency: dto.currency ?? 'EUR',
        category: dto.category,
        date: new Date(dto.date),
        isBillable: dto.isBillable ?? true,
      },
    });
    return serializeFixedFee(row);
  }

  async updateFixedFee(id: string, dto: UpdateFixedFeeDto) {
    const existing = await this.prisma.fixedFee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fixed fee not found');
    this.assertNotInvoiced(existing.invoiceId, 'Fixed fee');

    const row = await this.prisma.fixedFee.update({
      where: { id },
      data: {
        description: dto.description?.trim(),
        amount: dto.amount,
        category: dto.category,
        date: dto.date ? new Date(dto.date) : undefined,
        isBillable: dto.isBillable,
      },
    });
    return serializeFixedFee(row);
  }

  async deleteFixedFee(id: string) {
    const existing = await this.prisma.fixedFee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fixed fee not found');
    this.assertNotInvoiced(existing.invoiceId, 'Fixed fee');
    await this.prisma.fixedFee.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Summary ---

  async getBillingSummary(matterId: string) {
    await this.assertMatterExists(matterId);
    const rows = await this.prisma.$queryRaw<BillingSummaryRow[]>`
      SELECT * FROM billing_summary WHERE matter_id = ${matterId}::uuid
    `;
    const row = rows[0];
    if (!row) {
      return {
        matterId,
        totalHours: 0,
        totalBillableHours: 0,
        totalBillableAmount: 0,
        totalFixedFees: 0,
        totalAmount: 0,
        unbilledAmount: 0,
      };
    }
    return this.serializeBillingSummaryRow(row);
  }

  async getClientBillingSummary(clientId: string) {
    await this.assertClientExists(clientId);
    const rows = await this.prisma.$queryRaw<ClientMatterBillingRow[]>`
      SELECT
        m.id AS matter_id,
        m.title,
        m.matter_type,
        m.status,
        COALESCE(bs.total_hours, 0)::decimal(12, 2) AS total_hours,
        COALESCE(bs.total_billable_hours, 0)::decimal(12, 2) AS total_billable_hours,
        COALESCE(bs.total_billable_amount, 0)::decimal(12, 2) AS total_billable_amount,
        COALESCE(bs.total_fixed_fees, 0)::decimal(12, 2) AS total_fixed_fees,
        COALESCE(bs.total_amount, 0)::decimal(12, 2) AS total_amount,
        COALESCE(bs.unbilled_amount, 0)::decimal(12, 2) AS unbilled_amount
      FROM matters m
      LEFT JOIN billing_summary bs ON bs.matter_id = m.id
      WHERE m.client_id = ${clientId}::uuid
      ORDER BY m.title ASC
    `;

    const matters = rows.map((row) => ({
      ...this.serializeBillingSummaryRow(row),
      title: row.title,
      matterType: row.matter_type,
      status: row.status,
    }));

    const totals = matters.reduce(
      (acc, matter) => ({
        totalHours: roundMoney(acc.totalHours + matter.totalHours),
        totalBillableHours: roundMoney(
          acc.totalBillableHours + matter.totalBillableHours,
        ),
        totalBillableAmount: roundMoney(
          acc.totalBillableAmount + matter.totalBillableAmount,
        ),
        totalFixedFees: roundMoney(acc.totalFixedFees + matter.totalFixedFees),
        totalAmount: roundMoney(acc.totalAmount + matter.totalAmount),
        unbilledAmount: roundMoney(acc.unbilledAmount + matter.unbilledAmount),
      }),
      {
        totalHours: 0,
        totalBillableHours: 0,
        totalBillableAmount: 0,
        totalFixedFees: 0,
        totalAmount: 0,
        unbilledAmount: 0,
      },
    );

    return { clientId, totals, matters };
  }

  private serializeBillingSummaryRow(row: BillingSummaryRow) {
    return {
      matterId: row.matter_id,
      totalHours: roundMoney(Number(row.total_hours)),
      totalBillableHours: roundMoney(Number(row.total_billable_hours)),
      totalBillableAmount: roundMoney(Number(row.total_billable_amount)),
      totalFixedFees: roundMoney(Number(row.total_fixed_fees)),
      totalAmount: roundMoney(Number(row.total_amount)),
      unbilledAmount: roundMoney(Number(row.unbilled_amount)),
    };
  }

  private assertNotInvoiced(invoiceId: string | null, label: string) {
    if (invoiceId) {
      throw new ForbiddenException(`${label} is invoiced and cannot be changed`);
    }
  }

  private async assertMatterExists(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }

  private async assertClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client not found');
  }

  private async assertRateCardExists(id: string) {
    const card = await this.prisma.rateCard.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!card) throw new NotFoundException('Rate card not found');
  }
}
