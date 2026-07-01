export const SYSTEM_ROLES = {
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

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const RESOURCES = [
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
] as const;

export const ACTIONS = ['read', 'create', 'update', 'delete'] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];

export function permissionKey(resource: Resource, action: Action): string {
  return `${resource}:${action}`;
}

export const ALL_PERMISSIONS = RESOURCES.flatMap((resource) =>
  ACTIONS.map((action) => ({
    resource,
    action,
    key: permissionKey(resource, action),
  })),
);

export const ROLE_DEFINITIONS: Record<
  SystemRole,
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
    ],
  },
};

export const PORTAL_ACCESS_POLICY = {
  resource: 'matter',
  condition: { client_id: '$user.client_id' },
};
