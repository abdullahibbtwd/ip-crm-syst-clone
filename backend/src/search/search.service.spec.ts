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

  it('searches matters, correspondence, documents, and emails when permitted', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 'm1',
          title: 'Matter A',
          subtitle: 'Acme',
          snippet: 'desc',
          href: '/matters/m1',
          rank: 0.8,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'corr1',
          title: 'Subject',
          subtitle: 'Matter A',
          snippet: 'body',
          href: '/matters/m1/correspondence',
          rank: 0.7,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'd1',
          title: 'Spec.pdf',
          subtitle: 'Matter A',
          snippet: null,
          href: '/matters/m1/documents',
          rank: 0.6,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'e1',
          title: 'Unlinked',
          subtitle: 'sender@x.com',
          snippet: 'email body',
          href: '/email-queue',
          rank: 0.5,
        },
      ]);

    const user = {
      userId: 'u1',
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      permissions: [
        'matter:read',
        'correspondence:read',
        'document:read',
        'email_queue:read',
      ],
    } as AuthenticatedUser;

    const result = await service.search('mark', user);

    expect(result.results).toHaveLength(4);
    expect(result.results.map((r) => r.type)).toEqual(
      expect.arrayContaining([
        'matter',
        'correspondence',
        'document',
        'unlinked_email',
      ]),
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(4);
  });

  it('scopes matters to assigned attorney when not elevated', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    const user = {
      userId: 'u-attorney',
      roles: [SYSTEM_ROLES.IP_ATTORNEY],
      permissions: ['matter:read'],
    } as AuthenticatedUser;

    await service.search('mark', user);

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('portal users use portal search path with client scope', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'm1',
        title: 'Portal Matter',
        subtitle: 'Acme',
        snippet: null,
        href: '/matters/m1',
        rank: 0.9,
      },
    ]);
    const user = {
      roles: [SYSTEM_ROLES.PORTAL_CLIENT],
      permissions: ['matter:read'],
      clientId: 'c1',
    } as AuthenticatedUser;

    const result = await service.search('mark', user);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('matter');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('portal users without clientId return empty results', async () => {
    const user = {
      roles: [SYSTEM_ROLES.PORTAL_CLIENT],
      permissions: ['matter:read'],
    } as AuthenticatedUser;

    await expect(service.search('mark', user)).resolves.toEqual({
      query: 'mark',
      results: [],
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('sorts combined results by rank descending', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 'c1',
          title: 'Low rank client',
          subtitle: 'CL-1',
          snippet: null,
          href: '/clients/c1',
          rank: 0.2,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'm1',
          title: 'High rank matter',
          subtitle: 'Acme',
          snippet: null,
          href: '/matters/m1',
          rank: 0.95,
        },
      ]);

    const user = {
      userId: 'u1',
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      permissions: ['client:read', 'matter:read'],
    } as AuthenticatedUser;

    const result = await service.search('acme', user);

    expect(result.results[0].id).toBe('m1');
    expect(result.results[1].id).toBe('c1');
  });
});
