import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import * as oidc from 'openid-client';
import { AuthService } from './auth.service';
import { AuthCookieService } from './auth-cookie.service';
import {
  SSO_PROVIDER_LABELS,
  SSO_PROVIDERS,
  type SsoProvider,
  type SsoProviderInfo,
} from './sso.constants';

type PendingLogin = {
  codeVerifier: string;
  provider: SsoProvider;
  expiresAt: number;
};

@Injectable()
export class SsoService {
  private readonly pendingLogins = new Map<string, PendingLogin>();

  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  getProviders(): SsoProviderInfo[] {
    return SSO_PROVIDERS.map((id) => ({
      id,
      name: SSO_PROVIDER_LABELS[id],
      enabled: this.isProviderConfigured(id),
      redirectUri: this.isProviderConfigured(id)
        ? this.callbackUrl(id)
        : undefined,
    }));
  }

  async startLogin(provider: string, res: Response) {
    const id = this.parseProvider(provider);
    if (!this.isProviderConfigured(id)) {
      throw new BadRequestException(
        `${SSO_PROVIDER_LABELS[id]} SSO is not configured on this server`,
      );
    }

    this.pruneExpired();
    const config = await this.getOidcConfig(id);
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();

    this.pendingLogins.set(state, {
      codeVerifier,
      provider: id,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: this.callbackUrl(id),
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    return res.redirect(redirectTo.href);
  }

  async handleCallback(provider: string, req: Request, res: Response) {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');

    try {
      const id = this.parseProvider(provider);
      if (!this.isProviderConfigured(id)) {
        throw new BadRequestException('SSO provider is not configured');
      }

      const redirectUri = this.callbackUrl(id);
      const incoming = new URL(
        `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      );
      const currentUrl = new URL(redirectUri);
      incoming.searchParams.forEach((value, key) => {
        currentUrl.searchParams.set(key, value);
      });

      const state = currentUrl.searchParams.get('state');
      if (!state) {
        throw new BadRequestException('Missing OAuth state');
      }

      const pending = this.pendingLogins.get(state);
      this.pendingLogins.delete(state);

      if (
        !pending ||
        pending.provider !== id ||
        pending.expiresAt < Date.now()
      ) {
        throw new UnauthorizedException('SSO session expired - try again');
      }

      const config = await this.getOidcConfig(id);
      const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: pending.codeVerifier,
        expectedState: state,
      });

      const claims = tokens.claims();
      const email =
        typeof claims?.email === 'string'
          ? claims.email
          : typeof claims?.preferred_username === 'string'
            ? claims.preferred_username
            : null;

      if (!email) {
        throw new UnauthorizedException(
          'Identity provider did not return an email',
        );
      }

      const user = await this.authService.validateSsoUser(email);
      const result = await this.authService.login(user);

      if (result.mfaRequired) {
        const mfaToken = await this.authService.createMfaPendingToken(
          result.pendingUserId,
        );
        this.cookies.setMfaPendingCookie(res, mfaToken);
        return res.redirect(`${frontendUrl}/login?mfa=1`);
      }

      if (!result.tokens) {
        throw new UnauthorizedException('SSO sign-in failed');
      }

      this.cookies.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
      );

      return res.redirect(`${frontendUrl}/dashboard`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'SSO sign-in failed';
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(message)}`,
      );
    }
  }

  private parseProvider(provider: string): SsoProvider {
    if (!SSO_PROVIDERS.includes(provider as SsoProvider)) {
      throw new NotFoundException(`Unknown SSO provider: ${provider}`);
    }
    return provider as SsoProvider;
  }

  private isProviderConfigured(provider: SsoProvider): boolean {
    if (provider === 'microsoft') {
      return !!(
        this.config.get('MICROSOFT_CLIENT_ID') &&
        this.config.get('MICROSOFT_CLIENT_SECRET')
      );
    }
    return !!(
      this.config.get('GOOGLE_CLIENT_ID') &&
      this.config.get('GOOGLE_CLIENT_SECRET')
    );
  }

  private callbackUrl(provider: SsoProvider): string {
    const frontendUrl = this.config.getOrThrow('FRONTEND_URL');
    return `${frontendUrl}/api/auth/sso/${provider}/callback`;
  }

  private async getOidcConfig(
    provider: SsoProvider,
  ): Promise<oidc.Configuration> {
    if (provider === 'microsoft') {
      const tenant = this.config.get('MICROSOFT_TENANT_ID', 'common');
      return oidc.discovery(
        new URL(`https://login.microsoftonline.com/${tenant}/v2.0`),
        this.config.getOrThrow('MICROSOFT_CLIENT_ID'),
        this.config.getOrThrow('MICROSOFT_CLIENT_SECRET'),
      );
    }

    return oidc.discovery(
      new URL('https://accounts.google.com'),
      this.config.getOrThrow('GOOGLE_CLIENT_ID'),
      this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
    );
  }

  private pruneExpired() {
    const now = Date.now();
    for (const [state, pending] of this.pendingLogins) {
      if (pending.expiresAt < now) {
        this.pendingLogins.delete(state);
      }
    }
  }
}
