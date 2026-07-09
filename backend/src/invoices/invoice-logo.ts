import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let cachedLogoDataUrl: string | null | undefined;

function resolveLogoPath(): string | null {
  const explicit = process.env.INVOICE_LOGO_PATH?.trim();
  if (explicit && existsSync(explicit)) return explicit;

  const candidates = [
    join(__dirname, '..', '..', 'assets', 'logo.png'),
    join(__dirname, '..', 'assets', 'logo.png'),
    join(process.cwd(), 'dist', 'assets', 'logo.png'),
    join(process.cwd(), 'src', 'assets', 'logo.png'),
    join(process.cwd(), '..', 'frontend', 'public', 'logo.png'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }

  return null;
}

/** Base64 data URL for inline `<img src>` in Puppeteer HTML (no network fetch). */
export function getInvoiceLogoDataUrl(): string | null {
  if (cachedLogoDataUrl !== undefined) {
    return cachedLogoDataUrl;
  }

  const logoPath = resolveLogoPath();
  if (!logoPath) {
    cachedLogoDataUrl = null;
    return null;
  }

  const buffer = readFileSync(logoPath);
  cachedLogoDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  return cachedLogoDataUrl;
}
