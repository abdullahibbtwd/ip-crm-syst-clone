import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer';
import {
  browserLaunchHint,
  resolveBrowserExecutablePath,
} from './browser-executable';

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('puppeteer', () => ({
  executablePath: jest.fn(),
}));

describe('browser-executable', () => {
  const originalPlatform = process.platform;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  afterAll(() => {
    process.env = originalEnv;
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('resolveBrowserExecutablePath', () => {
    it('returns explicit PUPPETEER_EXECUTABLE_PATH when it exists', async () => {
      process.env.PUPPETEER_EXECUTABLE_PATH = 'C:\\custom\\chrome.exe';
      (existsSync as jest.Mock).mockImplementation(
        (path: string) => path === 'C:\\custom\\chrome.exe',
      );

      await expect(resolveBrowserExecutablePath()).resolves.toBe(
        'C:\\custom\\chrome.exe',
      );
    });

    it('throws when explicit path is set but missing', async () => {
      process.env.PUPPETEER_EXECUTABLE_PATH = 'C:\\missing\\chrome.exe';
      (existsSync as jest.Mock).mockReturnValue(false);

      await expect(resolveBrowserExecutablePath()).rejects.toThrow(
        /PUPPETEER_EXECUTABLE_PATH is set but not found/,
      );
    });

    it('uses bundled puppeteer path when available', async () => {
      (puppeteer.executablePath as jest.Mock).mockResolvedValue('/bundled/chrome');
      (existsSync as jest.Mock).mockImplementation(
        (path: string) => path === '/bundled/chrome',
      );

      await expect(resolveBrowserExecutablePath()).resolves.toBe('/bundled/chrome');
    });

    it('falls back to platform candidates when bundled path is unavailable', async () => {
      (puppeteer.executablePath as jest.Mock).mockRejectedValue(
        new Error('not installed'),
      );
      Object.defineProperty(process, 'platform', { value: 'linux' });
      (existsSync as jest.Mock).mockImplementation(
        (path: string) => path === '/usr/bin/chromium',
      );

      await expect(resolveBrowserExecutablePath()).resolves.toBe('/usr/bin/chromium');
    });

    it('checks Windows candidates on win32', async () => {
      (puppeteer.executablePath as jest.Mock).mockResolvedValue('');
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.LOCALAPPDATA = 'C:\\Users\\me\\AppData\\Local';
      (existsSync as jest.Mock).mockImplementation((path: string) =>
        path.includes('msedge.exe'),
      );

      const result = await resolveBrowserExecutablePath();
      expect(result).toContain('msedge.exe');
    });

    it('checks macOS candidates on darwin', async () => {
      (puppeteer.executablePath as jest.Mock).mockResolvedValue('');
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      (existsSync as jest.Mock).mockImplementation((path: string) =>
        path.includes('Google Chrome.app'),
      );

      await expect(resolveBrowserExecutablePath()).resolves.toContain(
        'Google Chrome.app',
      );
    });

    it('returns undefined when nothing is found', async () => {
      (puppeteer.executablePath as jest.Mock).mockResolvedValue('');
      (existsSync as jest.Mock).mockReturnValue(false);

      await expect(resolveBrowserExecutablePath()).resolves.toBeUndefined();
    });
  });

  describe('browserLaunchHint', () => {
    it('returns install instructions', () => {
      expect(browserLaunchHint()).toContain('npx puppeteer browsers install chrome');
      expect(browserLaunchHint()).toContain('PUPPETEER_EXECUTABLE_PATH');
    });
  });
});
