import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';
import {
  browserLaunchHint,
  resolveBrowserExecutablePath,
} from './browser-executable';

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

@Injectable()
export class PdfRendererService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfRendererService.name);
  private browser: Browser | null = null;
  private browserPromise: Promise<Browser> | null = null;

  async onModuleInit() {
    if (process.env.PUPPETEER_WARMUP === 'true') {
      try {
        await this.getBrowser();
      } catch (error) {
        this.logger.warn(
          `Puppeteer warmup skipped: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.browserPromise = null;
      this.logger.log('Puppeteer browser closed');
    }
  }

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    if (!this.browserPromise) {
      this.browserPromise = this.launchBrowser();
    }

    return this.browserPromise;
  }

  private async launchBrowser(): Promise<Browser> {
    const executablePath = await resolveBrowserExecutablePath();

    if (!executablePath) {
      throw new Error(
        `No Chromium/Chrome browser found for PDF generation.\n${browserLaunchHint()}`,
      );
    }

    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: BROWSER_ARGS,
    });

    this.browser = browser;
    this.browserPromise = Promise.resolve(browser);
    this.logger.log(`Puppeteer browser started (${executablePath})`);

    return browser;
  }
}
