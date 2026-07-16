jest.mock('openid-client', () => ({
  randomPKCECodeVerifier: jest.fn(() => 'verifier'),
  calculatePKCECodeChallenge: jest.fn(async () => 'challenge'),
  randomState: jest.fn(() => 'state123'),
  buildAuthorizationUrl: jest.fn((_config, params) => {
    const url = new URL('https://oauth.example/authorize');
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
    return url;
  }),
  authorizationCodeGrant: jest.fn(),
  discovery: jest.fn(async () => ({ issuer: 'https://oauth.example' })),
}));

import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oidc from 'openid-client';
import type { Request, Response } from 'express';
import type { MailboxConnectionsService } from './mailbox-connections.service';
import { MailboxOAuthService } from './mailbox-oauth.service';

describe('MailboxOAuthService', () => {
  let service: MailboxOAuthService;
  let config: { get: jest.Mock; getOrThrow: jest.Mock };
  let connections: { upsertConnection: jest.Mock };
  let res: { redirect: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        const map: Record<string, string> = {
          FRONTEND_URL: 'http://localhost:5173',
          GOOGLE_CLIENT_ID: 'google-id',
          GOOGLE_CLIENT_SECRET: 'google-secret',
          MICROSOFT_CLIENT_ID: 'ms-id',
          MICROSOFT_CLIENT_SECRET: 'ms-secret',
          MICROSOFT_TENANT_ID: 'common',
        };
        return map[key] ?? fallback;
      }),
      getOrThrow: jest.fn((key: string) => {
        const value = config.get(key);
        if (!value) throw new Error(`Missing ${key}`);
        return value;
      }),
    };
    connections = { upsertConnection: jest.fn().mockResolvedValue({ id: 'conn-1' }) };
    res = { redirect: jest.fn() };
    service = new MailboxOAuthService(
      config as unknown as ConfigService,
      connections as unknown as MailboxConnectionsService,
    );
  });

  it('lists configured providers', () => {
    expect(service.getConfiguredProviders()).toEqual([
      expect.objectContaining({ id: 'microsoft', enabled: true }),
      expect.objectContaining({ id: 'google', enabled: true }),
    ]);
  });

  it('startConnect rejects unconfigured providers', async () => {
    config.get.mockReturnValue(undefined);
    await expect(
      service.startConnect('google', 'u1', res as unknown as Response),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('startConnect redirects to provider authorization url', async () => {
    await service.startConnect('google', 'u1', res as unknown as Response);

    expect(oidc.buildAuthorizationUrl).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining('https://oauth.example/authorize'),
    );
  });

  it('handleCallback upserts connection and redirects to settings', async () => {
    (oidc.authorizationCodeGrant as jest.Mock).mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      expires_in: 3600,
      claims: () => ({ email: 'user@firm.com' }),
    });

    const req = {
      protocol: 'http',
      get: jest.fn(() => 'localhost:3000'),
      originalUrl:
        '/api/email-integration/callback/google?code=abc&state=state123',
    } as unknown as Request;

    await service.startConnect('google', 'u1', res as unknown as Response);
    res.redirect.mockClear();

    await service.handleCallback('google', req, res as unknown as Response);

    expect(connections.upsertConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        provider: 'google',
        emailAddress: 'user@firm.com',
        refreshToken: 'refresh',
      }),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/settings/email?connected=google',
    );
  });

  it('handleCallback redirects with error when session expired', async () => {
    const req = {
      protocol: 'http',
      get: jest.fn(() => 'localhost:3000'),
      originalUrl:
        '/api/email-integration/callback/google?code=abc&state=unknown',
    } as unknown as Request;

    await service.handleCallback('google', req, res as unknown as Response);

    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining('settings/email?error='),
    );
    expect(connections.upsertConnection).not.toHaveBeenCalled();
  });

  it('throws for unknown provider', async () => {
    await expect(
      service.startConnect('yahoo', 'u1', res as unknown as Response),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
