import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import type { UserWithAccess } from './user-access';
import { MfaPolicyService } from './mfa-policy.service';
import type { SystemSecretsService } from '../secrets/system-secrets.service';

function makeUser(
  overrides: {
    mfaEnabled?: boolean;
    roles?: string[];
  } = {},
): UserWithAccess {
  const roles = overrides.roles ?? [SYSTEM_ROLES.IP_ATTORNEY];
  return {
    id: 'user-1',
    email: 'ada@example.com',
    mfaEnabled: overrides.mfaEnabled ?? false,
    clientId: null,
    userRoles: roles.map((name) => ({
      role: { name, rolePermissions: [] },
    })),
  } as UserWithAccess;
}

describe('MfaPolicyService', () => {
  let service: MfaPolicyService;
  let secrets: { getNonSecretValue: jest.Mock };

  beforeEach(() => {
    secrets = { getNonSecretValue: jest.fn() };
    service = new MfaPolicyService(secrets as unknown as SystemSecretsService);
  });

  describe('isInternalUser', () => {
    it('returns false for portal clients', () => {
      expect(
        service.isInternalUser(
          makeUser({ roles: [SYSTEM_ROLES.PORTAL_CLIENT] }),
        ),
      ).toBe(false);
    });

    it('returns true for internal roles', () => {
      expect(service.isInternalUser(makeUser())).toBe(true);
    });
  });

  describe('isPolicyRequiredForInternal', () => {
    it('is true only when secret value is "true"', async () => {
      secrets.getNonSecretValue.mockResolvedValue('true');
      await expect(service.isPolicyRequiredForInternal()).resolves.toBe(true);

      secrets.getNonSecretValue.mockResolvedValue('false');
      await expect(service.isPolicyRequiredForInternal()).resolves.toBe(false);
    });
  });

  describe('requiresMfaEnrollment', () => {
    it('returns true for internal users without MFA when policy requires it', async () => {
      secrets.getNonSecretValue.mockResolvedValue('true');
      await expect(
        service.requiresMfaEnrollment(makeUser({ mfaEnabled: false })),
      ).resolves.toBe(true);
    });

    it('returns false for portal clients without checking secrets', async () => {
      await expect(
        service.requiresMfaEnrollment(
          makeUser({ roles: [SYSTEM_ROLES.PORTAL_CLIENT] }),
        ),
      ).resolves.toBe(false);
      expect(secrets.getNonSecretValue).not.toHaveBeenCalled();
    });

    it('returns false when MFA is already enabled', async () => {
      await expect(
        service.requiresMfaEnrollment(makeUser({ mfaEnabled: true })),
      ).resolves.toBe(false);
      expect(secrets.getNonSecretValue).not.toHaveBeenCalled();
    });
  });
});
