/**
 * Provision a user for SSO login (no password - they sign in via Microsoft/Google).
 *
 * Usage:
 *   npx tsx scripts/invite-user.ts <email> "<full name>" <role>
 *
 * Example:
 *   npx tsx scripts/invite-user.ts attorney@ipconsulting.bg "Maria Petrova" ip_attorney
 *
 * Roles: managing_partner, ip_attorney, trademark_attorney, coordinator,
 *        docketing_admin, paralegal, finance, dpo_compliance, it_admin, portal_client
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { SYSTEM_ROLES, type SystemRole } from '../src/rbac/rbac.constants';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const [email, fullName, roleName] = process.argv.slice(2);

  if (!email || !fullName || !roleName) {
    console.error(
      'Usage: npx tsx scripts/invite-user.ts <email> "<full name>" <role>',
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

  const roleRow = await prisma.role.findUnique({ where: { name: role } });
  if (!roleRow) {
    console.error('Role not found in database. Run: npx prisma db seed');
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      fullName,
      isActive: true,
      passwordHash: null,
    },
    create: {
      email: normalizedEmail,
      fullName,
      isActive: true,
      passwordHash: null,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: user.id, roleId: roleRow.id },
    },
    update: {},
    create: { userId: user.id, roleId: roleRow.id },
  });

  console.log(`Provisioned SSO user: ${normalizedEmail}`);
  console.log(`  Name: ${fullName}`);
  console.log(`  Role: ${role}`);
  console.log('');
  console.log(
    'They can now sign in with Microsoft/Google using this exact email.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
