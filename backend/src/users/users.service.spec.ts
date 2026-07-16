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
        upsert: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      userRole: { upsert: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    service = new UsersService(prisma as unknown as PrismaService);
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

    it('upserts a team user and replaces roles', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: SYSTEM_ROLES.IP_ATTORNEY,
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.upsert.mockResolvedValue(listUser());
      prisma.user.findUniqueOrThrow.mockResolvedValue(listUser());
      // replaceTeamRoles looks up role again + portal role
      prisma.role.findUnique
        .mockResolvedValueOnce({
          id: 'role-1',
          name: SYSTEM_ROLES.IP_ATTORNEY,
        })
        .mockResolvedValueOnce({
          id: 'role-1',
          name: SYSTEM_ROLES.IP_ATTORNEY,
        })
        .mockResolvedValueOnce({ id: 'portal-role' });

      // Actually invite calls findUnique once for role, then replaceTeamRoles calls twice
      prisma.role.findUnique.mockReset();
      prisma.role.findUnique.mockImplementation(({ where: { name } }) => {
        if (name === SYSTEM_ROLES.PORTAL_CLIENT) {
          return Promise.resolve({ id: 'portal-role' });
        }
        return Promise.resolve({ id: 'role-1', name });
      });

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
  });
});
