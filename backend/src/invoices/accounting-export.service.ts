import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { roundMoney } from '../billing/billing.utils';
import {
  AccountingExportFormat,
  AccountingExportQueryDto,
} from './dto/invoice.dto';

const exportInclude = {
  client: {
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      internalCode: true,
    },
  },
  matter: { select: { id: true, title: true } },
} satisfies Prisma.InvoiceInclude;

type ExportInvoice = Prisma.InvoiceGetPayload<{ include: typeof exportInclude }>;

function clientName(client: ExportInvoice['client']) {
  return (
    client.companyName ||
    [client.firstName, client.lastName].filter(Boolean).join(' ') ||
    client.internalCode ||
    'Client'
  );
}

function formatDate(value: Date | null | undefined) {
  if (!value) return '';
  return value.toISOString().slice(0, 10);
}

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function toCsv(headers: string[], rows: Array<Array<string | number>>) {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];
  return lines.join('\n') + '\n';
}

const REVENUE_ACCOUNT = '4000';
const DEFAULT_TAX_TYPE = 'None';

@Injectable()
export class AccountingExportService {
  constructor(private readonly prisma: PrismaService) {}

  async export(query: AccountingExportQueryDto) {
    const where: Prisma.InvoiceWhereInput = {
      status: InvoiceStatus.issued,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.from || query.to
        ? {
            issueDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: [{ issueDate: 'asc' }, { invoiceNumber: 'asc' }],
      include: exportInclude,
    });

    const format = query.format;
    const stamp = new Date().toISOString().slice(0, 10);
    const csv = this.buildCsv(format, invoices);
    const filename = `accounting-${format}-${stamp}.csv`;

    return { csv, filename, format, count: invoices.length };
  }

  private buildCsv(format: AccountingExportFormat, invoices: ExportInvoice[]) {
    switch (format) {
      case 'journal':
        return this.journalCsv(invoices);
      case 'xero':
        return this.xeroCsv(invoices);
      case 'quickbooks':
        return this.quickbooksCsv(invoices);
    }
  }

  private journalCsv(invoices: ExportInvoice[]) {
    const headers = [
      'Date',
      'Reference',
      'Description',
      'Account',
      'Debit',
      'Credit',
      'TaxAmount',
      'Currency',
      'Client',
      'Matter',
    ];
    const rows: Array<Array<string | number>> = [];

    for (const inv of invoices) {
      const total = roundMoney(Number(inv.totalAmount));
      const tax = roundMoney(Number(inv.taxAmount));
      const name = clientName(inv.client);
      const ref = inv.invoiceNumber ?? inv.id;
      const desc = `Invoice ${ref} — ${inv.matter.title}`;
      const date = formatDate(inv.issueDate);

      rows.push([
        date,
        ref,
        desc,
        REVENUE_ACCOUNT,
        '',
        total,
        tax,
        inv.currency,
        name,
        inv.matter.title,
      ]);
      rows.push([
        date,
        ref,
        desc,
        '1200',
        total,
        '',
        tax,
        inv.currency,
        name,
        inv.matter.title,
      ]);
    }

    return toCsv(headers, rows);
  }

  private xeroCsv(invoices: ExportInvoice[]) {
    const headers = [
      '*ContactName',
      '*InvoiceNumber',
      '*InvoiceDate',
      '*DueDate',
      'Description',
      '*Quantity',
      '*UnitAmount',
      '*AccountCode',
      '*TaxType',
      'Currency',
    ];
    const rows = invoices.map((inv) => {
      const subtotal = roundMoney(Number(inv.subtotal));
      const taxType =
        Number(inv.taxAmount) > 0 ? 'Tax on Sales' : DEFAULT_TAX_TYPE;
      return [
        clientName(inv.client),
        inv.invoiceNumber ?? inv.id,
        formatDate(inv.issueDate),
        formatDate(inv.dueDate),
        inv.matter.title,
        1,
        subtotal,
        REVENUE_ACCOUNT,
        taxType,
        inv.currency,
      ];
    });
    return toCsv(headers, rows);
  }

  private quickbooksCsv(invoices: ExportInvoice[]) {
    const headers = [
      'Date',
      'Invoice No',
      'Customer',
      'Memo',
      'Account',
      'Amount',
      'Tax Amount',
      'Currency',
    ];
    const rows = invoices.map((inv) => [
      formatDate(inv.issueDate),
      inv.invoiceNumber ?? inv.id,
      clientName(inv.client),
      inv.matter.title,
      REVENUE_ACCOUNT,
      roundMoney(Number(inv.totalAmount)),
      roundMoney(Number(inv.taxAmount)),
      inv.currency,
    ]);
    return toCsv(headers, rows);
  }
}
