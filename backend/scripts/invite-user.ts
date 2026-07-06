/**
 * Provision an internal or portal user.
 *
 * SSO (default): no password — sign in with Microsoft/Google using this email.
 *
 * Dev password login:
 *   npm run invite:user -- user@example.com "Full Name" managing_partner --password "ChangeMe123!"
 *
 * Portal user linked to an existing client:
 *   npm run invite:user -- client@co.bg "Jane Client" portal_client --password "Portal123!" --client-code CL-2026-001
 *
 * Roles: managing_partner, ip_attorney, trademark_attorney, coordinator,
 *        docketing_admin, paralegal, finance, dpo_compliance, it_admin, portal_client
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { SYSTEM_ROLES, type SystemRole } from '../src/rbac/rbac.constants';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function parseArgs(argv: string[]) {
  let password: string | undefined;
  let clientCode: string | undefined;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--password') {
      password = argv[++i];
      continue;
    }
    if (arg === '--client-code') {
      clientCode = argv[++i];
      continue;
    }
    positional.push(arg);
  }

  return { positional, password, clientCode };
}

async function main() {
  const { positional, password, clientCode } = parseArgs(process.argv.slice(2));
  const [email, fullName, roleName] = positional;

  if (!email || !fullName || !roleName) {
    console.error(
      'Usage: npm run invite:user -- <email> "<full name>" <role> [--password "..."] [--client-code CL-XXXX]',
    );
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase();
  const role = roleName as SystemRole;

  if (!Object.values(SYSTEM_ROLES).includes(role)) {
    console.error(`Invalid role "${roleName}". Valid roles:`);
    console.error(Object.values(SYSTEM_ROLES).join(', '));
    process.exit(1);
  }

  if (role === SYSTEM_ROLES.PORTAL_CLIENT && !clientCode) {
    console.error(
      'portal_client requires --client-code (internal code of an existing client, e.g. CL-2026-001).',
    );
    console.error(
      'Create the client first via intake convert, then link the portal account.',
    );
    process.exit(1);
  }

  const roleRow = await prisma.role.findUnique({ where: { name: role } });
  if (!roleRow) {
    console.error('Role not found in database. Run: npx prisma db seed');
    process.exit(1);
  }

  let clientId: string | undefined;
  if (clientCode) {
    const client = await prisma.client.findFirst({
      where: { internalCode: clientCode },
      select: { id: true, companyName: true, firstName: true, lastName: true },
    });
    if (!client) {
      console.error(`Client not found with internal code "${clientCode}".`);
      process.exit(1);
    }
    clientId = client.id;
  }

  const passwordHash = password ? await bcrypt.hash(password, 12) : null;

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      fullName,
      isActive: true,
      ...(password !== undefined ? { passwordHash } : {}),
      ...(clientId !== undefined ? { clientId } : {}),
    },
    create: {
      email: normalizedEmail,
      fullName,
      isActive: true,
      passwordHash,
      clientId: clientId ?? null,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: user.id, roleId: roleRow.id },
    },
    update: {},
    create: { userId: user.id, roleId: roleRow.id },
  });

  console.log(`Provisioned user: ${normalizedEmail}`);
  console.log(`  Name: ${fullName}`);
  console.log(`  Role: ${role}`);
  if (clientCode) {
    console.log(`  Client: ${clientCode}`);
  }
  if (password) {
    console.log('  Login: email + password (dev)');
  } else {
    console.log('  Login: Microsoft/Google SSO with this exact email');
  }
  console.log('');
  console.log('Sign out and sign back in if permissions were just added.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
