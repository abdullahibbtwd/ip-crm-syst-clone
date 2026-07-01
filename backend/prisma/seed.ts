import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import {
  ALL_PERMISSIONS,
  PORTAL_ACCESS_POLICY,
  ROLE_DEFINITIONS,
  SYSTEM_ROLES,
} from '../src/rbac/rbac.constants';

config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '.env') });

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const permission of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action,
        },
      },
      update: { description: permission.key },
      create: {
        resource: permission.resource,
        action: permission.action,
        description: permission.key,
      },
    });
  }

  const permissionRows = await prisma.permission.findMany();
  const permissionByKey = new Map(
    permissionRows.map((row) => [`${row.resource}:${row.action}`, row]),
  );

  for (const [roleName, definition] of Object.entries(ROLE_DEFINITIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {
        description: definition.description,
        isSystem: true,
      },
      create: {
        name: roleName,
        description: definition.description,
        isSystem: true,
      },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    for (const key of definition.permissions) {
      const permission = permissionByKey.get(key);
      if (!permission) continue;
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }

    if (roleName === SYSTEM_ROLES.PORTAL_CLIENT) {
      await prisma.accessPolicy.deleteMany({ where: { roleId: role.id } });
      await prisma.accessPolicy.create({
        data: {
          roleId: role.id,
          resource: PORTAL_ACCESS_POLICY.resource,
          condition: PORTAL_ACCESS_POLICY.condition,
        },
      });
    }
  }

  const itAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: SYSTEM_ROLES.IT_ADMIN },
  });

  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ipconsulting.bg' },
    update: {
      fullName: 'System Administrator',
      passwordHash,
      isActive: true,
    },
    create: {
      email: 'admin@ipconsulting.bg',
      fullName: 'System Administrator',
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: itAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: itAdminRole.id,
    },
  });

  const coordinatorRole = await prisma.role.findUniqueOrThrow({
    where: { name: SYSTEM_ROLES.COORDINATOR },
  });

  const managingPartnerRole = await prisma.role.findUniqueOrThrow({
    where: { name: SYSTEM_ROLES.MANAGING_PARTNER },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: coordinatorRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: coordinatorRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: managingPartnerRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: managingPartnerRole.id,
    },
  });

  console.log(
    'Seeded roles, permissions, and admin user (admin@ipconsulting.bg)',
  );

  async function seedRoleUser(
    email: string,
    fullName: string,
    roleName: keyof typeof SYSTEM_ROLES,
  ) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: SYSTEM_ROLES[roleName] },
    });
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        fullName,
        passwordHash,
        isActive: true,
      },
      create: {
        email,
        fullName,
        passwordHash,
        isActive: true,
      },
    });
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: role.id,
      },
    });
    return user;
  }

  const ipAttorney = await seedRoleUser(
    'maria.petrova@ipconsulting.bg',
    'Maria Petrova',
    'IP_ATTORNEY',
  );

  const trademarkAttorney = await seedRoleUser(
    'stefan.ivanov@ipconsulting.bg',
    'Stefan Ivanov',
    'TRADEMARK_ATTORNEY',
  );

  console.log(
    'Seeded attorneys: maria.petrova@ipconsulting.bg (IP), stefan.ivanov@ipconsulting.bg (TM) - password ChangeMe123!',
  );

  const deadlineRuleSeeds = [
    {
      jurisdiction: 'EU',
      matterType: 'trademark' as const,
      eventType: 'examination_response' as const,
      triggerType: 'matter_created' as const,
      daysOffset: 90,
      isBusinessDays: true,
      gracePeriodDays: 0,
      priority: 1,
      description: 'EUIPO initial prosecution checkpoint',
    },
    {
      jurisdiction: 'EP',
      matterType: 'patent' as const,
      eventType: 'examination_response' as const,
      triggerType: 'matter_created' as const,
      daysOffset: 180,
      isBusinessDays: true,
      gracePeriodDays: 0,
      priority: 1,
      description: 'EPO initial examination request',
    },
    {
      jurisdiction: 'BG',
      matterType: 'trademark' as const,
      eventType: 'examination_response' as const,
      triggerType: 'matter_created' as const,
      daysOffset: 120,
      isBusinessDays: true,
      gracePeriodDays: 30,
      priority: 2,
      description: 'BPO initial trademark prosecution',
    },
    {
      jurisdiction: 'BG',
      matterType: 'patent' as const,
      eventType: 'examination_response' as const,
      triggerType: 'matter_created' as const,
      daysOffset: 120,
      isBusinessDays: true,
      gracePeriodDays: 30,
      priority: 2,
      description: 'BPO initial patent prosecution',
    },
    {
      jurisdiction: 'BG',
      matterType: 'utility_model' as const,
      eventType: 'examination_response' as const,
      triggerType: 'matter_created' as const,
      daysOffset: 120,
      isBusinessDays: true,
      gracePeriodDays: 30,
      priority: 2,
      description: 'BPO initial utility model prosecution',
    },
    {
      jurisdiction: 'EU',
      matterType: 'trademark' as const,
      eventType: 'examination_response' as const,
      triggerType: 'office_action' as const,
      daysOffset: 90,
      isBusinessDays: true,
      gracePeriodDays: 0,
      priority: 1,
      description: 'EUIPO office action response',
    },
    {
      jurisdiction: 'EP',
      matterType: 'patent' as const,
      eventType: 'examination_response' as const,
      triggerType: 'office_action' as const,
      daysOffset: 180,
      isBusinessDays: true,
      gracePeriodDays: 0,
      priority: 1,
      description: 'EPO examination response',
    },
    {
      jurisdiction: 'BG',
      matterType: 'trademark' as const,
      eventType: 'examination_response' as const,
      triggerType: 'office_action' as const,
      daysOffset: 120,
      isBusinessDays: true,
      gracePeriodDays: 30,
      priority: 2,
      description: 'BPO office action response',
    },
    {
      jurisdiction: 'BG',
      matterType: 'patent' as const,
      eventType: 'examination_response' as const,
      triggerType: 'office_action' as const,
      daysOffset: 120,
      isBusinessDays: true,
      gracePeriodDays: 30,
      priority: 2,
      description: 'BPO patent examination response',
    },
    {
      jurisdiction: 'BG',
      matterType: 'utility_model' as const,
      eventType: 'examination_response' as const,
      triggerType: 'office_action' as const,
      daysOffset: 120,
      isBusinessDays: true,
      gracePeriodDays: 30,
      priority: 2,
      description: 'BPO utility model examination response',
    },
  ];

  for (const rule of deadlineRuleSeeds) {
    await prisma.deadlineRule.upsert({
      where: {
        jurisdiction_matterType_eventType_triggerType: {
          jurisdiction: rule.jurisdiction,
          matterType: rule.matterType,
          eventType: rule.eventType,
          triggerType: rule.triggerType,
        },
      },
      update: {
        daysOffset: rule.daysOffset,
        isBusinessDays: rule.isBusinessDays,
        gracePeriodDays: rule.gracePeriodDays,
        priority: rule.priority,
        description: rule.description,
      },
      create: rule,
    });
  }

  console.log('Seeded deadline rules (matter_created + office_action for EU, EP, BG)');

  const holdingGroup = await prisma.holdingGroup.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: { name: 'Acme Group BV' },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Acme Group BV',
      description: 'Sample holding group for development',
      country: 'NL',
    },
  });

  const companyClient = await prisma.client.upsert({
    where: { internalCode: 'CL-2026-001' },
    update: {},
    create: {
      type: 'company',
      status: 'active',
      companyName: 'Acme Bulgaria OOD',
      registrationNo: 'BG123456789',
      vatNo: 'BG123456789',
      legalForm: 'OOD',
      country: 'BG',
      internalCode: 'CL-2026-001',
      holdingGroupId: holdingGroup.id,
      assignedUserId: ipAttorney.id,
      gdprConsent: true,
      gdprConsentDate: new Date(),
    },
  });

  const individualClient = await prisma.client.upsert({
    where: { internalCode: 'CL-2026-002' },
    update: {},
    create: {
      type: 'individual',
      status: 'prospect',
      firstName: 'Maria',
      lastName: 'Petrova',
      country: 'BG',
      internalCode: 'CL-2026-002',
      assignedUserId: admin.id,
    },
  });

  const hqOffice = await prisma.clientOffice.upsert({
    where: { id: '00000000-0000-4000-8000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000010',
      clientId: companyClient.id,
      label: 'HQ Sofia',
      isPrimary: true,
      addressLine1: '100 Vitosha Blvd',
      city: 'Sofia',
      postalCode: '1000',
      country: 'BG',
      phone: '+359 2 123 4567',
    },
  });

  await prisma.contact.upsert({
    where: { id: '00000000-0000-4000-8000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000020',
      clientId: companyClient.id,
      role: 'primary',
      firstName: 'Ivan',
      lastName: 'Georgiev',
      position: 'General Counsel',
      email: 'ivan.georgiev@acme.bg',
      officeId: hqOffice.id,
    },
  });

  await prisma.contact.upsert({
    where: { id: '00000000-0000-4000-8000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000021',
      clientId: companyClient.id,
      role: 'billing',
      firstName: 'Elena',
      lastName: 'Dimitrova',
      email: 'billing@acme.bg',
      officeId: hqOffice.id,
    },
  });

  await prisma.relatedCompany.upsert({
    where: { id: '00000000-0000-4000-8000-000000000030' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000030',
      clientId: companyClient.id,
      relatedClientId: individualClient.id,
      relationshipType: 'affiliate',
      notes: 'Founder-linked prospect',
    },
  });

  await prisma.relationshipHistory.createMany({
    data: [
      {
        clientId: companyClient.id,
        userId: admin.id,
        eventType: 'created',
        description: 'Client seeded for development',
      },
      {
        clientId: individualClient.id,
        userId: admin.id,
        eventType: 'created',
        description: 'Client seeded for development',
      },
    ],
    skipDuplicates: true,
  });

  const portalRole = await prisma.role.findUniqueOrThrow({
    where: { name: SYSTEM_ROLES.PORTAL_CLIENT },
  });

  const portalPasswordHash = await bcrypt.hash('Portal123!', 12);
  const portalUser = await prisma.user.upsert({
    where: { email: 'portal@acme.bg' },
    update: {
      clientId: companyClient.id,
      fullName: 'Acme Portal User',
      passwordHash: portalPasswordHash,
      isActive: true,
    },
    create: {
      email: 'portal@acme.bg',
      fullName: 'Acme Portal User',
      passwordHash: portalPasswordHash,
      isActive: true,
      clientId: companyClient.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: portalUser.id,
        roleId: portalRole.id,
      },
    },
    update: {},
    create: {
      userId: portalUser.id,
      roleId: portalRole.id,
    },
  });

  console.log(
    'Seeded CRM sample data (Acme clients, portal@acme.bg / Portal123!)',
  );

  const rateEffectiveFrom = new Date('2024-01-01');
  const defaultRateCards = [
    {
      id: '00000000-0000-4000-8000-000000000100',
      role: 'ip_attorney' as const,
      hourlyRate: 150,
    },
    {
      id: '00000000-0000-4000-8000-000000000101',
      role: 'trademark_attorney' as const,
      hourlyRate: 120,
    },
    {
      id: '00000000-0000-4000-8000-000000000102',
      role: 'paralegal' as const,
      hourlyRate: 80,
    },
    {
      id: '00000000-0000-4000-8000-000000000103',
      role: 'coordinator' as const,
      hourlyRate: 70,
    },
    {
      id: '00000000-0000-4000-8000-000000000104',
      role: 'managing_partner' as const,
      hourlyRate: 200,
    },
  ];

  for (const card of defaultRateCards) {
    await prisma.rateCard.upsert({
      where: { id: card.id },
      update: { hourlyRate: card.hourlyRate },
      create: {
        id: card.id,
        role: card.role,
        matterType: null,
        clientId: null,
        hourlyRate: card.hourlyRate,
        currency: 'EUR',
        effectiveFrom: rateEffectiveFrom,
      },
    });
  }

  console.log('Seeded default billing rate cards (5 firm-wide roles)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
