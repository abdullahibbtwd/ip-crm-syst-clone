import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { IpRightsService } from './ip-rights.service';

describe('IpRightsService', () => {
  let service: IpRightsService;
  let prisma: { ipRight: { findMany: jest.Mock } };
  let portalAccess: { requireScopeClientId: jest.Mock };

  const internalUser = {
    userId: 'u1',
    roles: ['ip_attorney'],
  } as AuthenticatedUser;

  beforeEach(() => {
    prisma = { ipRight: { findMany: jest.fn() } };
    portalAccess = { requireScopeClientId: jest.fn().mockReturnValue(null) };
    service = new IpRightsService(
      prisma as unknown as PrismaService,
      portalAccess as unknown as PortalAccessService,
    );
  });

  it('scopes portal users to their client even if query differs', async () => {
    portalAccess.requireScopeClientId.mockReturnValue('portal-client');
    prisma.ipRight.findMany.mockResolvedValue([]);

    await service.list(internalUser, { clientId: 'other-client', limit: 10 });

    expect(prisma.ipRight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'portal-client' }),
      }),
    );
  });

  it('uppercases jurisdiction filters for internal users', async () => {
    prisma.ipRight.findMany.mockResolvedValue([]);

    await service.list(internalUser, { jurisdiction: 'ep', limit: 10 });

    expect(prisma.ipRight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ jurisdiction: 'EP' }),
      }),
    );
  });

  it('paginates with nextCursor when more rows exist', async () => {
    prisma.ipRight.findMany.mockResolvedValue([
      {
        id: 'a',
        matterId: 'm1',
        clientId: 'c1',
        title: 'T1',
        applicationNumber: null,
        registrationNumber: null,
        jurisdiction: 'EP',
        status: 'filed',
        rightType: 'patent',
        filingDate: null,
        expiryDate: null,
        matter: { id: 'm1', title: 'Matter', matterType: 'patent' },
        client: {
          id: 'c1',
          type: 'company',
          companyName: 'Acme',
          firstName: null,
          lastName: null,
          internalCode: 'CL-1',
        },
      },
      {
        id: 'b',
        matterId: 'm1',
        clientId: 'c1',
        title: 'T2',
        applicationNumber: null,
        registrationNumber: null,
        jurisdiction: 'EP',
        status: 'filed',
        rightType: 'patent',
        filingDate: null,
        expiryDate: null,
        matter: { id: 'm1', title: 'Matter', matterType: 'patent' },
        client: {
          id: 'c1',
          type: 'individual',
          companyName: null,
          firstName: 'Ada',
          lastName: 'Lovelace',
          internalCode: null,
        },
      },
    ]);

    const result = await service.list(internalUser, { limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('a');
    expect(result.items[0].clientName).toBe('Acme');
  });

  it('builds person clientName when companyName is absent', async () => {
    prisma.ipRight.findMany.mockResolvedValue([
      {
        id: 'a',
        matterId: 'm1',
        clientId: 'c1',
        title: 'T1',
        applicationNumber: null,
        registrationNumber: null,
        jurisdiction: 'BG',
        status: 'pending',
        rightType: 'trademark',
        filingDate: null,
        expiryDate: null,
        matter: { id: 'm1', title: 'Matter', matterType: 'trademark' },
        client: {
          id: 'c1',
          type: 'individual',
          companyName: null,
          firstName: 'Grace',
          lastName: 'Hopper',
          internalCode: null,
        },
      },
    ]);

    const result = await service.list(internalUser, { limit: 10 });
    expect(result.items[0].clientName).toBe('Grace Hopper');
    expect(result.nextCursor).toBeNull();
  });
});
