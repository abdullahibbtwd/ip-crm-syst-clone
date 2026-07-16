import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import type { AuthCookieService } from './auth-cookie.service';
import type { AuthService } from './auth.service';
import type { SsoService } from './sso.service';

describe('AuthController', () => {
  const authService = {
    login: jest.fn(),
    createMfaPendingToken: jest.fn(),
    registerPortalClient: jest.fn(),
    verifyMfaAndLogin: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    getProfile: jest.fn(),
    startMfaSetup: jest.fn(),
    enableMfa: jest.fn(),
    disableMfa: jest.fn(),
    regenerateBackupCodes: jest.fn(),
  };
  const ssoService = {
    getProviders: jest.fn(),
    startLogin: jest.fn(),
    handleCallback: jest.fn(),
  };
  const cookies = {
    setMfaPendingCookie: jest.fn(),
    setAuthCookies: jest.fn(),
    clearAuthCookies: jest.fn(),
  };

  const controller = new AuthController(
    authService as unknown as AuthService,
    ssoService as unknown as SsoService,
    cookies as unknown as AuthCookieService,
  );

  const res = {} as Response;

  beforeEach(() => jest.clearAllMocks());

  it('getSsoProviders', async () => {
    ssoService.getProviders.mockResolvedValue([{ id: 'google' }]);
    await expect(controller.getSsoProviders()).resolves.toEqual({
      providers: [{ id: 'google' }],
    });
  });

  it('login sets MFA cookie when required', async () => {
    const req = { user: { id: 'u1' } } as unknown as Request;
    authService.login.mockResolvedValue({
      mfaRequired: true,
      pendingUserId: 'u1',
    });
    authService.createMfaPendingToken.mockResolvedValue('mfa-tok');

    await expect(controller.login(req, res, {} as never)).resolves.toEqual({
      mfaRequired: true,
    });
    expect(cookies.setMfaPendingCookie).toHaveBeenCalledWith(res, 'mfa-tok');
  });

  it('login sets auth cookies on success', async () => {
    const req = { user: { id: 'u1' } } as unknown as Request;
    authService.login.mockResolvedValue({
      mfaRequired: false,
      user: { id: 'u1' },
      tokens: { accessToken: 'a', refreshToken: 'r' },
      mfaEnrollmentRequired: false,
    });

    await expect(controller.login(req, res, {} as never)).resolves.toEqual({
      user: { id: 'u1' },
      mfaEnrollmentRequired: false,
    });
    expect(cookies.setAuthCookies).toHaveBeenCalledWith(res, 'a', 'r');
  });

  it('register rejects unexpected MFA', async () => {
    authService.registerPortalClient.mockResolvedValue({ id: 'u1' });
    authService.login.mockResolvedValue({ mfaRequired: true });
    await expect(
      controller.register({} as never, res),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('register sets cookies', async () => {
    authService.registerPortalClient.mockResolvedValue({ id: 'u1' });
    authService.login.mockResolvedValue({
      mfaRequired: false,
      user: { id: 'u1' },
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });
    await expect(controller.register({} as never, res)).resolves.toEqual({
      user: { id: 'u1' },
    });
    expect(cookies.setAuthCookies).toHaveBeenCalledWith(res, 'a', 'r');
  });

  it('verifyMfa requires pending cookie', async () => {
    const req = { cookies: {} } as Request;
    await expect(
      controller.verifyMfa(req, res, { code: '123456' } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifyMfa swaps cookies', async () => {
    const req = {
      cookies: { ip_crm_mfa_pending: 'pending' },
    } as unknown as Request;
    authService.verifyMfaAndLogin.mockResolvedValue({
      user: { id: 'u1' },
      tokens: { accessToken: 'a', refreshToken: 'r' },
    });

    await expect(
      controller.verifyMfa(req, res, { code: '123456' } as never),
    ).resolves.toEqual({ user: { id: 'u1' } });
    expect(cookies.clearAuthCookies).toHaveBeenCalledWith(res);
    expect(cookies.setAuthCookies).toHaveBeenCalledWith(res, 'a', 'r');
  });

  it('refresh requires cookie', async () => {
    await expect(
      controller.refresh({ cookies: {} } as Request, res),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh rotates tokens', async () => {
    const req = {
      cookies: { ip_crm_refresh: 'rt' },
    } as unknown as Request;
    authService.refresh.mockResolvedValue({
      user: { id: 'u1' },
      tokens: { accessToken: 'a2', refreshToken: 'r2' },
    });
    await expect(controller.refresh(req, res)).resolves.toEqual({
      user: { id: 'u1' },
    });
    expect(cookies.setAuthCookies).toHaveBeenCalledWith(res, 'a2', 'r2');
  });

  it('logout clears cookies', async () => {
    const req = {
      cookies: { ip_crm_refresh: 'rt' },
    } as unknown as Request;
    await expect(controller.logout(req, res)).resolves.toEqual({
      success: true,
    });
    expect(authService.logout).toHaveBeenCalledWith('rt');
    expect(cookies.clearAuthCookies).toHaveBeenCalledWith(res);
  });

  it('password + profile + mfa endpoints forward', async () => {
    const req = { user: { userId: 'u1' } } as unknown as Request;
    authService.requestPasswordReset.mockResolvedValue({ message: 'ok' });
    authService.resetPassword.mockResolvedValue({ message: 'done' });
    authService.getProfile.mockResolvedValue({ id: 'u1' });
    authService.startMfaSetup.mockResolvedValue({ secret: 's' });
    authService.enableMfa.mockResolvedValue({ user: { id: 'u1' } });
    authService.disableMfa.mockResolvedValue({ id: 'u1' });
    authService.regenerateBackupCodes.mockResolvedValue(['A']);

    await controller.forgotPassword({ email: 'a@x.com' } as never);
    await controller.resetPassword({
      token: 't',
      password: 'p',
    } as never);
    await controller.me(req);
    await controller.startMfaSetup(req);
    await controller.enableMfa(req, { code: '123456' } as never);
    await controller.disableMfa(req, {
      password: 'p',
      code: '123456',
    } as never);
    await controller.regenerateBackupCodes(req, { code: '123456' } as never);

    expect(authService.requestPasswordReset).toHaveBeenCalledWith('a@x.com');
    expect(authService.resetPassword).toHaveBeenCalledWith('t', 'p');
    expect(authService.getProfile).toHaveBeenCalledWith('u1');
    expect(authService.startMfaSetup).toHaveBeenCalledWith('u1');
    expect(authService.enableMfa).toHaveBeenCalledWith('u1', '123456');
    expect(authService.disableMfa).toHaveBeenCalledWith('u1', 'p', '123456');
    expect(authService.regenerateBackupCodes).toHaveBeenCalledWith(
      'u1',
      '123456',
    );
  });
});
