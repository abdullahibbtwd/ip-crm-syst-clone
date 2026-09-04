jest.mock('openid-client', () => ({
  randomPKCECodeVerifier: jest.fn(() => 'pkce-verifier'),
  calculatePKCECodeChallenge: jest.fn(() => Promise.resolve('pkce-challenge')),
  randomState: jest.fn(() => 'oauth-state'),
  buildAuthorizationUrl: jest.fn(
    () => new URL('https://login.example.com/authorize?state=oauth-state'),
  ),
  discovery: jest.fn(() => Promise.resolve({ issuer: 'https://login.example.com' })),
  authorizationCodeGrant: jest.fn(() =>
    Promise.resolve({
      claims: () => ({
        email: 'ada@example.com',
        name: 'Ada Lovelace',
      }),
    }),
  ),
}));

import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as oidc from 'openid-client';
import type { AuthCookieService } from './auth-cookie.service';
import type { AuthService } from './auth.service';
import { SsoService } from './sso.service';
import type { UserWithAccess } from './user-access';

function accessUser(overrides: Record<string, unknown> = {}): UserWithAccess {
  return {
    id: 'u1',
    email: 'ada@example.com',
    fullName: 'Ada Lovelace',
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    userRoles: [],
    ...overrides,
  } as unknown as UserWithAccess;
}

describe('SsoService', () => {
  let service: SsoService;
  let config: { get: jest.Mock; getOrThrow: jest.Mock };
  let authService: {
    findUserByEmail: jest.Mock;
    registerPortalFromSso: jest.Mock;
    login: jest.Mock;
    createMfaPendingToken: jest.Mock;
  };
  let cookies: {
    setAuthCookies: jest.Mock;
    setMfaPendingCookie: jest.Mock;
  };
  let secrets: {
    getNonSecretValue: jest.Mock;
    getSecretValue: jest.Mock;
  };
  let res: { redirect: jest.Mock };

  const callbackReq = {
    protocol: 'http',
    get: jest.fn().mockReturnValue('localhost:3000'),
    originalUrl: '/api/auth/sso/microsoft/callback?code=abc&state=oauth-state',
  } as unknown as Request;

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'MICROSOFT_CLIENT_ID') return 'ms-id';
        if (key === 'MICROSOFT_CLIENT_SECRET') return 'ms-secret';
        if (key === 'MICROSOFT_TENANT_ID') return 'common';
        if (key === 'GOOGLE_CLIENT_ID') return 'google-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'google-secret';
        return fallback;
      }),
      getOrThrow: jest.fn().mockReturnValue('http://localhost:5173'),
    };
    authService = {
      findUserByEmail: jest.fn(),
      registerPortalFromSso: jest.fn(),
      login: jest.fn(),
      createMfaPendingToken: jest.fn(),
    };
    cookies = {
      setAuthCookies: jest.fn(),
      setMfaPendingCookie: jest.fn(),
    };
    secrets = {
      getNonSecretValue: jest.fn().mockResolvedValue(null),
      getSecretValue: jest.fn().mockResolvedValue(null),
    };
    res = { redirect: jest.fn() };

    service = new SsoService(
      config as never,
      authService as unknown as AuthService,
      cookies as unknown as AuthCookieService,
      secrets as never,
    );
    await service.refreshCredentials();
    jest.clearAllMocks();
    await service.refreshCredentials();
  });

  describe('getProviders / refreshCredentials', () => {
    it('reports env-backed providers as enabled', async () => {
      const providers = await service.getProviders();
      expect(providers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'microsoft',
            enabled: true,
            redirectUri: 'http://localhost:5173/api/auth/sso/microsoft/callback',
          }),
          expect.objectContaining({
            id: 'google',
            enabled: true,
          }),
        ]),
      );
      expect(service.getProviderSource('microsoft')).toBe('env');
    });

    it('prefers database credentials over env', async () => {
      secrets.getNonSecretValue.mockImplementation(async (_cat, key: string) => {
        if (key === 'microsoft.client_id') return 'db-ms-id';
        if (key === 'microsoft.tenant_id') return 'tenant-db';
        if (key === 'google.client_id') return 'db-google-id';
        return null;
      });
      secrets.getSecretValue.mockImplementation(async (_cat, key: string) => {
        if (key === 'microsoft.client_secret') return 'db-ms-secret';
        if (key === 'google.client_secret') return 'db-google-secret';
        return null;
      });

      await service.refreshCredentials();
      expect(service.getProviderSource('microsoft')).toBe('database');
      expect(service.getProviderSource('google')).toBe('database');
    });
  });

  describe('startLogin', () => {
    it('rejects unknown providers', async () => {
      await expect(
        service.startLogin('okta', res as unknown as Response),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects unconfigured providers', async () => {
      config.get.mockReturnValue('');
      await service.refreshCredentials();

      await expect(
        service.startLogin('microsoft', res as unknown as Response),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('redirects to the provider authorization URL', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'MICROSOFT_CLIENT_ID') return 'ms-id';
        if (key === 'MICROSOFT_CLIENT_SECRET') return 'ms-secret';
        return fallback;
      });
      await service.refreshCredentials();

      await service.startLogin('microsoft', res as unknown as Response);

      expect(oidc.buildAuthorizationUrl).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(
        'https://login.example.com/authorize?state=oauth-state',
      );
    });
  });

  describe('handleCallback', () => {
    beforeEach(async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'MICROSOFT_CLIENT_ID') return 'ms-id';
        if (key === 'MICROSOFT_CLIENT_SECRET') return 'ms-secret';
        return fallback;
      });
      await service.refreshCredentials();
      await service.startLogin('microsoft', res as unknown as Response);
      jest.clearAllMocks();
      config.getOrThrow.mockReturnValue('http://localhost:5173');
    });

    it('signs in an existing user and sets auth cookies', async () => {
      const user = accessUser();
      authService.findUserByEmail.mockResolvedValue(user);
      authService.login.mockResolvedValue({
        mfaRequired: false,
        tokens: { accessToken: 'access', refreshToken: 'refresh' },
        mfaEnrollmentRequired: false,
      });

      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);

      expect(authService.login).toHaveBeenCalledWith(user, { method: 'sso' });
      expect(cookies.setAuthCookies).toHaveBeenCalledWith(
        res,
        'access',
        'refresh',
      );
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/dashboard',
      );
    });

    it('redirects to MFA when required', async () => {
      authService.findUserByEmail.mockResolvedValue(accessUser());
      authService.login.mockResolvedValue({
        mfaRequired: true,
        pendingUserId: 'u1',
      });
      authService.createMfaPendingToken.mockResolvedValue('mfa-jwt');

      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);

      expect(cookies.setMfaPendingCookie).toHaveBeenCalledWith(res, 'mfa-jwt');
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/login?mfa=1',
      );
    });

    it('registers portal users on signup flow', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'google-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'google-secret';
        if (key === 'MICROSOFT_CLIENT_ID') return 'ms-id';
        if (key === 'MICROSOFT_CLIENT_SECRET') return 'ms-secret';
        return fallback;
      });
      await service.refreshCredentials();
      await service.startLogin('google', res as unknown as Response, true);
      (oidc.randomState as jest.Mock).mockReturnValue('oauth-state');
      authService.findUserByEmail.mockResolvedValue(null);
      authService.registerPortalFromSso.mockResolvedValue(accessUser());
      authService.login.mockResolvedValue({
        mfaRequired: false,
        tokens: { accessToken: 'a', refreshToken: 'r' },
      });

      const googleReq = {
        ...callbackReq,
        originalUrl: '/api/auth/sso/google/callback?code=abc&state=oauth-state',
      } as Request;

      await service.handleCallback('google', googleReq, res as unknown as Response);

      expect(authService.registerPortalFromSso).toHaveBeenCalledWith(
        'ada@example.com',
        'Ada Lovelace',
      );
    });

    it('redirects to login with error when user is not provisioned', async () => {
      authService.findUserByEmail.mockResolvedValue(null);

      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/login?error='),
      );
    });

    it('redirects with error when OAuth state is missing or expired', async () => {
      const badReq = {
        ...callbackReq,
        originalUrl: '/api/auth/sso/microsoft/callback?code=abc',
      } as Request;

      await service.handleCallback('microsoft', badReq, res as unknown as Response);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('Missing%20OAuth%20state'),
      );
    });

    it('rejects inactive accounts during callback handling', async () => {
      authService.findUserByEmail.mockResolvedValue(
        accessUser({ isActive: false }),
      );

      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('Account%20is%20inactive'),
      );
    });

    it('redirects to MFA enrollment when policy requires it', async () => {
      authService.findUserByEmail.mockResolvedValue(accessUser());
      authService.login.mockResolvedValue({
        mfaRequired: false,
        tokens: { accessToken: 'a', refreshToken: 'r' },
        mfaEnrollmentRequired: true,
      });

      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/settings?mfa=enroll',
      );
    });
  });

  describe('additional branch coverage', () => {
    async function primeMicrosoftCallback() {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'MICROSOFT_CLIENT_ID') return 'ms-id';
        if (key === 'MICROSOFT_CLIENT_SECRET') return 'ms-secret';
        return fallback;
      });
      await service.refreshCredentials();
      await service.startLogin('microsoft', res as unknown as Response);
      jest.clearAllMocks();
      config.getOrThrow.mockReturnValue('http://localhost:5173');
    }

    it('getProviders marks unconfigured providers as disabled', async () => {
      config.get.mockReturnValue('');
      await service.refreshCredentials();
      const providers = await service.getProviders();
      expect(providers.every((p) => p.enabled === false)).toBe(true);
    });

    it('startLogin works for google provider', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'google-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'google-secret';
        return fallback;
      });
      await service.refreshCredentials();
      await service.startLogin('google', res as unknown as Response);
      expect(oidc.discovery).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalled();
    });

    it('handleCallback rejects expired OAuth state', async () => {
      const expiredReq = {
        ...callbackReq,
        originalUrl:
          '/api/auth/sso/microsoft/callback?code=abc&state=expired-state',
      } as Request;
      await service.handleCallback(
        'microsoft',
        expiredReq,
        res as unknown as Response,
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('SSO%20session%20expired'),
      );
    });

    it('handleCallback rejects OAuth state for wrong provider', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'google-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'google-secret';
        if (key === 'MICROSOFT_CLIENT_ID') return 'ms-id';
        if (key === 'MICROSOFT_CLIENT_SECRET') return 'ms-secret';
        return fallback;
      });
      await service.refreshCredentials();
      await service.startLogin('google', res as unknown as Response);
      jest.clearAllMocks();
      config.getOrThrow.mockReturnValue('http://localhost:5173');

      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('SSO%20session%20expired'),
      );
    });

    it('handleCallback redirects when IdP omits email claim', async () => {
      await primeMicrosoftCallback();
      (oidc.authorizationCodeGrant as jest.Mock).mockResolvedValueOnce({
        claims: () => ({}),
      });
      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('did%20not%20return%20an%20email'),
      );
    });

    it('handleCallback uses preferred_username when email is absent', async () => {
      await primeMicrosoftCallback();
      (oidc.authorizationCodeGrant as jest.Mock).mockResolvedValueOnce({
        claims: () => ({ preferred_username: 'alias@example.com', name: 'Alias' }),
      });
      authService.findUserByEmail.mockResolvedValue(accessUser());
      authService.login.mockResolvedValue({
        mfaRequired: false,
        tokens: { accessToken: 'a', refreshToken: 'r' },
      });
      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);
      expect(authService.findUserByEmail).toHaveBeenCalledWith('alias@example.com');
    });

    it('handleCallback builds name from given_name and family_name', async () => {
      (oidc.authorizationCodeGrant as jest.Mock).mockResolvedValueOnce({
        claims: () => ({
          email: 'new@example.com',
          given_name: 'New',
          family_name: 'Person',
        }),
      });
      authService.findUserByEmail.mockResolvedValue(null);
      await service.startLogin('microsoft', res as unknown as Response, true);
      jest.clearAllMocks();
      config.getOrThrow.mockReturnValue('http://localhost:5173');
      authService.registerPortalFromSso.mockResolvedValue(accessUser());
      authService.login.mockResolvedValue({
        mfaRequired: false,
        tokens: { accessToken: 'a', refreshToken: 'r' },
      });

      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);
      expect(authService.registerPortalFromSso).toHaveBeenCalledWith(
        'new@example.com',
        'New Person',
      );
    });

    it('handleCallback redirects when login returns no tokens', async () => {
      await primeMicrosoftCallback();
      authService.findUserByEmail.mockResolvedValue(accessUser());
      authService.login.mockResolvedValue({
        mfaRequired: false,
        tokens: undefined,
      });
      await service.handleCallback('microsoft', callbackReq, res as unknown as Response);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('SSO%20sign-in%20failed'),
      );
    });

    it('handleCallback includes signup query on signup flow errors', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'google-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'google-secret';
        if (key === 'MICROSOFT_CLIENT_ID') return 'ms-id';
        if (key === 'MICROSOFT_CLIENT_SECRET') return 'ms-secret';
        return fallback;
      });
      await service.refreshCredentials();
      await service.startLogin('google', res as unknown as Response, true);
      jest.clearAllMocks();
      config.getOrThrow.mockReturnValue('http://localhost:5173');
      authService.findUserByEmail.mockResolvedValue(null);
      (oidc.authorizationCodeGrant as jest.Mock).mockRejectedValueOnce(
        new Error('provider down'),
      );

      const googleReq = {
        ...callbackReq,
        originalUrl: '/api/auth/sso/google/callback?code=abc&state=oauth-state',
      } as Request;

      await service.handleCallback('google', googleReq, res as unknown as Response);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining('signup=1'),
      );
    });

    it('refreshCredentials leaves partial env creds as none source', async () => {
      config.get.mockImplementation((key: string, fallback?: string) => {
        if (key === 'MICROSOFT_CLIENT_ID') return 'only-id';
        return fallback ?? '';
      });
      secrets.getNonSecretValue.mockResolvedValue(null);
      secrets.getSecretValue.mockResolvedValue(null);
      await service.refreshCredentials();
      expect(service.getProviderSource('microsoft')).toBe('none');
    });
  });
});
