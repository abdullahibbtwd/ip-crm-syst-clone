import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';

const SYSTEM_ROLES = {
  MANAGING_PARTNER: 'managing_partner',
  IP_ATTORNEY: 'ip_attorney',
  TRADEMARK_ATTORNEY: 'trademark_attorney',
  COORDINATOR: 'coordinator',
  DOCKETING_ADMIN: 'docketing_admin',
  PARALEGAL: 'paralegal',
  FINANCE: 'finance',
  DPO_COMPLIANCE: 'dpo_compliance',
  IT_ADMIN: 'it_admin',
  PORTAL_CLIENT: 'portal_client',
} as const;

const RESOURCES = [
  'matter',
  'document',
  'deadline',
  'correspondence',
  'invoice',
  'client',
  'intake',
  'user',
  'role',
  'audit',
  'portal',
  'billing',
  'registry',
  'task',
  'renewal',
] as const;

const ACTIONS = ['read', 'create', 'update', 'delete'] as const;

const ALL_PERMISSIONS = RESOURCES.flatMap((resource) =>
  ACTIONS.map((action) => ({
    resource,
    action,
    key: `${resource}:${action}`,
  })),
);

/** Permissions outside the standard resource × action grid. */
const EXTRA_PERMISSIONS = [
  {
    resource: 'renewal',
    action: 'instruct',
    key: 'renewal:instruct',
  },
] as const;

const ROLE_DEFINITIONS: Record<
  (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES],
  { description: string; permissions: string[] }
> = {
  [SYSTEM_ROLES.MANAGING_PARTNER]: {
    description: 'Full firm oversight and administration',
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  [SYSTEM_ROLES.IP_ATTORNEY]: {
    description: 'Patent and IP prosecution matters',
    permissions: [
      'matter:read',
      'matter:create',
      'matter:update',
      'document:read',
      'document:create',
      'document:update',
      'deadline:read',
      'deadline:create',
      'deadline:update',
      'renewal:read',
      'renewal:update',
      'correspondence:read',
      'correspondence:create',
      'correspondence:update',
      'billing:read',
      'billing:create',
      'task:read',
      'task:create',
      'task:update',
      'client:read',
      'portal:read',
      'registry:read',
    ],
  },
  [SYSTEM_ROLES.TRADEMARK_ATTORNEY]: {
    description: 'Trademark prosecution and opposition work',
    permissions: [
      'matter:read',
      'matter:create',
      'matter:update',
      'document:read',
      'document:create',
      'document:update',
      'deadline:read',
      'deadline:create',
      'deadline:update',
      'renewal:read',
      'renewal:update',
      'correspondence:read',
      'correspondence:create',
      'correspondence:update',
      'billing:read',
      'billing:create',
      'task:read',
      'task:create',
      'task:update',
      'client:read',
      'portal:read',
      'registry:read',
    ],
  },
  [SYSTEM_ROLES.COORDINATOR]: {
    description: 'Intake, coordination and client communication',
    permissions: [
      'matter:read',
      'matter:create',
      'matter:update',
      'client:read',
      'client:update',
      'intake:read',
      'intake:create',
      'intake:update',
      'document:read',
      'document:create',
      'correspondence:read',
      'correspondence:create',
      'billing:read',
      'billing:create',
      'deadline:read',
      'renewal:read',
      'renewal:update',
      'portal:read',
    ],
  },
  [SYSTEM_ROLES.DOCKETING_ADMIN]: {
    description: 'Deadline and docket management',
    permissions: [
      'matter:read',
      'deadline:read',
      'deadline:create',
      'deadline:update',
      'deadline:delete',
      'renewal:read',
      'renewal:update',
      'document:read',
      'correspondence:read',
      'registry:read',
      'registry:update',
    ],
  },
  [SYSTEM_ROLES.PARALEGAL]: {
    description: 'Matter support and document preparation',
    permissions: [
      'matter:read',
      'matter:update',
      'document:read',
      'document:create',
      'document:update',
      'correspondence:read',
      'correspondence:create',
      'billing:read',
      'billing:create',
      'task:read',
      'task:create',
      'task:update',
      'deadline:read',
      'deadline:update',
      'renewal:read',
      'client:read',
    ],
  },
  [SYSTEM_ROLES.FINANCE]: {
    description: 'Billing, invoices and financial records',
    permissions: [
      'invoice:read',
      'invoice:create',
      'invoice:update',
      'billing:read',
      'billing:create',
      'billing:update',
      'billing:delete',
      'task:read',
      'client:read',
      'matter:read',
    ],
  },
  [SYSTEM_ROLES.DPO_COMPLIANCE]: {
    description: 'GDPR compliance and audit oversight',
    permissions: [
      'audit:read',
      'user:read',
      'client:read',
      'document:read',
      'matter:read',
    ],
  },
  [SYSTEM_ROLES.IT_ADMIN]: {
    description: 'System configuration and user administration',
    permissions: [
      'user:read',
      'user:create',
      'user:update',
      'role:read',
      'role:update',
      'audit:read',
      'task:read',
    ],
  },
  [SYSTEM_ROLES.PORTAL_CLIENT]: {
    description: 'External client portal access only',
    permissions: [
      'portal:read',
      'matter:read',
      'document:read',
      'invoice:read',
      'deadline:read',
      'intake:read',
      'intake:create',
      'renewal:read',
      'renewal:instruct',
    ],
  },
};

const PORTAL_ACCESS_POLICY = {
  resource: 'matter',
  condition: { client_id: '$user.client_id' },
};

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

  for (const permission of EXTRA_PERMISSIONS) {
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
      jurisdiction: 'BG',
      matterType: 'industrial_design' as const,
      eventType: 'examination_response' as const,
      triggerType: 'matter_created' as const,
      daysOffset: 120,
      isBusinessDays: true,
      gracePeriodDays: 30,
      priority: 2,
      description: 'BPO initial design prosecution',
    },
    {
      jurisdiction: 'EU',
      matterType: 'industrial_design' as const,
      eventType: 'examination_response' as const,
      triggerType: 'matter_created' as const,
      daysOffset: 90,
      isBusinessDays: true,
      gracePeriodDays: 0,
      priority: 1,
      description: 'EUIPO initial design prosecution',
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
    {
      jurisdiction: 'EU',
      matterType: 'trademark' as const,
      eventType: 'renewal' as const,
      triggerType: 'renewal_due' as const,
      daysOffset: 0,
      isBusinessDays: true,
      gracePeriodDays: 180,
      priority: 1,
      description: 'EUIPO trademark renewal due',
    },
    {
      jurisdiction: 'BG',
      matterType: 'trademark' as const,
      eventType: 'renewal' as const,
      triggerType: 'renewal_due' as const,
      daysOffset: 0,
      isBusinessDays: true,
      gracePeriodDays: 180,
      priority: 2,
      description: 'BPO trademark renewal due',
    },
    {
      jurisdiction: 'EU',
      matterType: 'industrial_design' as const,
      eventType: 'renewal' as const,
      triggerType: 'renewal_due' as const,
      daysOffset: 0,
      isBusinessDays: true,
      gracePeriodDays: 180,
      priority: 1,
      description: 'EUIPO design renewal due',
    },
    {
      jurisdiction: 'BG',
      matterType: 'industrial_design' as const,
      eventType: 'renewal' as const,
      triggerType: 'renewal_due' as const,
      daysOffset: 0,
      isBusinessDays: true,
      gracePeriodDays: 180,
      priority: 2,
      description: 'BPO design renewal due',
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

  console.log(
    'Seeded deadline rules (matter_created + office_action + renewal_due for EU, EP, BG)',
  );

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

  // Demo matter for portal renewals — Acme TM registered with cycle 1 upcoming
  const demoMatterId = '00000000-0000-4000-8000-000000000200';
  const demoIpRightId = '00000000-0000-4000-8000-000000000201';
  const demoRenewalWindowId = '00000000-0000-4000-8000-000000000202';
  const registrationDate = new Date('2016-08-01');
  const renewalDueDate = new Date('2026-08-01');
  const renewalGraceDate = new Date('2027-02-01');

  await prisma.matter.upsert({
    where: { id: demoMatterId },
    update: {
      title: 'ACME® word mark',
      status: 'active',
      assignedToId: ipAttorney.id,
    },
    create: {
      id: demoMatterId,
      clientId: companyClient.id,
      matterType: 'trademark',
      title: 'ACME® word mark',
      status: 'active',
      assignedToId: ipAttorney.id,
      description: 'Seeded demo matter for portal renewals testing',
    },
  });

  await prisma.matterJurisdiction.upsert({
    where: {
      matterId_countryCode: { matterId: demoMatterId, countryCode: 'BG' },
    },
    update: { status: 'approved', localRefNumber: 'BG123456' },
    create: {
      matterId: demoMatterId,
      countryCode: 'BG',
      status: 'approved',
      localRefNumber: 'BG123456',
    },
  });

  await prisma.matterAttributes.upsert({
    where: { matterId: demoMatterId },
    update: {},
    create: { matterId: demoMatterId, attributes: {} },
  });

  await prisma.ipRight.upsert({
    where: { id: demoIpRightId },
    update: {
      status: 'registered',
      registrationNumber: 'BG123456',
      registrationDate,
      expiryDate: renewalDueDate,
    },
    create: {
      id: demoIpRightId,
      matterId: demoMatterId,
      clientId: companyClient.id,
      rightType: 'trademark',
      title: 'ACME® word mark',
      applicationNumber: 'BG2020160001',
      registrationNumber: 'BG123456',
      filingDate: new Date('2016-03-15'),
      registrationDate,
      expiryDate: renewalDueDate,
      jurisdiction: 'BG',
      status: 'registered',
    },
  });

  await prisma.renewalWindow.upsert({
    where: {
      ipRightId_cycleNumber: { ipRightId: demoIpRightId, cycleNumber: 1 },
    },
    update: {
      status: 'upcoming',
      dueDate: renewalDueDate,
      graceDate: renewalGraceDate,
    },
    create: {
      id: demoRenewalWindowId,
      ipRightId: demoIpRightId,
      matterId: demoMatterId,
      clientId: companyClient.id,
      cycleNumber: 1,
      jurisdiction: 'BG',
      dueDate: renewalDueDate,
      graceDate: renewalGraceDate,
      status: 'upcoming',
    },
  });

  console.log(
    'Seeded portal demo: ACME® trademark matter with renewal cycle 1 (upcoming, due Aug 2026)',
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
