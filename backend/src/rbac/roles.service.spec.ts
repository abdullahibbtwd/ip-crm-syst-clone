import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: { role: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { role: { findMany: jest.fn() } };
    service = new RolesService(prisma as unknown as PrismaService);
  });

  it('returns an empty matrix when no roles exist', async () => {
    prisma.role.findMany.mockResolvedValue([]);
    await expect(service.listMatrix()).resolves.toEqual({ roles: [] });
  });

  it('maps and sorts resource:action permissions', async () => {
    prisma.role.findMany.mockResolvedValue([
      {
        id: 'r1',
        name: 'ip_attorney',
        description: 'IP attorney',
        isSystem: true,
        rolePermissions: [
          { permission: { resource: 'matter', action: 'update' } },
          { permission: { resource: 'matter', action: 'read' } },
        ],
      },
    ]);

    const result = await service.listMatrix();

    expect(result.roles).toEqual([
      {
        id: 'r1',
        name: 'ip_attorney',
        description: 'IP attorney',
        isSystem: true,
        permissions: ['matter:read', 'matter:update'],
      },
    ]);
  });
});
