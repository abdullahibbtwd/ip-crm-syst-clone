import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types';
import type { SsoService } from './sso.service';
import { SsoMfaSettingsController } from './sso-mfa-settings.controller';

describe('SsoMfaSettingsController', () => {
  let controller: SsoMfaSettingsController;
  let secrets: {
    getStatuses: jest.Mock;
    getStatus: jest.Mock;
    upsertNonSecret: jest.Mock;
    upsertSecret: jest.Mock;
  };
  let sso: {
    refreshCredentials: jest.Mock;
    getProviders: jest.Mock;
    getProviderSource: jest.Mock;
  };

  const actor = { userId: 'admin-1' } as AuthenticatedUser;
  const req = { user: actor } as Request;

  beforeEach(() => {
    secrets = {
      getStatuses: jest.fn().mockResolvedValue([
        {
          configured: true,
          lastFour: '1234',
          nonSecretValue: 'ms-client-id',
        },
        { configured: true, lastFour: 'abcd' },
        { configured: true, nonSecretValue: 'common' },
        {
          configured: true,
          lastFour: '5678',
          nonSecretValue: 'google-client-id',
        },
        { configured: false, lastFour: null },
      ]),
      getStatus: jest.fn().mockResolvedValue({ nonSecretValue: 'true' }),
      upsertNonSecret: jest.fn().mockResolvedValue(undefined),
      upsertSecret: jest.fn().mockResolvedValue(undefined),
    };
    sso = {
      refreshCredentials: jest.fn().mockResolvedValue(undefined),
      getProviders: jest.fn().mockResolvedValue([
        {
          id: 'microsoft',
          name: 'Microsoft',
          enabled: true,
          redirectUri: 'http://localhost:5173/api/auth/sso/microsoft/callback',
        },
        {
          id: 'google',
          name: 'Google',
          enabled: false,
        },
      ]),
      getProviderSource: jest.fn((provider: string) =>
        provider === 'microsoft' ? 'database' : 'env',
      ),
    };

    controller = new SsoMfaSettingsController(secrets as never, sso as unknown as SsoService);
  });

  it('getSettings aggregates provider and MFA policy status', async () => {
    const result = await controller.getSettings();

    expect(sso.refreshCredentials).toHaveBeenCalled();
    expect(result).toMatchObject({
      providers: expect.any(Array),
      microsoft: {
        clientIdConfigured: true,
        clientIdLastFour: '1234',
        clientId: 'ms-client-id',
        clientSecretConfigured: true,
        tenantId: 'common',
        source: 'database',
        redirectUri: 'http://localhost:5173/api/auth/sso/microsoft/callback',
      },
      google: {
        clientIdConfigured: true,
        clientSecretConfigured: false,
        source: 'env',
      },
      mfa: { requireInternal: true },
    });
  });

  it('upsertSettings writes provided secrets and returns refreshed settings', async () => {
    const dto = {
      microsoftClientId: 'new-ms-id',
      microsoftClientSecret: 'new-ms-secret',
      microsoftTenantId: ' tenant-1 ',
      googleClientId: 'new-google-id',
      requireMfaForInternal: false,
    };

    const result = await controller.upsertSettings(dto, req);

    expect(secrets.upsertNonSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'microsoft.client_id',
        value: 'new-ms-id',
        updatedById: 'admin-1',
      }),
    );
    expect(secrets.upsertSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'microsoft.client_secret',
        plaintext: 'new-ms-secret',
        updatedById: 'admin-1',
      }),
    );
    expect(secrets.upsertNonSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'microsoft.tenant_id',
        value: 'tenant-1',
      }),
    );
    expect(secrets.upsertNonSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'require_internal',
        value: 'false',
      }),
    );
    expect(sso.refreshCredentials).toHaveBeenCalledTimes(2);
    expect(result.mfa.requireInternal).toBe(true);
  });

  it('skips empty optional fields on upsert', async () => {
    await controller.upsertSettings({}, req);

    expect(secrets.upsertNonSecret).not.toHaveBeenCalled();
    expect(secrets.upsertSecret).not.toHaveBeenCalled();
  });
});
