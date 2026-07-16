import {
  InvoiceStatus,
  PaymentStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsRevenueService } from './reports-revenue.service';

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-001',
    issueDate: new Date('2025-06-01'),
    dueDate: new Date('2025-07-01'),
    currency: 'EUR',
    totalAmount: 1000,
    paidAmount: 400,
    paymentStatus: PaymentStatus.partial,
    clientId: 'c1',
    client: {
      id: 'c1',
      companyName: 'Acme Corp',
      firstName: null,
      lastName: null,
      internalCode: 'CL-1',
      type: 'company',
    },
    ...overrides,
  };
}

describe('ReportsRevenueService', () => {
  let service: ReportsRevenueService;
  let prisma: { invoice: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { invoice: { findMany: jest.fn() } };
    service = new ReportsRevenueService(prisma as unknown as PrismaService);
  });

  it('returns zero summary when no invoices', async () => {
    prisma.invoice.findMany.mockResolvedValue([]);

    const result = await service.getRevenueSummary({});

    expect(result.summary.totalInvoiced).toBe(0);
    expect(result.summary.invoiceCount).toBe(0);
    expect(result.byMonth).toEqual([]);
    expect(result.currency).toBe('EUR');
  });

  it('aggregates period invoices and open receivables aging', async () => {
    const periodInvoice = invoiceRow();
    const openInvoice = invoiceRow({
      id: 'inv-2',
      invoiceNumber: 'INV-002',
      issueDate: new Date('2025-05-01'),
      dueDate: new Date('2025-01-01'),
      totalAmount: 500,
      paidAmount: 0,
      paymentStatus: PaymentStatus.unpaid,
      client: {
        id: 'c2',
        companyName: null,
        firstName: 'Jane',
        lastName: 'Doe',
        internalCode: 'CL-2',
        type: 'individual',
      },
    });

    prisma.invoice.findMany
      .mockResolvedValueOnce([periodInvoice])
      .mockResolvedValueOnce([openInvoice]);

    const result = await service.getRevenueSummary({
      from: '2025-01-01',
      to: '2025-12-31',
    });

    expect(result.summary.totalInvoiced).toBe(1000);
    expect(result.summary.totalPaid).toBe(400);
    expect(result.summary.invoiceCount).toBe(1);
    expect(result.summary.openInvoiceCount).toBe(1);
    expect(result.byMonth).toHaveLength(1);
    expect(result.byMonth[0].month).toBe('2025-06');
    expect(result.agingPreview[0].clientName).toBe('Jane Doe');
    expect(result.agingPreview[0].outstanding).toBe(500);
  });

  it('passes clientId filter to prisma queries', async () => {
    prisma.invoice.findMany.mockResolvedValue([]);

    await service.getRevenueSummary({ clientId: 'c1' });

    expect(prisma.invoice.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.invoice.findMany.mock.calls[0][0].where).toMatchObject({
      status: InvoiceStatus.issued,
      clientId: 'c1',
    });
    expect(prisma.invoice.findMany.mock.calls[1][0].where).toMatchObject({
      status: InvoiceStatus.issued,
      clientId: 'c1',
    });
  });
});
