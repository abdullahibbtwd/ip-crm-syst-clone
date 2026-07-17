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

  describe('extended branch coverage', () => {
    it('aggregates unpaid and paid invoices into payment status totals', async () => {
      prisma.invoice.findMany
        .mockResolvedValueOnce([
          invoiceRow({
            id: 'inv-u',
            totalAmount: 200,
            paidAmount: 0,
            paymentStatus: PaymentStatus.unpaid,
          }),
          invoiceRow({
            id: 'inv-p',
            totalAmount: 300,
            paidAmount: 300,
            paymentStatus: PaymentStatus.paid,
          }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getRevenueSummary({
        from: '2025-01-01',
        to: '2025-12-31',
      });

      expect(result.summary.byPaymentStatus.unpaid.count).toBe(1);
      expect(result.summary.byPaymentStatus.paid.count).toBe(1);
      expect(result.summary.totalInvoiced).toBe(500);
      expect(result.summary.totalPaid).toBe(300);
    });

    it('uses default rolling 12-month period when from is omitted', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      const result = await service.getRevenueSummary({ to: '2025-12-31' });
      expect(result.period.from).toBeTruthy();
      expect(result.period.to).toContain('2025');
    });

    it('falls back to internalCode for client display name', async () => {
      prisma.invoice.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          invoiceRow({
            id: 'inv-open',
            totalAmount: 100,
            paidAmount: 0,
            paymentStatus: PaymentStatus.unpaid,
            dueDate: new Date('2020-01-01'),
            client: {
              id: 'c3',
              companyName: null,
              firstName: null,
              lastName: null,
              internalCode: 'CL-ONLY',
              type: 'individual',
            },
          }),
        ]);

      const result = await service.getRevenueSummary({});
      expect(result.agingPreview[0].clientName).toBe('CL-ONLY');
    });

    it('skips fully paid open invoices from aging preview', async () => {
      prisma.invoice.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          invoiceRow({
            id: 'inv-zero',
            totalAmount: 100,
            paidAmount: 100,
            paymentStatus: PaymentStatus.paid,
          }),
        ]);

      const result = await service.getRevenueSummary({});
      expect(result.agingPreview).toEqual([]);
      expect(result.summary.openInvoiceCount).toBe(0);
    });

    it('classifies aging buckets for overdue30 and overdue90plus', async () => {
      const now = new Date();
      const days20Ago = new Date(now);
      days20Ago.setDate(days20Ago.getDate() - 20);
      const days100Ago = new Date(now);
      days100Ago.setDate(days100Ago.getDate() - 100);

      prisma.invoice.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          invoiceRow({
            id: 'inv-30',
            totalAmount: 100,
            paidAmount: 0,
            dueDate: days20Ago,
          }),
          invoiceRow({
            id: 'inv-90',
            totalAmount: 200,
            paidAmount: 0,
            dueDate: days100Ago,
          }),
        ]);

      const result = await service.getRevenueSummary({});
      expect(result.aging.overdue30.count).toBe(1);
      expect(result.aging.overdue90plus.count).toBe(1);
      expect(result.summary.criticalReceivables).toBe(200);
    });

    it('uses period start when invoice issueDate is missing', async () => {
      prisma.invoice.findMany
        .mockResolvedValueOnce([
          invoiceRow({
            issueDate: null,
            totalAmount: 50,
            paidAmount: 0,
            paymentStatus: PaymentStatus.unpaid,
          }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getRevenueSummary({
        from: '2025-03-01',
        to: '2025-03-31',
      });
      expect(result.byMonth.length).toBeGreaterThanOrEqual(1);
    });

    it('falls back to Client label when client has no display fields', async () => {
      prisma.invoice.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          invoiceRow({
            id: 'inv-anon',
            totalAmount: 75,
            paidAmount: 0,
            dueDate: new Date('2020-01-01'),
            client: {
              id: 'c4',
              companyName: null,
              firstName: null,
              lastName: null,
              internalCode: null,
              type: 'individual',
            },
          }),
        ]);

      const result = await service.getRevenueSummary({});
      expect(result.agingPreview[0].clientName).toBe('Client');
    });

    it('uses open invoice currency when period invoices are empty', async () => {
      prisma.invoice.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          invoiceRow({
            currency: 'USD',
            totalAmount: 10,
            paidAmount: 0,
            dueDate: new Date('2020-01-01'),
          }),
        ]);

      const result = await service.getRevenueSummary({});
      expect(result.currency).toBe('USD');
    });
  });
});
