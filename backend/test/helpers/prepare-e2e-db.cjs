const path = require('path');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const port = process.env.E2E_POSTGRES_PORT || '5433';
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

if (process.env.E2E_POSTGRES_PORT) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    /(@[^:/]+):(\d+)\//,
    `$1:${port}/`,
  );
}

const cmd = process.argv.slice(2).join(' ');
if (!cmd) {
  console.error('Usage: node prepare-e2e-db.cjs <command>');
  process.exit(1);
}

if (process.env.E2E_POSTGRES_PORT) {
  console.log(`Running against Postgres port ${port}: ${cmd}`);
} else {
  console.log(`Running: ${cmd}`);
}
execSync(cmd, { stdio: 'inherit', env: process.env, cwd: path.resolve(__dirname, '../..') });
