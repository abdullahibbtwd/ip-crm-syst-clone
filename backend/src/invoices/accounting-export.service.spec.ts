import { InvoiceStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingExportService } from './accounting-export.service';

describe('AccountingExportService', () => {
  let service: AccountingExportService;
  let prisma: { invoice: { findMany: jest.Mock } };

  const invoice = {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    issueDate: new Date('2026-01-15T12:00:00Z'),
    dueDate: new Date('2026-02-15T12:00:00Z'),
    currency: 'EUR',
    subtotal: 100,
    taxAmount: 20,
    totalAmount: 120,
    status: InvoiceStatus.issued,
    client: {
      id: 'c1',
      companyName: 'Acme Corp',
      firstName: null,
      lastName: null,
      internalCode: 'CL-1',
    },
    matter: { id: 'm1', title: 'Trademark filing' },
  };

  beforeEach(() => {
    prisma = { invoice: { findMany: jest.fn().mockResolvedValue([invoice]) } };
    service = new AccountingExportService(prisma as unknown as PrismaService);
  });

  it('exports journal csv with debit and credit rows', async () => {
    const result = await service.export({ format: 'journal' });

    expect(result.count).toBe(1);
    expect(result.filename).toMatch(/^accounting-journal-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.csv).toContain('Date,Reference,Description,Account,Debit,Credit');
    expect(result.csv).toContain('1200');
    expect(result.csv).toContain('4000');
    expect(result.csv).toContain('Acme Corp');
  });

  it('exports xero csv with tax type when tax is present', async () => {
    const result = await service.export({ format: 'xero' });

    expect(result.csv).toContain('*ContactName,*InvoiceNumber');
    expect(result.csv).toContain('Tax on Sales');
    expect(result.csv).toContain('Trademark filing');
  });

  it('exports quickbooks csv with totals', async () => {
    const result = await service.export({ format: 'quickbooks' });

    expect(result.csv).toContain('Date,Invoice No,Customer,Memo,Account,Amount');
    expect(result.csv).toContain('120');
    expect(result.csv).toContain('INV-2026-0001');
  });

  it('applies client and date filters', async () => {
    await service.export({
      format: 'journal',
      clientId: 'c1',
      from: '2026-01-01',
      to: '2026-01-31',
    });

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: InvoiceStatus.issued,
          clientId: 'c1',
          issueDate: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-01-31'),
          },
        }),
      }),
    );
  });
});
