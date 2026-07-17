import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
} from '../../generated/prisma/client';
import type { PortalAccessService } from '../common/portal-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { InvoicePdfService } from './invoice-pdf.service';
import { InvoicesService } from './invoices.service';

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    clientId: 'c1',
    matterId: 'm1',
    invoiceNumber: null,
    status: InvoiceStatus.draft,
    issueDate: null,
    dueDate: null,
    currency: 'EUR',
    subtotal: 100,
    taxRate: null,
    taxAmount: 0,
    totalAmount: 100,
    paymentStatus: PaymentStatus.unpaid,
    paidAmount: 0,
    paidAt: null,
    pdfStorageKey: null,
    notes: null,
    createdById: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    client: {
      id: 'c1',
      companyName: 'Acme',
      firstName: null,
      lastName: null,
      internalCode: 'CL-1',
    },
    matter: { id: 'm1', title: 'Matter', matterType: 'trademark' },
    createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
    payments: [],
    timeEntries: [],
    fixedFees: [],
    ...overrides,
  };
}

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    timeEntry: { findMany: jest.Mock; updateMany: jest.Mock };
    fixedFee: { findMany: jest.Mock; updateMany: jest.Mock };
    invoice: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    invoicePayment: { create: jest.Mock };
    invoiceSequence: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let pdf: { generateAndStore: jest.Mock; getDownloadUrl: jest.Mock };
  let portalAccess: { requireScopeClientId: jest.Mock };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      timeEntry: { findMany: jest.fn(), updateMany: jest.fn() },
      fixedFee: { findMany: jest.fn(), updateMany: jest.fn() },
      invoice: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      invoicePayment: { create: jest.fn() },
      invoiceSequence: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    pdf = {
      generateAndStore: jest.fn().mockResolvedValue('pdf/key.pdf'),
      getDownloadUrl: jest.fn().mockResolvedValue('https://signed.example/pdf'),
    };
    portalAccess = { requireScopeClientId: jest.fn().mockReturnValue(null) };

    service = new InvoicesService(
      prisma as unknown as PrismaService,
      portalAccess as unknown as PortalAccessService,
      pdf as unknown as InvoicePdfService,
    );
  });

  describe('createDraft', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.createDraft('missing', {}, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when there are no unbilled billable lines', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
        title: 'M',
      });
      prisma.timeEntry.findMany.mockResolvedValue([]);
      prisma.fixedFee.findMany.mockResolvedValue([]);

      await expect(
        service.createDraft('m1', {}, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a draft with tax and links lines', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
        title: 'M',
      });
      prisma.timeEntry.findMany.mockResolvedValue([
        { id: 'te1', amount: 100 },
      ]);
      prisma.fixedFee.findMany.mockResolvedValue([{ id: 'ff1', amount: 50 }]);
      prisma.invoice.create.mockResolvedValue({ id: 'inv-1' });
      prisma.invoice.findUniqueOrThrow.mockResolvedValue(
        invoiceRow({
          subtotal: 150,
          taxRate: 20,
          taxAmount: 30,
          totalAmount: 180,
          timeEntries: [
            {
              id: 'te1',
              date: new Date('2026-01-01'),
              description: 'Work',
              hours: 1,
              rateSnapshot: 100,
              amount: 100,
              loggedBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
            },
          ],
          fixedFees: [
            {
              id: 'ff1',
              date: new Date('2026-01-02'),
              description: 'Fee',
              category: 'official_fee',
              amount: 50,
            },
          ],
        }),
      );

      const result = await service.createDraft(
        'm1',
        { taxRate: 20 },
        'u1',
      );

      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: InvoiceStatus.draft,
          subtotal: 150,
          taxRate: 20,
          taxAmount: 30,
          totalAmount: 180,
        }),
      });
      expect(prisma.timeEntry.updateMany).toHaveBeenCalled();
      expect(prisma.fixedFee.updateMany).toHaveBeenCalled();
      expect(result.status).toBe(InvoiceStatus.draft);
      expect(result.totalAmount).toBe(180);
    });
  });

  describe('issue', () => {
    it('rejects non-draft invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({ status: InvoiceStatus.issued }),
      );
      await expect(service.issue('inv-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('issues a draft with a generated invoice number and PDF key', async () => {
      const year = new Date().getFullYear();
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow());
      prisma.invoiceSequence.findUnique.mockResolvedValue(null);
      prisma.invoiceSequence.create.mockResolvedValue({
        year,
        lastNumber: 1,
      });
      prisma.invoice.update
        .mockResolvedValueOnce(
          invoiceRow({
            status: InvoiceStatus.issued,
            invoiceNumber: `INV-${year}-0001`,
            issueDate: new Date(),
          }),
        )
        .mockResolvedValueOnce(
          invoiceRow({
            status: InvoiceStatus.issued,
            invoiceNumber: `INV-${year}-0001`,
            issueDate: new Date(),
            pdfStorageKey: 'pdf/key.pdf',
          }),
        );

      const result = await service.issue('inv-1');

      expect(result.invoiceNumber).toBe(`INV-${year}-0001`);
      expect(result.pdfStorageKey).toBe('pdf/key.pdf');
      expect(pdf.generateAndStore).toHaveBeenCalled();
    });

    it('increments existing invoice sequence', async () => {
      const year = new Date().getFullYear();
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow());
      prisma.invoiceSequence.findUnique.mockResolvedValue({
        year,
        lastNumber: 7,
      });
      prisma.invoiceSequence.update.mockResolvedValue({
        year,
        lastNumber: 8,
      });
      prisma.invoice.update
        .mockResolvedValueOnce(
          invoiceRow({
            status: InvoiceStatus.issued,
            invoiceNumber: `INV-${year}-0008`,
          }),
        )
        .mockResolvedValueOnce(
          invoiceRow({
            status: InvoiceStatus.issued,
            invoiceNumber: `INV-${year}-0008`,
            pdfStorageKey: 'pdf/key.pdf',
          }),
        );

      const result = await service.issue('inv-1');
      expect(result.invoiceNumber).toBe(`INV-${year}-0008`);
      expect(prisma.invoiceSequence.update).toHaveBeenCalled();
    });
  });

  describe('listForMatter', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(service.listForMatter('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns serialized invoices for a matter', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.invoice.findMany.mockResolvedValue([invoiceRow()]);

      const result = await service.listForMatter('m1');
      expect(result).toHaveLength(1);
      expect(result[0].totalAmount).toBe(100);
    });
  });

  describe('listAll', () => {
    it('returns paginated items with next cursor', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        invoiceRow({ id: 'inv-1' }),
        invoiceRow({ id: 'inv-2' }),
        invoiceRow({ id: 'inv-3' }),
      ]);

      const result = await service.listAll({ limit: '2' });
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('inv-2');
    });

    it('applies search and status filters', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      await service.listAll({
        search: 'Acme',
        status: InvoiceStatus.issued,
        paymentStatus: PaymentStatus.unpaid,
        clientId: 'c1',
      });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: InvoiceStatus.issued,
            paymentStatus: PaymentStatus.unpaid,
            clientId: 'c1',
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('listForPortalClient', () => {
    it('returns only issued invoices', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        invoiceRow({ status: InvoiceStatus.issued }),
        invoiceRow({ id: 'inv-void', status: InvoiceStatus.void }),
      ]);

      const result = await service.listForPortalClient('c1');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(InvoiceStatus.issued);
    });
  });

  describe('findOne', () => {
    it('throws when invoice is missing', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(
        service.findOne('missing', { id: 'u1', role: 'admin' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('enforces portal client scope', async () => {
      portalAccess.requireScopeClientId.mockReturnValue('other-client');
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({ clientId: 'c1', status: InvoiceStatus.issued }),
      );

      await expect(
        service.findOne('inv-1', { id: 'u1', role: 'portal' } as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateDraft', () => {
    it('rejects non-draft invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({ status: InvoiceStatus.issued }),
      );
      await expect(
        service.updateDraft('inv-1', { taxRate: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recalculates totals for draft updates', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow());
      prisma.invoice.update.mockResolvedValue(
        invoiceRow({ taxRate: 20, taxAmount: 20, totalAmount: 120 }),
      );

      const result = await service.updateDraft('inv-1', { taxRate: 20 });
      expect(result.taxAmount).toBe(20);
      expect(result.totalAmount).toBe(120);
    });
  });

  describe('createAndIssueFromLines', () => {
    it('requires at least one line id', async () => {
      await expect(
        service.createAndIssueFromLines('m1', {}, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates and issues in one flow', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
        title: 'M',
      });
      prisma.timeEntry.findMany.mockResolvedValue([
        { id: 'te1', amount: 100 },
      ]);
      prisma.fixedFee.findMany.mockResolvedValue([]);
      prisma.invoice.create.mockResolvedValue({ id: 'inv-1' });
      prisma.invoice.findUniqueOrThrow.mockResolvedValue(invoiceRow());
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow());
      prisma.invoiceSequence.findUnique.mockResolvedValue(null);
      prisma.invoiceSequence.create.mockResolvedValue({
        year: new Date().getFullYear(),
        lastNumber: 1,
      });
      prisma.invoice.update
        .mockResolvedValueOnce(
          invoiceRow({
            status: InvoiceStatus.issued,
            invoiceNumber: `INV-${new Date().getFullYear()}-0001`,
          }),
        )
        .mockResolvedValueOnce(
          invoiceRow({
            status: InvoiceStatus.issued,
            pdfStorageKey: 'pdf/key.pdf',
          }),
        );

      const result = await service.createAndIssueFromLines(
        'm1',
        { timeEntryIds: ['te1'] },
        'u1',
      );

      expect(result.status).toBe(InvoiceStatus.issued);
      expect(pdf.generateAndStore).toHaveBeenCalled();
    });
  });

  describe('recordPayment', () => {
    it('rejects payments on draft invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue(invoiceRow());
      await expect(
        service.recordPayment(
          'inv-1',
          { amount: 10, paidAt: '2026-01-01' },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects overpayment', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({
          status: InvoiceStatus.issued,
          totalAmount: 100,
          paidAmount: 90,
        }),
      );
      await expect(
        service.recordPayment(
          'inv-1',
          { amount: 20, paidAt: '2026-01-01' },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('records partial and full payments', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({
          status: InvoiceStatus.issued,
          totalAmount: 100,
          paidAmount: 0,
        }),
      );
      prisma.invoicePayment.create.mockResolvedValue({ id: 'pay-1' });
      prisma.invoice.update.mockResolvedValue(
        invoiceRow({
          status: InvoiceStatus.issued,
          paidAmount: 100,
          paymentStatus: PaymentStatus.paid,
        }),
      );

      const result = await service.recordPayment(
        'inv-1',
        { amount: 100, paidAt: '2026-01-15T10:00:00Z' },
        'u1',
      );

      expect(prisma.invoicePayment.create).toHaveBeenCalled();
      expect(result.paymentStatus).toBe(PaymentStatus.paid);
    });

    it('records partial payment status', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({
          status: InvoiceStatus.issued,
          totalAmount: 100,
          paidAmount: 0,
        }),
      );
      prisma.invoicePayment.create.mockResolvedValue({ id: 'pay-1' });
      prisma.invoice.update.mockResolvedValue(
        invoiceRow({
          status: InvoiceStatus.issued,
          paidAmount: 40,
          paymentStatus: PaymentStatus.partial,
        }),
      );

      const result = await service.recordPayment(
        'inv-1',
        { amount: 40, paidAt: '2026-01-15T10:00:00Z' },
        'u1',
      );

      expect(result.paymentStatus).toBe(PaymentStatus.partial);
    });
  });

  describe('getPdfDownload', () => {
    it('rejects invoices without a stored pdf', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({ status: InvoiceStatus.issued, pdfStorageKey: null }),
      );
      await expect(
        service.getPdfDownload('inv-1', { id: 'u1', role: 'admin' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns signed download metadata for issued invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({
          status: InvoiceStatus.issued,
          pdfStorageKey: 'pdf/key.pdf',
          invoiceNumber: 'INV-2026-0001',
        }),
      );

      const result = await service.getPdfDownload(
        'inv-1',
        { id: 'u1', role: 'admin' } as never,
      );

      expect(result.url).toBe('https://signed.example/pdf');
      expect(result.clientId).toBe('c1');
      expect(pdf.getDownloadUrl).toHaveBeenCalledWith('pdf/key.pdf');
    });
  });

  describe('voidInvoice', () => {
    it('rejects already void invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({ status: InvoiceStatus.void }),
      );
      await expect(service.voidInvoice('inv-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects issued invoices with payments', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({
          status: InvoiceStatus.issued,
          paymentStatus: PaymentStatus.partial,
        }),
      );
      await expect(service.voidInvoice('inv-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('voids unpaid invoices and unlinks lines', async () => {
      prisma.invoice.findUnique.mockResolvedValue(
        invoiceRow({ status: InvoiceStatus.issued }),
      );
      prisma.invoice.update.mockResolvedValue(
        invoiceRow({ status: InvoiceStatus.void }),
      );

      const result = await service.voidInvoice('inv-1');

      expect(prisma.timeEntry.updateMany).toHaveBeenCalledWith({
        where: { invoiceId: 'inv-1' },
        data: { invoiceId: null },
      });
      expect(result.status).toBe(InvoiceStatus.void);
    });
  });
});
