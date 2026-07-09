import { execSync } from 'node:child_process';

// Local dev: download Puppeteer's Chrome after npm install.
// Docker/production: set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true and use system Chromium.
if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true') {
  console.log(
    'Skipping Puppeteer browser download (PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true)',
  );
  process.exit(0);
}

try {
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
} catch (error) {
  console.warn(
    'Puppeteer browser install failed — PDF generation may use system Chrome/Edge instead.',
  );
  console.warn(error instanceof Error ? error.message : String(error));
}
