import { buildAuthenticatedUser, type UserWithAccess } from './user-access';

function makeUser(
  overrides: Partial<{
    id: string;
    email: string;
    clientId: string | null;
    roles: Array<{
      name: string;
      permissions: Array<{ resource: string; action: string }>;
    }>;
  }> = {},
): UserWithAccess {
  const roles = overrides.roles ?? [
    {
      name: 'ip_attorney',
      permissions: [
        { resource: 'matter', action: 'read' },
        { resource: 'matter', action: 'update' },
      ],
    },
  ];

  return {
    id: overrides.id ?? 'user-1',
    email: overrides.email ?? 'ada@example.com',
    clientId: overrides.clientId ?? null,
    userRoles: roles.map((role) => ({
      role: {
        name: role.name,
        rolePermissions: role.permissions.map((permission) => ({
          permission,
        })),
      },
    })),
  } as UserWithAccess;
}

describe('user-access', () => {
  describe('buildAuthenticatedUser', () => {
    it('flattens roles and unique permissions', () => {
      const user = makeUser({
        roles: [
          {
            name: 'ip_attorney',
            permissions: [
              { resource: 'matter', action: 'read' },
              { resource: 'matter', action: 'update' },
            ],
          },
          {
            name: 'paralegal',
            permissions: [
              { resource: 'matter', action: 'read' },
              { resource: 'document', action: 'read' },
            ],
          },
        ],
      });

      const result = buildAuthenticatedUser(user);

      expect(result).toEqual({
        sub: 'user-1',
        userId: 'user-1',
        email: 'ada@example.com',
        roles: ['ip_attorney', 'paralegal'],
        permissions: ['matter:read', 'matter:update', 'document:read'],
        clientId: null,
        type: 'access',
      });
    });

    it('preserves portal clientId', () => {
      const user = makeUser({ clientId: 'client-9' });
      expect(buildAuthenticatedUser(user).clientId).toBe('client-9');
    });

    it('handles users with no roles', () => {
      const user = makeUser({ roles: [] });
      const result = buildAuthenticatedUser(user);
      expect(result.roles).toEqual([]);
      expect(result.permissions).toEqual([]);
    });
  });
});
