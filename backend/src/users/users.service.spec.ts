import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { UsersService } from './users.service';

function listUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'ada@example.com',
    fullName: 'Ada Lovelace',
    isActive: true,
    mfaEnabled: false,
    passwordHash: null,
    clientId: null,
    lastLoginAt: null,
    createdAt: new Date(),
    portalClient: null,
    userRoles: [{ role: { name: SYSTEM_ROLES.IP_ATTORNEY } }],
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    role: { findUnique: jest.Mock };
    client: { findFirst: jest.Mock };
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    userRole: { upsert: jest.Mock; deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      role: { findUnique: jest.fn() },
      client: { findFirst: jest.fn() },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      userRole: { upsert: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns paginated team users', async () => {
      prisma.user.findMany.mockResolvedValue([
        listUser({ id: 'u1' }),
        listUser({ id: 'u2' }),
        listUser({ id: 'u3' }),
      ]);

      const result = await service.findAll({ limit: 2 } as never);

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('u2');
      expect(result.items[0].authMethod).toBe('sso');
    });

    it('filters team users by role', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll({
        segment: 'team',
        role: SYSTEM_ROLES.IP_ATTORNEY,
        limit: 20,
      } as never);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              {
                userRoles: {
                  some: { role: { name: SYSTEM_ROLES.IP_ATTORNEY } },
                },
              },
            ]),
          }),
        }),
      );
    });
  });

  describe('listAttorneyAssignees', () => {
    it('maps active attorneys', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          fullName: 'Ada',
          email: 'ada@example.com',
          userRoles: [{ role: { name: SYSTEM_ROLES.IP_ATTORNEY } }],
        },
      ]);

      await expect(service.listAttorneyAssignees()).resolves.toEqual([
        {
          id: 'u1',
          fullName: 'Ada',
          email: 'ada@example.com',
          roles: [SYSTEM_ROLES.IP_ATTORNEY],
        },
      ]);
    });
  });

  describe('listTeamMembers', () => {
    it('maps active team members', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u2',
          fullName: 'Bob',
          email: 'bob@example.com',
          userRoles: [{ role: { name: SYSTEM_ROLES.PARALEGAL } }],
        },
      ]);

      await expect(service.listTeamMembers()).resolves.toEqual([
        expect.objectContaining({ id: 'u2', roles: [SYSTEM_ROLES.PARALEGAL] }),
      ]);
    });
  });

  describe('invite', () => {
    it('requires clientCode for portal_client', async () => {
      await expect(
        service.invite({
          email: 'portal@x.com',
          fullName: 'Portal User',
          role: SYSTEM_ROLES.PORTAL_CLIENT,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects clientCode on team invites', async () => {
      await expect(
        service.invite({
          email: 'team@x.com',
          fullName: 'Team User',
          role: SYSTEM_ROLES.IP_ATTORNEY,
          clientCode: 'CL-2026-001',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects unseeded role', async () => {
      prisma.role.findUnique.mockResolvedValue(null);
      await expect(
        service.invite({
          email: 'x@example.com',
          fullName: 'X',
          role: SYSTEM_ROLES.IP_ATTORNEY,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects unknown client code for portal invite', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'portal-role',
        name: SYSTEM_ROLES.PORTAL_CLIENT,
      });
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.invite({
          email: 'portal@x.com',
          fullName: 'Portal User',
          role: SYSTEM_ROLES.PORTAL_CLIENT,
          clientCode: 'CL-MISSING',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('invites portal client and assigns portal role', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'portal-role',
        name: SYSTEM_ROLES.PORTAL_CLIENT,
      });
      prisma.client.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.upsert.mockResolvedValue(
        listUser({
          clientId: 'c1',
          userRoles: [{ role: { name: SYSTEM_ROLES.PORTAL_CLIENT } }],
        }),
      );
      prisma.user.findUniqueOrThrow.mockResolvedValue(
        listUser({
          clientId: 'c1',
          userRoles: [{ role: { name: SYSTEM_ROLES.PORTAL_CLIENT } }],
        }),
      );

      const result = await service.invite({
        email: 'portal@x.com',
        fullName: 'Portal User',
        role: SYSTEM_ROLES.PORTAL_CLIENT,
        clientCode: 'CL-2026-001',
      });

      expect(prisma.userRole.upsert).toHaveBeenCalled();
      expect(result.roles).toContain(SYSTEM_ROLES.PORTAL_CLIENT);
    });

    it('rejects team invite for existing portal user email', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: SYSTEM_ROLES.IP_ATTORNEY,
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u2',
        clientId: 'c1',
        userRoles: [{ role: { name: SYSTEM_ROLES.PORTAL_CLIENT } }],
      });

      await expect(
        service.invite({
          email: 'portal@x.com',
          fullName: 'Portal User',
          role: SYSTEM_ROLES.IP_ATTORNEY,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upserts a team user and replaces roles', async () => {
      prisma.role.findUnique.mockImplementation(({ where: { name } }) => {
        if (name === SYSTEM_ROLES.PORTAL_CLIENT) {
          return Promise.resolve({ id: 'portal-role' });
        }
        return Promise.resolve({ id: 'role-1', name });
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.upsert.mockResolvedValue(listUser());
      prisma.user.findUniqueOrThrow.mockResolvedValue(listUser());

      const result = await service.invite({
        email: ' Ada@Example.com ',
        fullName: ' Ada Lovelace ',
        role: SYSTEM_ROLES.IP_ATTORNEY,
      });

      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'ada@example.com' },
        }),
      );
      expect(result.email).toBe('ada@example.com');
      expect(result.roles).toContain(SYSTEM_ROLES.IP_ATTORNEY);
    });
  });

  describe('updateRole', () => {
    it('rejects self role changes', async () => {
      await expect(
        service.updateRole(
          'u1',
          { role: SYSTEM_ROLES.PARALEGAL },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects portal client role changes', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u2',
        userRoles: [{ role: { name: SYSTEM_ROLES.PORTAL_CLIENT } }],
      });
      await expect(
        service.updateRole(
          'u2',
          { role: SYSTEM_ROLES.IP_ATTORNEY },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateRole(
          'missing',
          { role: SYSTEM_ROLES.PARALEGAL },
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates team user role', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u2',
        userRoles: [{ role: { name: SYSTEM_ROLES.PARALEGAL } }],
      });
      prisma.role.findUnique.mockImplementation(({ where: { name } }) => {
        if (name === SYSTEM_ROLES.PORTAL_CLIENT) {
          return Promise.resolve({ id: 'portal-role' });
        }
        return Promise.resolve({ id: 'role-1', name });
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue(
        listUser({
          id: 'u2',
          userRoles: [{ role: { name: SYSTEM_ROLES.IP_ATTORNEY } }],
        }),
      );

      const result = await service.updateRole(
        'u2',
        { role: SYSTEM_ROLES.IP_ATTORNEY },
        'u1',
      );

      expect(result.roles).toContain(SYSTEM_ROLES.IP_ATTORNEY);
    });

    it('rejects invalid team role', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u2',
        userRoles: [{ role: { name: SYSTEM_ROLES.PARALEGAL } }],
      });

      await expect(
        service.updateRole(
          'u2',
          { role: SYSTEM_ROLES.PORTAL_CLIENT },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
