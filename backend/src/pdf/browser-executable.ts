import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer';

const WINDOWS_BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    : null,
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter((path): path is string => Boolean(path));

const LINUX_BROWSER_CANDIDATES = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
];

function firstExistingPath(paths: string[]): string | undefined {
  for (const path of paths) {
    if (existsSync(path)) return path;
  }
  return undefined;
}

export async function resolveBrowserExecutablePath(): Promise<string | undefined> {
  const explicit = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (explicit) {
    if (existsSync(explicit)) return explicit;
    throw new Error(
      `PUPPETEER_EXECUTABLE_PATH is set but not found: ${explicit}`,
    );
  }

  try {
    const bundled = await puppeteer.executablePath();
    if (bundled && existsSync(bundled)) return bundled;
  } catch {
    // Bundled Chromium not installed — fall through to system browsers.
  }

  const platform = process.platform;
  if (platform === 'win32') {
    return firstExistingPath(WINDOWS_BROWSER_CANDIDATES);
  }
  if (platform === 'linux') {
    return firstExistingPath(LINUX_BROWSER_CANDIDATES);
  }
  if (platform === 'darwin') {
    return firstExistingPath([
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ]);
  }

  return undefined;
}

export function browserLaunchHint(): string {
  return [
    'Install a browser for PDF generation:',
    '  npx puppeteer browsers install chrome',
    'Or set PUPPETEER_EXECUTABLE_PATH to Chrome/Edge/Chromium on your machine.',
  ].join('\n');
}
