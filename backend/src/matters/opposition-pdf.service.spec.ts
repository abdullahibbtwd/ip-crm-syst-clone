import { OppositionPdfService } from './opposition-pdf.service';

jest.mock('../invoices/invoice-logo', () => ({
  getInvoiceLogoDataUrl: jest.fn(() => null),
}));

describe('OppositionPdfService', () => {
  let service: OppositionPdfService;
  let storage: { putObject: jest.Mock; getPresignedDownloadUrl: jest.Mock; getObjectBuffer: jest.Mock };
  let pdfRenderer: { renderHtmlToPdf: jest.Mock };
  let prisma: { matterDocumentVersion: { findFirst: jest.Mock } };

  const oppositionMatter = {
    id: 'm1',
    title: 'TEST MARKA',
    matterType: 'trademark',
    client: {
      type: 'company' as const,
      companyName: 'Acme Ltd',
      firstName: null,
      lastName: null,
    },
    applicantClient: null,
    attributes: {
      attributes: {
        trademarkProcedure: 'opposition',
        applicationNumber: '18273645',
        applicationDate: '2018-08-01',
        territory: 'eu',
        niceClasses: [3, 5, 7],
        oppositionStage: 'opposition_decision',
        oppositionDecisionRef: { number: '88888888', date: '2018-08-27' },
        againstClasses: '3, 5, 7',
        oppositionFiler: 'az',
        basisMarks: [
          {
            name: 'ss',
            applicationNo: 'testmark',
            applicationDate: '2018-08-01',
            classes: '3,5,7',
            country: 'BG',
          },
        ],
        oppositionEvents: [
          {
            id: 'e1',
            kind: 'decision',
            label: 'Decision',
            at: '2018-08-27',
            decisionNumber: '88888888',
            decisionDate: '2018-08-27',
          },
        ],
      },
    },
  };

  beforeEach(() => {
    storage = {
      putObject: jest.fn().mockResolvedValue(undefined),
      getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://signed/pdf'),
      getObjectBuffer: jest.fn(),
    };
    pdfRenderer = {
      renderHtmlToPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
    };
    prisma = {
      matterDocumentVersion: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    service = new OppositionPdfService(
      prisma as never,
      storage as never,
      pdfRenderer as never,
    );
  });

  it('renders styled HTML and stores PDF for opposition matters', async () => {
    const result = await service.generateDownload(oppositionMatter as never, 'en');

    expect(result.url).toBe('https://signed/pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileName).toContain('opposition-');
    expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalledWith(
      expect.stringContaining('Decision on opposition No. 88888888'),
    );
    expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalledWith(
      expect.stringContaining('Opposing trademarks'),
    );
    expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalledWith(
      expect.stringContaining('TEST MARKA'),
    );
    expect(storage.putObject).toHaveBeenCalledWith(
      'matters/m1/exports/opposition-summary.pdf',
      Buffer.from('pdf-bytes'),
      'application/pdf',
    );
  });

  it('rejects non-opposition matters', async () => {
    await expect(
      service.generateDownload(
        {
          ...oppositionMatter,
          attributes: { attributes: { trademarkProcedure: 'objection' } },
        } as never,
        'en',
      ),
    ).rejects.toThrow('Matter is not a trademark opposition');
  });
});
