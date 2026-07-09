import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import * as oidc from 'openid-client';
import {
  MAILBOX_PROVIDER_LABELS,
  MAILBOX_PROVIDERS,
  type MailboxProviderId,
} from './email-integration.constants';
import { MailboxConnectionsService } from './mailbox-connections.service';

type PendingMailboxAuth = {
  codeVerifier: string;
  provider: MailboxProviderId;
  userId: string;
  expiresAt: number;
};

@Injectable()
export class MailboxOAuthService {
  private readonly logger = new Logger(MailboxOAuthService.name);
  private readonly pending = new Map<string, PendingMailboxAuth>();

  constructor(
    private readonly config: ConfigService,
    private readonly connections: MailboxConnectionsService,
  ) {}

  getConfiguredProviders() {
    return MAILBOX_PROVIDERS.map((id) => ({
      id,
      name: MAILBOX_PROVIDER_LABELS[id],
      enabled: this.isProviderConfigured(id),
      redirectUri: this.isProviderConfigured(id)
        ? this.callbackUrl(id)
        : undefined,
    }));
  }

  async startConnect(provider: string, userId: string, res: Response) {
    const id = this.parseProvider(provider);
    if (!this.isProviderConfigured(id)) {
      throw new BadRequestException(
        `${MAILBOX_PROVIDER_LABELS[id]} mailbox integration is not configured`,
      );
    }

    this.pruneExpired();
    const oidcConfig = await this.getOidcConfig(id);
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();

    this.pending.set(state, {
      codeVerifier,
      provider: id,
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const scopes =
      id === 'microsoft'
        ? 'openid email profile offline_access https://graph.microsoft.com/Mail.Read'
        : 'openid email profile https://www.googleapis.com/auth/gmail.readonly';

    const authParams: Record<string, string> = {
      redirect_uri: this.callbackUrl(id),
      scope: scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    };
    if (id === 'google') {
      authParams.access_type = 'offline';
      authParams.prompt = 'consent';
    }

    const redirectTo = oidc.buildAuthorizationUrl(oidcConfig, authParams);

    return res.redirect(redirectTo.href);
  }

  async handleCallback(provider: string, req: Request, res: Response) {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const settingsPath = `${frontendUrl}/settings/email`;

    try {
      const id = this.parseProvider(provider);
      if (!this.isProviderConfigured(id)) {
        throw new BadRequestException('Mailbox provider is not configured');
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
      if (!state) throw new BadRequestException('Missing OAuth state');

      const pending = this.pending.get(state);
      if (!pending || pending.provider !== id || pending.expiresAt < Date.now()) {
        throw new UnauthorizedException('Mailbox connection session expired');
      }
      this.pending.delete(state);

      const oidcConfig = await this.getOidcConfig(id);
      const tokens = await oidc.authorizationCodeGrant(
        oidcConfig,
        currentUrl,
        {
          pkceCodeVerifier: pending.codeVerifier,
          expectedState: state,
        },
      );

      const claims = tokens.claims();
      const email =
        typeof claims?.email === 'string'
          ? claims.email
          : typeof claims?.preferred_username === 'string'
            ? claims.preferred_username
            : null;
      if (!email) {
        throw new UnauthorizedException('Provider did not return an email address');
      }

      const refreshToken = tokens.refresh_token;
      if (!refreshToken) {
        throw new BadRequestException(
          'No refresh token received — try connecting again and accept all permissions',
        );
      }

      await this.connections.upsertConnection({
        userId: pending.userId,
        provider: id,
        emailAddress: email,
        refreshToken,
        accessToken: tokens.access_token,
        accessTokenExpiresAt: tokens.expires_in
          ? Date.now() + tokens.expires_in * 1000
          : undefined,
      });

      return res.redirect(`${settingsPath}?connected=${id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Mailbox connection failed';
      this.logger.warn(`Mailbox OAuth callback failed: ${message}`);
      return res.redirect(
        `${settingsPath}?error=${encodeURIComponent(message)}`,
      );
    }
  }

  private parseProvider(provider: string): MailboxProviderId {
    if (!MAILBOX_PROVIDERS.includes(provider as MailboxProviderId)) {
      throw new NotFoundException(`Unknown mailbox provider: ${provider}`);
    }
    return provider as MailboxProviderId;
  }

  private isProviderConfigured(provider: MailboxProviderId): boolean {
    if (provider === 'microsoft') {
      return !!(
        this.clientId('microsoft') && this.clientSecret('microsoft')
      );
    }
    return !!(this.clientId('google') && this.clientSecret('google'));
  }

  private callbackUrl(provider: MailboxProviderId): string {
    const frontendUrl = this.config.getOrThrow('FRONTEND_URL');
    return `${frontendUrl}/api/email-integration/callback/${provider}`;
  }

  private clientId(provider: MailboxProviderId): string | undefined {
    if (provider === 'microsoft') {
      return (
        this.config.get<string>('MAILBOX_MICROSOFT_CLIENT_ID') ??
        this.config.get<string>('MICROSOFT_CLIENT_ID') ??
        undefined
      );
    }
    return (
      this.config.get<string>('MAILBOX_GOOGLE_CLIENT_ID') ??
      this.config.get<string>('GOOGLE_CLIENT_ID') ??
      undefined
    );
  }

  private clientSecret(provider: MailboxProviderId): string | undefined {
    if (provider === 'microsoft') {
      return (
        this.config.get<string>('MAILBOX_MICROSOFT_CLIENT_SECRET') ??
        this.config.get<string>('MICROSOFT_CLIENT_SECRET') ??
        undefined
      );
    }
    return (
      this.config.get<string>('MAILBOX_GOOGLE_CLIENT_SECRET') ??
      this.config.get<string>('GOOGLE_CLIENT_SECRET') ??
      undefined
    );
  }

  private async getOidcConfig(
    provider: MailboxProviderId,
  ): Promise<oidc.Configuration> {
    if (provider === 'microsoft') {
      const tenant =
        this.config.get('MAILBOX_MICROSOFT_TENANT_ID') ??
        this.config.get('MICROSOFT_TENANT_ID', 'common');
      return oidc.discovery(
        new URL(`https://login.microsoftonline.com/${tenant}/v2.0`),
        this.clientId('microsoft')!,
        this.clientSecret('microsoft')!,
      );
    }

    return oidc.discovery(
      new URL('https://accounts.google.com'),
      this.clientId('google')!,
      this.clientSecret('google')!,
    );
  }

  private pruneExpired() {
    const now = Date.now();
    for (const [state, pending] of this.pending) {
      if (pending.expiresAt < now) this.pending.delete(state);
    }
  }
}
