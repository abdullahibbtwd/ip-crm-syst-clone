import { PdfRendererService } from './pdf-renderer.service';
import * as browserExecutable from './browser-executable';

const mockPage = {
  setContent: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(Buffer.from('pdf-bytes')),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockLaunch = jest.fn();

jest.mock('puppeteer', () => ({
  __esModule: true,
  default: {
    launch: (...args: unknown[]) => mockLaunch(...args),
  },
}));

jest.mock('./browser-executable', () => ({
  resolveBrowserExecutablePath: jest.fn().mockResolvedValue('/usr/bin/chrome'),
  browserLaunchHint: jest.fn().mockReturnValue('install chrome'),
}));

describe('PdfRendererService', () => {
  let service: PdfRendererService;
  let mockBrowser: {
    connected: boolean;
    newPage: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockBrowser = {
      connected: true,
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockLaunch.mockResolvedValue(mockBrowser);
    service = new PdfRendererService();
    await service.onModuleDestroy();
  });

  it('renderHtmlToPdf returns PDF buffer', async () => {
    const buffer = await service.renderHtmlToPdf('<html><body>Hi</body></html>');
    expect(buffer).toEqual(Buffer.from('pdf-bytes'));
    expect(mockLaunch).toHaveBeenCalled();
    expect(mockPage.setContent).toHaveBeenCalledWith(
      '<html><body>Hi</body></html>',
      { waitUntil: 'load' },
    );
    expect(mockPage.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'A4', printBackground: true }),
    );
    expect(mockPage.close).toHaveBeenCalled();
  });

  it('reuses connected browser instance', async () => {
    await service.renderHtmlToPdf('<p>1</p>');
    await service.renderHtmlToPdf('<p>2</p>');
    expect(mockLaunch).toHaveBeenCalledTimes(1);
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
  });

  it('onModuleDestroy closes browser', async () => {
    await service.renderHtmlToPdf('<p>x</p>');
    await service.onModuleDestroy();
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('onModuleInit warmup is optional and non-fatal', async () => {
    const original = process.env.PUPPETEER_WARMUP;
    process.env.PUPPETEER_WARMUP = 'true';
    const warmService = new PdfRendererService();
    await expect(warmService.onModuleInit()).resolves.toBeUndefined();
    process.env.PUPPETEER_WARMUP = original;
  });

  it('throws when no browser executable is found', async () => {
    jest
      .spyOn(browserExecutable, 'resolveBrowserExecutablePath')
      .mockResolvedValueOnce(null);
    const fresh = new PdfRendererService();
    await expect(fresh.renderHtmlToPdf('<p>x</p>')).rejects.toThrow(
      /No Chromium\/Chrome browser found/,
    );
  });
});
