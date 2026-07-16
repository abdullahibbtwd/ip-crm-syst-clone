import { ForbiddenException } from '@nestjs/common';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { PortalAccessService } from './portal-access.service';

describe('PortalAccessService', () => {
  const prisma = {
    matter: { findUnique: jest.fn() },
    matterDocument: { findUnique: jest.fn() },
  };
  const service = new PortalAccessService(prisma as unknown as PrismaService);

  const internalUser = {
    userId: 'u1',
    roles: [SYSTEM_ROLES.IP_ATTORNEY],
  } as AuthenticatedUser;

  const portalUser = {
    userId: 'p1',
    roles: [SYSTEM_ROLES.PORTAL_CLIENT],
    clientId: 'c1',
  } as AuthenticatedUser;

  beforeEach(() => jest.clearAllMocks());

  it('isPortalClient detects portal role', () => {
    expect(service.isPortalClient(portalUser)).toBe(true);
    expect(service.isPortalClient(internalUser)).toBe(false);
  });

  it('requireScopeClientId returns null for internal staff', () => {
    expect(service.requireScopeClientId(internalUser)).toBeNull();
  });

  it('requireScopeClientId returns clientId for portal users', () => {
    expect(service.requireScopeClientId(portalUser)).toBe('c1');
  });

  it('requireScopeClientId throws when portal user lacks clientId', () => {
    expect(() =>
      service.requireScopeClientId({
        ...portalUser,
        clientId: undefined,
      } as AuthenticatedUser),
    ).toThrow(ForbiddenException);
  });

  it('assertMatterAccess is no-op for internal staff', async () => {
    await expect(
      service.assertMatterAccess('m1', internalUser),
    ).resolves.toBeUndefined();
    expect(prisma.matter.findUnique).not.toHaveBeenCalled();
  });

  it('assertMatterAccess allows portal user on own matter', async () => {
    prisma.matter.findUnique.mockResolvedValue({ clientId: 'c1' });
    await expect(
      service.assertMatterAccess('m1', portalUser),
    ).resolves.toBeUndefined();
  });

  it('assertMatterAccess denies portal user on foreign matter', async () => {
    prisma.matter.findUnique.mockResolvedValue({ clientId: 'other' });
    await expect(
      service.assertMatterAccess('m1', portalUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertMatterAccess denies when matter is missing', async () => {
    prisma.matter.findUnique.mockResolvedValue(null);
    await expect(
      service.assertMatterAccess('missing', portalUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertDocumentAccess allows portal user on own document', async () => {
    prisma.matterDocument.findUnique.mockResolvedValue({
      matter: { clientId: 'c1' },
    });
    await expect(
      service.assertDocumentAccess('d1', portalUser),
    ).resolves.toBeUndefined();
  });

  it('assertDocumentAccess denies portal user on foreign document', async () => {
    prisma.matterDocument.findUnique.mockResolvedValue({
      matter: { clientId: 'other' },
    });
    await expect(
      service.assertDocumentAccess('d1', portalUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
