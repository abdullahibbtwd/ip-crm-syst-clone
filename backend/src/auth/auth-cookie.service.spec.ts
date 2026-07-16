import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ACCESS_COOKIE,
  AuthCookieService,
  MFA_PENDING_COOKIE,
  REFRESH_COOKIE,
} from './auth-cookie.service';
import {
  jwtFromCookieOrHeader,
  mfaPendingFromCookie,
} from './auth-cookie.extractor';

describe('AuthCookieService', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:5173';
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return fallback;
    }),
  };
  const service = new AuthCookieService(config as unknown as ConfigService);
  const res = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(() => jest.clearAllMocks());

  it('setAuthCookies / setMfaPendingCookie / clearAuthCookies', () => {
    service.setAuthCookies(res, 'access', 'refresh');
    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      'access',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'refresh',
      expect.objectContaining({ httpOnly: true }),
    );

    service.setMfaPendingCookie(res, 'mfa');
    expect(res.cookie).toHaveBeenCalledWith(
      MFA_PENDING_COOKIE,
      'mfa',
      expect.objectContaining({ maxAge: 5 * 60 * 1000 }),
    );

    service.clearAuthCookies(res);
    expect(res.clearCookie).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      expect.any(Object),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      expect.any(Object),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      MFA_PENDING_COOKIE,
      expect.any(Object),
    );
  });

  it('honors COOKIE_SECURE=true', () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'COOKIE_SECURE') return 'true';
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return fallback;
    });
    const secureService = new AuthCookieService(
      config as unknown as ConfigService,
    );
    secureService.setAuthCookies(res, 'a', 'r');
    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      'a',
      expect.objectContaining({ secure: true }),
    );
  });
});

describe('auth-cookie.extractor', () => {
  it('jwtFromCookieOrHeader prefers cookie', () => {
    const req = {
      cookies: { [ACCESS_COOKIE]: 'from-cookie' },
      headers: {},
    } as never;
    expect(jwtFromCookieOrHeader(req)).toBe('from-cookie');
  });

  it('mfaPendingFromCookie reads cookie', () => {
    expect(
      mfaPendingFromCookie({
        cookies: { [MFA_PENDING_COOKIE]: 'pending' },
      } as never),
    ).toBe('pending');
    expect(mfaPendingFromCookie({ cookies: {} } as never)).toBeNull();
  });
});
