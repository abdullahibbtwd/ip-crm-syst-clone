import { InvoicePdfService } from './invoice-pdf.service';

jest.mock('./invoice-logo', () => ({
  getInvoiceLogoDataUrl: jest.fn(() => 'data:image/png;base64,AAAA'),
}));

describe('InvoicePdfService', () => {
  let service: InvoicePdfService;
  let storage: { putObject: jest.Mock; getPresignedDownloadUrl: jest.Mock };
  let pdfRenderer: { renderHtmlToPdf: jest.Mock };

  const sampleData = {
    invoiceNumber: 'INV-2026-001',
    issueDate: '2026-01-15',
    dueDate: '2026-02-15',
    clientName: 'Acme <Corp>',
    matterTitle: 'Patent filing',
    currency: 'EUR',
    subtotal: 1000,
    taxRate: 21,
    taxAmount: 210,
    totalAmount: 1210,
    notes: 'Pay within 30 days',
    timeEntries: [
      {
        date: '2026-01-10',
        description: 'Research & <draft>',
        hours: 2.5,
        amount: 500,
      },
    ],
    fixedFees: [
      {
        date: '2026-01-12',
        description: 'Filing fee',
        category: 'Official',
        amount: 500,
      },
    ],
  };

  beforeEach(() => {
    storage = {
      putObject: jest.fn().mockResolvedValue(undefined),
      getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://signed/url'),
    };
    pdfRenderer = {
      renderHtmlToPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
    };
    service = new InvoicePdfService(storage as never, pdfRenderer as never);
  });

  describe('generateAndStore', () => {
    it('renders HTML, converts to PDF, and stores in MinIO', async () => {
      const key = await service.generateAndStore('inv1', sampleData);

      expect(key).toBe('invoices/inv1/invoice.pdf');
      expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalledWith(
        expect.stringContaining('INV-2026-001'),
      );
      expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalledWith(
        expect.stringContaining('&lt;Corp&gt;'),
      );
      expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalledWith(
        expect.stringContaining('data:image/png;base64,AAAA'),
      );
      expect(storage.putObject).toHaveBeenCalledWith(
        'invoices/inv1/invoice.pdf',
        Buffer.from('pdf-bytes'),
        'application/pdf',
      );
    });

    it('omits optional sections when data is sparse', async () => {
      await service.generateAndStore('inv2', {
        ...sampleData,
        dueDate: null,
        taxRate: null,
        notes: null,
        timeEntries: [],
        fixedFees: [],
      });

      const html = pdfRenderer.renderHtmlToPdf.mock.calls[0][0] as string;
      expect(html).not.toContain('Due date');
      expect(html).not.toContain('Time entries');
      expect(html).not.toContain('Fixed fees');
      expect(html).not.toContain('Notes');
    });
  });

  describe('getDownloadUrl', () => {
    it('delegates to storage presigner', async () => {
      await expect(service.getDownloadUrl('invoices/x.pdf')).resolves.toBe(
        'https://signed/url',
      );
      expect(storage.getPresignedDownloadUrl).toHaveBeenCalledWith('invoices/x.pdf');
    });
  });

  describe('resolveDownloadMeta', () => {
    it('returns pdf metadata for pdf keys', () => {
      expect(
        InvoicePdfService.resolveDownloadMeta('invoices/a.pdf', 'INV-1'),
      ).toEqual({
        fileName: 'INV-1.pdf',
        mimeType: 'application/pdf',
      });
    });

    it('falls back to html extension and default name', () => {
      expect(
        InvoicePdfService.resolveDownloadMeta('invoices/a.html', null),
      ).toEqual({
        fileName: 'invoice.html',
        mimeType: 'text/html',
      });
    });
  });
});
