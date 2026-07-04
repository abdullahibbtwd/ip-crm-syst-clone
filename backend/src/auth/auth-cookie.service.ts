import type { CookieOptions, Response } from 'express';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const ACCESS_COOKIE = 'ip_crm_access';
export const REFRESH_COOKIE = 'ip_crm_refresh';
export const MFA_PENDING_COOKIE = 'ip_crm_mfa_pending';

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService) {}

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    res.cookie(ACCESS_COOKIE, accessToken, this.accessOptions());
    res.cookie(REFRESH_COOKIE, refreshToken, this.refreshOptions());
  }

  setMfaPendingCookie(res: Response, token: string): void {
    res.cookie(MFA_PENDING_COOKIE, token, {
      ...this.baseOptions(),
      maxAge: 5 * 60 * 1000,
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, this.clearOptions());
    res.clearCookie(REFRESH_COOKIE, this.clearOptions());
    res.clearCookie(MFA_PENDING_COOKIE, this.clearOptions());
  }

  private accessOptions(): CookieOptions {
    return {
      ...this.baseOptions(),
      maxAge: this.durationMs(
        this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        15 * 60 * 1000,
      ),
    };
  }

  private refreshOptions(): CookieOptions {
    return {
      ...this.baseOptions(),
      maxAge: this.durationMs(
        this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        7 * 24 * 60 * 60 * 1000,
      ),
    };
  }

  private baseOptions(): CookieOptions {
    const secure = this.cookieSecure();
    return {
      httpOnly: true,
      secure,
      sameSite: this.cookieSameSite(secure),
      path: '/',
    };
  }

  private clearOptions(): CookieOptions {
    const { httpOnly, secure, sameSite, path } = this.baseOptions();
    return { path, httpOnly, secure, sameSite };
  }

  /** Secure cookies require HTTPS; plain HTTP deploys (e.g. Coolify IP) must not set Secure. */
  private cookieSecure(): boolean {
    const explicit = this.config.get<string>('COOKIE_SECURE');
    if (explicit !== undefined && explicit !== '') {
      return explicit === 'true' || explicit === '1';
    }
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    return frontendUrl.startsWith('https://');
  }

  private cookieSameSite(secure: boolean): CookieOptions['sameSite'] {
    const explicit = this.config.get<string>('COOKIE_SAME_SITE');
    if (
      explicit === 'none' ||
      explicit === 'lax' ||
      explicit === 'strict'
    ) {
      return explicit;
    }
    // SameSite=None requires Secure; lax works for same-origin nginx/vite proxy.
    return secure ? 'lax' : 'lax';
  }

  private durationMs(duration: string, fallback: number): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return fallback;
    const value = Number(match[1]);
    const unit = match[2];
    if (unit === 's') return value * 1000;
    if (unit === 'm') return value * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    return value * 24 * 60 * 60 * 1000;
  }
}
