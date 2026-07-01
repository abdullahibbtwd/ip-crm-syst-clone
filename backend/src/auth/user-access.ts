import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from './auth.types';

export const userAccessInclude = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithAccess = Prisma.UserGetPayload<{
  include: typeof userAccessInclude;
}>;

export function buildAuthenticatedUser(user: UserWithAccess): AuthenticatedUser {
  const roles = user.userRoles.map((entry) => entry.role.name);
  const permissions = [
    ...new Set(
      user.userRoles.flatMap((entry) =>
        entry.role.rolePermissions.map(
          (rp) => `${rp.permission.resource}:${rp.permission.action}`,
        ),
      ),
    ),
  ];

  return {
    sub: user.id,
    userId: user.id,
    email: user.email,
    roles,
    permissions,
    clientId: user.clientId,
    type: 'access',
  };
}
