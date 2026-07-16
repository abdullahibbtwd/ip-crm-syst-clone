import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  INTEGRATION_SECRET_KEYS,
  SYSTEM_SECRET_CATEGORY,
} from '../secrets/secrets.constants';
import type { SystemSecretsService } from '../secrets/system-secrets.service';
import { IntegrationsSettingsController } from './integrations-settings.controller';
import type { EpoProvider } from './providers/epo.provider';

describe('IntegrationsSettingsController', () => {
  const secrets = {
    getStatuses: jest.fn(),
    upsertSecret: jest.fn(),
    upsertNonSecret: jest.fn(),
    deleteSecret: jest.fn(),
  };
  const epo = {
    refreshCredentials: jest.fn(),
    isConfigured: jest.fn(),
    getCredentialSource: jest.fn(),
  };

  const controller = new IntegrationsSettingsController(
    secrets as unknown as SystemSecretsService,
    epo as unknown as EpoProvider,
  );

  const req = {
    user: { userId: 'admin-1' } as AuthenticatedUser,
  } as Request;

  const statusPayload = {
    configured: true,
    lastFour: '1234',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    secrets.getStatuses.mockResolvedValue([
      statusPayload,
      statusPayload,
      { configured: true, nonSecretValue: 'https://api.epo.org', updatedAt: null },
      { configured: true, nonSecretValue: 'https://auth.epo.org', updatedAt: null },
    ]);
    epo.isConfigured.mockReturnValue(true);
    epo.getCredentialSource.mockReturnValue('db');
  });

  it('forwards getEpoCredentialsStatus aggregation', async () => {
    await expect(controller.getEpoCredentialsStatus()).resolves.toMatchObject({
      provider: 'epo',
      configured: true,
      source: 'db',
      apiBaseUrl: 'https://api.epo.org',
    });

    expect(secrets.getStatuses).toHaveBeenCalledWith(
      SYSTEM_SECRET_CATEGORY.INTEGRATION,
      [
        INTEGRATION_SECRET_KEYS.EPO_CONSUMER_KEY,
        INTEGRATION_SECRET_KEYS.EPO_CONSUMER_SECRET,
        INTEGRATION_SECRET_KEYS.EPO_API_BASE_URL,
        INTEGRATION_SECRET_KEYS.EPO_AUTH_URL,
      ],
    );
    expect(epo.refreshCredentials).toHaveBeenCalled();
  });

  it('forwards upsertEpoCredentials secret writes', async () => {
    await controller.upsertEpoCredentials(
      {
        consumerKey: ' key ',
        consumerSecret: ' secret ',
        apiBaseUrl: ' https://api.example ',
        authUrl: '',
      } as never,
      req,
    );

    expect(secrets.upsertSecret).toHaveBeenCalledTimes(2);
    expect(secrets.upsertNonSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        key: INTEGRATION_SECRET_KEYS.EPO_API_BASE_URL,
        value: 'https://api.example',
        updatedById: 'admin-1',
      }),
    );
    expect(secrets.deleteSecret).toHaveBeenCalledWith(
      SYSTEM_SECRET_CATEGORY.INTEGRATION,
      INTEGRATION_SECRET_KEYS.EPO_AUTH_URL,
    );
    expect(epo.refreshCredentials).toHaveBeenCalled();
  });

  it('forwards clearEpoCredentials', async () => {
    await controller.clearEpoCredentials();

    expect(secrets.deleteSecret).toHaveBeenCalledTimes(4);
    expect(epo.refreshCredentials).toHaveBeenCalled();
  });
});
