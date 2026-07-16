import type { AuthenticatedUser } from '../auth/auth.types';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn() };
    service = new SearchService(prisma as unknown as PrismaService);
  });

  it('returns empty results for short queries', async () => {
    const user = { roles: [], permissions: [] } as AuthenticatedUser;
    await expect(service.search('a', user)).resolves.toEqual({
      query: 'a',
      results: [],
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('searches clients when permitted', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'c1',
        title: 'Acme',
        subtitle: 'CL-1',
        snippet: null,
        href: '/clients/c1',
        rank: 0.9,
      },
    ]);
    const user = {
      roles: [SYSTEM_ROLES.IP_ATTORNEY],
      permissions: ['client:read'],
    } as AuthenticatedUser;

    const result = await service.search('ac', user);
    expect(result.results).toEqual([
      expect.objectContaining({
        id: 'c1',
        type: 'client',
        title: 'Acme',
      }),
    ]);
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('portal users use portal search path', async () => {
    const user = {
      roles: [SYSTEM_ROLES.PORTAL_CLIENT],
      permissions: [],
      clientId: 'c1',
    } as AuthenticatedUser;

    await expect(service.search('mark', user)).resolves.toEqual({
      query: 'mark',
      results: [],
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
