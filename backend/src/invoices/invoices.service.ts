import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Prisma } from '../../generated/prisma/client';
import { PortalAccessService } from '../common/portal-access.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { roundMoney } from '../billing/billing.utils';
import { parseLimit } from '../crm/dto/pagination.dto';
import {
  CreateInvoiceDto,
  ListInvoicesQueryDto,
  RecordPaymentDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';
import { InvoicePdfService } from './invoice-pdf.service';
import { INVOICE_NUMBER_PREFIX } from './invoices.constants';

const userSelect = { id: true, fullName: true, email: true } as const;

const invoiceInclude = {
  client: {
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      internalCode: true,
    },
  },
  matter: { select: { id: true, title: true, matterType: true } },
  createdBy: { select: userSelect },
  payments: {
    orderBy: { paidAt: 'desc' as const },
    include: { recordedBy: { select: userSelect } },
  },
  timeEntries: {
    orderBy: [{ date: 'asc' as const }, { createdAt: 'asc' as const }],
    include: { loggedBy: { select: userSelect } },
  },
  fixedFees: { orderBy: [{ date: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.InvoiceInclude;

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

function decimalToNumber(value: Prisma.Decimal | number) {
  return roundMoney(Number(value));
}

function clientDisplayName(client: InvoiceRow['client']) {
  return (
    client.companyName ||
    [client.firstName, client.lastName].filter(Boolean).join(' ') ||
    client.internalCode ||
    'Client'
  );
}

function serializeInvoice(row: InvoiceRow) {
  return {
    id: row.id,
    clientId: row.clientId,
    matterId: row.matterId,
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currency: row.currency,
    subtotal: decimalToNumber(row.subtotal),
    taxRate: row.taxRate != null ? decimalToNumber(row.taxRate) : null,
    taxAmount: decimalToNumber(row.taxAmount),
    totalAmount: decimalToNumber(row.totalAmount),
    paymentStatus: row.paymentStatus,
    paidAmount: decimalToNumber(row.paidAmount),
    paidAt: row.paidAt,
    pdfStorageKey: row.pdfStorageKey,
    notes: row.notes,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    client: row.client,
    matter: row.matter,
    createdBy: row.createdBy,
    payments: row.payments.map((payment) => ({
      ...payment,
      amount: decimalToNumber(payment.amount),
    })),
    timeEntries: row.timeEntries.map((entry) => ({
      ...entry,
      hours: decimalToNumber(entry.hours),
      rateSnapshot: decimalToNumber(entry.rateSnapshot),
      amount: decimalToNumber(entry.amount),
    })),
    fixedFees: row.fixedFees.map((fee) => ({
      ...fee,
      amount: decimalToNumber(fee.amount),
    })),
  };
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portalAccess: PortalAccessService,
    private readonly pdf: InvoicePdfService,
  ) {}

  async listForMatter(matterId: string) {
    await this.assertMatterExists(matterId);
    const rows = await this.prisma.invoice.findMany({
      where: { matterId },
      orderBy: [{ createdAt: 'desc' }],
      include: invoiceInclude,
    });
    return rows.map(serializeInvoice);
  }

  async listAll(query: ListInvoicesQueryDto) {
    const take = parseLimit(query.limit, 50);
    const search = query.search?.trim();

    const where: Prisma.InvoiceWhereInput = {
      ...(query.status ? { status: query.status } : { status: { not: InvoiceStatus.void } }),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: 'insensitive' } },
              { matter: { title: { contains: search, mode: 'insensitive' } } },
              {
                client: {
                  OR: [
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { internalCode: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.invoice.findMany({
      where,
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: invoiceInclude,
    });

    const hasMore = rows.length > take;
    const items = (hasMore ? rows.slice(0, take) : rows).map(serializeInvoice);

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  async listForPortalClient(clientId: string) {
    const rows = await this.prisma.invoice.findMany({
      where: {
        clientId,
        status: { in: [InvoiceStatus.issued, InvoiceStatus.void] },
      },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      include: invoiceInclude,
    });
    return rows
      .filter((row) => row.status === InvoiceStatus.issued)
      .map(serializeInvoice);
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const row = await this.getInvoiceOrThrow(id);
    await this.assertInvoiceAccess(row, user);
    return serializeInvoice(row);
  }

  async createDraft(matterId: string, dto: CreateInvoiceDto, userId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true, clientId: true, title: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        matterId,
        isBillable: true,
        invoiceId: null,
        ...(dto.timeEntryIds?.length ? { id: { in: dto.timeEntryIds } } : {}),
      },
    });

    const fixedFees = await this.prisma.fixedFee.findMany({
      where: {
        matterId,
        isBillable: true,
        invoiceId: null,
        ...(dto.fixedFeeIds?.length ? { id: { in: dto.fixedFeeIds } } : {}),
      },
    });

    if (timeEntries.length === 0 && fixedFees.length === 0) {
      throw new BadRequestException('No unbilled billable lines to invoice');
    }

    const subtotal = roundMoney(
      timeEntries.reduce((sum, row) => sum + Number(row.amount), 0) +
        fixedFees.reduce((sum, row) => sum + Number(row.amount), 0),
    );
    const taxRate = dto.taxRate ?? null;
    const taxAmount = taxRate != null ? roundMoney(subtotal * (taxRate / 100)) : 0;
    const totalAmount = roundMoney(subtotal + taxAmount);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          clientId: matter.clientId,
          matterId,
          status: InvoiceStatus.draft,
          currency: 'EUR',
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          notes: dto.notes?.trim() || null,
          createdById: userId,
        },
      });

      await tx.timeEntry.updateMany({
        where: { id: { in: timeEntries.map((row) => row.id) } },
        data: { invoiceId: created.id },
      });
      await tx.fixedFee.updateMany({
        where: { id: { in: fixedFees.map((row) => row.id) } },
        data: { invoiceId: created.id },
      });

      return tx.invoice.findUniqueOrThrow({
        where: { id: created.id },
        include: invoiceInclude,
      });
    });

    return serializeInvoice(invoice);
  }

  async updateDraft(id: string, dto: UpdateInvoiceDto) {
    const existing = await this.getInvoiceOrThrow(id);
    if (existing.status !== InvoiceStatus.draft) {
      throw new BadRequestException('Only draft invoices can be edited');
    }

    const subtotal = decimalToNumber(existing.subtotal);
    const taxRate = dto.taxRate !== undefined ? dto.taxRate : existing.taxRate != null ? decimalToNumber(existing.taxRate) : null;
    const taxAmount = taxRate != null ? roundMoney(subtotal * (taxRate / 100)) : 0;
    const totalAmount = roundMoney(subtotal + taxAmount);

    const row = await this.prisma.invoice.update({
      where: { id },
      data: {
        taxRate: dto.taxRate,
        taxAmount,
        totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes?.trim(),
      },
      include: invoiceInclude,
    });

    return serializeInvoice(row);
  }

  /**
   * Create a draft from specific unbilled lines and issue it (PDF + portal).
   * Used by renewal completion automation.
   */
  async createAndIssueFromLines(
    matterId: string,
    input: {
      fixedFeeIds?: string[];
      timeEntryIds?: string[];
      notes?: string;
      taxRate?: number;
    },
    userId: string,
  ) {
    if (!input.fixedFeeIds?.length && !input.timeEntryIds?.length) {
      throw new BadRequestException('No lines provided to invoice');
    }

    const draft = await this.createDraft(
      matterId,
      {
        fixedFeeIds: input.fixedFeeIds,
        timeEntryIds: input.timeEntryIds,
        notes: input.notes,
        taxRate: input.taxRate,
      },
      userId,
    );

    return this.issue(draft.id);
  }

  async issue(id: string) {
    const existing = await this.getInvoiceOrThrow(id);
    if (existing.status !== InvoiceStatus.draft) {
      throw new BadRequestException('Only draft invoices can be issued');
    }

    const invoiceNumber = await this.nextInvoiceNumber();
    const issueDate = new Date();

    const issued = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.issued,
        invoiceNumber,
        issueDate,
      },
      include: invoiceInclude,
    });

    const pdfStorageKey = await this.pdf.generateAndStore(id, {
      invoiceNumber,
      issueDate: issueDate.toISOString().slice(0, 10),
      dueDate: issued.dueDate ? issued.dueDate.toISOString().slice(0, 10) : null,
      clientName: clientDisplayName(issued.client),
      matterTitle: issued.matter.title,
      currency: issued.currency,
      subtotal: decimalToNumber(issued.subtotal),
      taxRate: issued.taxRate != null ? decimalToNumber(issued.taxRate) : null,
      taxAmount: decimalToNumber(issued.taxAmount),
      totalAmount: decimalToNumber(issued.totalAmount),
      timeEntries: issued.timeEntries.map((entry) => ({
        date: entry.date.toISOString().slice(0, 10),
        description: entry.description,
        hours: decimalToNumber(entry.hours),
        amount: decimalToNumber(entry.amount),
      })),
      fixedFees: issued.fixedFees.map((fee) => ({
        date: fee.date.toISOString().slice(0, 10),
        description: fee.description,
        category: fee.category,
        amount: decimalToNumber(fee.amount),
      })),
      notes: issued.notes,
    });

    const row = await this.prisma.invoice.update({
      where: { id },
      data: { pdfStorageKey },
      include: invoiceInclude,
    });

    return serializeInvoice(row);
  }

  async voidInvoice(id: string) {
    const existing = await this.getInvoiceOrThrow(id);
    if (existing.status === InvoiceStatus.void) {
      throw new BadRequestException('Invoice is already void');
    }
    if (
      existing.status === InvoiceStatus.issued &&
      existing.paymentStatus !== PaymentStatus.unpaid
    ) {
      throw new BadRequestException('Cannot void an invoice with payments recorded');
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.timeEntry.updateMany({
        where: { invoiceId: id },
        data: { invoiceId: null },
      });
      await tx.fixedFee.updateMany({
        where: { invoiceId: id },
        data: { invoiceId: null },
      });

      return tx.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.void },
        include: invoiceInclude,
      });
    });

    return serializeInvoice(row);
  }

  async recordPayment(id: string, dto: RecordPaymentDto, userId: string) {
    const existing = await this.getInvoiceOrThrow(id);
    if (existing.status !== InvoiceStatus.issued) {
      throw new BadRequestException('Payments can only be recorded on issued invoices');
    }

    const totalAmount = decimalToNumber(existing.totalAmount);
    const currentPaid = decimalToNumber(existing.paidAmount);
    const nextPaid = roundMoney(currentPaid + dto.amount);

    if (nextPaid > totalAmount) {
      throw new BadRequestException('Payment exceeds invoice total');
    }

    const paymentStatus =
      nextPaid >= totalAmount
        ? PaymentStatus.paid
        : nextPaid > 0
          ? PaymentStatus.partial
          : PaymentStatus.unpaid;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.invoicePayment.create({
        data: {
          invoiceId: id,
          amount: dto.amount,
          paidAt: new Date(dto.paidAt),
          method: dto.method?.trim() || null,
          reference: dto.reference?.trim() || null,
          recordedById: userId,
        },
      });

      return tx.invoice.update({
        where: { id },
        data: {
          paidAmount: nextPaid,
          paymentStatus,
          paidAt: paymentStatus === PaymentStatus.paid ? new Date(dto.paidAt) : existing.paidAt,
        },
        include: invoiceInclude,
      });
    });

    return serializeInvoice(row);
  }

  async getPdfDownload(id: string, user: AuthenticatedUser) {
    const invoice = await this.getInvoiceOrThrow(id);
    await this.assertInvoiceAccess(invoice, user);

    if (invoice.status !== InvoiceStatus.issued || !invoice.pdfStorageKey) {
      throw new BadRequestException('Invoice PDF is not available');
    }

    const url = await this.pdf.getDownloadUrl(invoice.pdfStorageKey);
    const { fileName, mimeType } = InvoicePdfService.resolveDownloadMeta(
      invoice.pdfStorageKey,
      invoice.invoiceNumber,
    );
    return {
      url,
      fileName,
      mimeType,
      clientId: invoice.clientId,
    };
  }

  private async nextInvoiceNumber() {
    const year = new Date().getFullYear();
    const sequence = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.invoiceSequence.findUnique({ where: { year } });
      if (!existing) {
        return tx.invoiceSequence.create({
          data: { year, lastNumber: 1 },
        });
      }
      return tx.invoiceSequence.update({
        where: { year },
        data: { lastNumber: existing.lastNumber + 1 },
      });
    });

    return `${INVOICE_NUMBER_PREFIX}-${year}-${String(sequence.lastNumber).padStart(4, '0')}`;
  }

  private async getInvoiceOrThrow(id: string) {
    const row = await this.prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });
    if (!row) throw new NotFoundException('Invoice not found');
    return row;
  }

  private async assertMatterExists(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }

  private async assertInvoiceAccess(invoice: InvoiceRow, user: AuthenticatedUser) {
    const scopeClientId = this.portalAccess.requireScopeClientId(user);
    if (!scopeClientId) return;
    if (invoice.clientId !== scopeClientId) {
      throw new ForbiddenException('You do not have access to this invoice');
    }
    if (invoice.status !== InvoiceStatus.issued) {
      throw new ForbiddenException('You do not have access to this invoice');
    }
  }
}
