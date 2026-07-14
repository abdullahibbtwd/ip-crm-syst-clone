import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import * as oidc from 'openid-client'
import {
  SSO_SECRET_KEYS,
  SYSTEM_SECRET_CATEGORY,
} from '../secrets/secrets.constants'
import { SystemSecretsService } from '../secrets/system-secrets.service'
import { AuthService } from './auth.service'
import { AuthCookieService } from './auth-cookie.service'
import type { UserWithAccess } from './user-access'
import {
  SSO_PROVIDER_LABELS,
  SSO_PROVIDERS,
  type SsoProvider,
  type SsoProviderInfo,
} from './sso.constants'

type PendingLogin = {
  codeVerifier: string
  provider: SsoProvider
  expiresAt: number
  signup: boolean
}

type ProviderCreds = {
  clientId: string
  clientSecret: string
  tenantId?: string
  source: 'database' | 'env' | 'none'
}

@Injectable()
export class SsoService implements OnModuleInit {
  private readonly pendingLogins = new Map<string, PendingLogin>()
  private creds: Record<SsoProvider, ProviderCreds> = {
    microsoft: { clientId: '', clientSecret: '', tenantId: 'common', source: 'none' },
    google: { clientId: '', clientSecret: '', source: 'none' },
  }

  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly cookies: AuthCookieService,
    private readonly secrets: SystemSecretsService,
  ) {}

  async onModuleInit() {
    await this.refreshCredentials()
  }

  async refreshCredentials(): Promise<void> {
    const [msIdDb, msSecretDb, msTenantDb, googleIdDb, googleSecretDb] =
      await Promise.all([
        this.secrets.getNonSecretValue(
          SYSTEM_SECRET_CATEGORY.SSO,
          SSO_SECRET_KEYS.MICROSOFT_CLIENT_ID,
        ),
        this.secrets.getSecretValue(
          SYSTEM_SECRET_CATEGORY.SSO,
          SSO_SECRET_KEYS.MICROSOFT_CLIENT_SECRET,
        ),
        this.secrets.getNonSecretValue(
          SYSTEM_SECRET_CATEGORY.SSO,
          SSO_SECRET_KEYS.MICROSOFT_TENANT_ID,
        ),
        this.secrets.getNonSecretValue(
          SYSTEM_SECRET_CATEGORY.SSO,
          SSO_SECRET_KEYS.GOOGLE_CLIENT_ID,
        ),
        this.secrets.getSecretValue(
          SYSTEM_SECRET_CATEGORY.SSO,
          SSO_SECRET_KEYS.GOOGLE_CLIENT_SECRET,
        ),
      ])

    const msIdEnv = this.config.get<string>('MICROSOFT_CLIENT_ID')?.trim() ?? ''
    const msSecretEnv =
      this.config.get<string>('MICROSOFT_CLIENT_SECRET')?.trim() ?? ''
    const msTenantEnv =
      this.config.get<string>('MICROSOFT_TENANT_ID')?.trim() || 'common'
    const googleIdEnv = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim() ?? ''
    const googleSecretEnv =
      this.config.get<string>('GOOGLE_CLIENT_SECRET')?.trim() ?? ''

    if (msIdDb && msSecretDb) {
      this.creds.microsoft = {
        clientId: msIdDb,
        clientSecret: msSecretDb,
        tenantId: msTenantDb || msTenantEnv || 'common',
        source: 'database',
      }
    } else if (msIdEnv && msSecretEnv) {
      this.creds.microsoft = {
        clientId: msIdEnv,
        clientSecret: msSecretEnv,
        tenantId: msTenantEnv,
        source: 'env',
      }
    } else {
      this.creds.microsoft = {
        clientId: msIdDb || msIdEnv || '',
        clientSecret: msSecretDb || msSecretEnv || '',
        tenantId: msTenantDb || msTenantEnv || 'common',
        source: 'none',
      }
    }

    if (googleIdDb && googleSecretDb) {
      this.creds.google = {
        clientId: googleIdDb,
        clientSecret: googleSecretDb,
        source: 'database',
      }
    } else if (googleIdEnv && googleSecretEnv) {
      this.creds.google = {
        clientId: googleIdEnv,
        clientSecret: googleSecretEnv,
        source: 'env',
      }
    } else {
      this.creds.google = {
        clientId: googleIdDb || googleIdEnv || '',
        clientSecret: googleSecretDb || googleSecretEnv || '',
        source: 'none',
      }
    }
  }

  getProviderSource(provider: SsoProvider): 'database' | 'env' | 'none' {
    return this.creds[provider].source
  }

  async getProviders(): Promise<SsoProviderInfo[]> {
    await this.refreshCredentials()
    return SSO_PROVIDERS.map((id) => ({
      id,
      name: SSO_PROVIDER_LABELS[id],
      enabled: this.isProviderConfigured(id),
      redirectUri: this.isProviderConfigured(id)
        ? this.callbackUrl(id)
        : undefined,
    }))
  }

  async startLogin(provider: string, res: Response, signup = false) {
    const id = this.parseProvider(provider)
    await this.refreshCredentials()
    if (!this.isProviderConfigured(id)) {
      throw new BadRequestException(
        `${SSO_PROVIDER_LABELS[id]} SSO is not configured on this server`,
      )
    }

    this.pruneExpired()
    const config = await this.getOidcConfig(id)
    const codeVerifier = oidc.randomPKCECodeVerifier()
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier)
    const state = oidc.randomState()

    this.pendingLogins.set(state, {
      codeVerifier,
      provider: id,
      expiresAt: Date.now() + 10 * 60 * 1000,
      signup,
    })

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: this.callbackUrl(id),
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    })

    return res.redirect(redirectTo.href)
  }

  async handleCallback(provider: string, req: Request, res: Response) {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL')
    let signupFlow = false

    try {
      const id = this.parseProvider(provider)
      await this.refreshCredentials()
      if (!this.isProviderConfigured(id)) {
        throw new BadRequestException('SSO provider is not configured')
      }

      const redirectUri = this.callbackUrl(id)
      const incoming = new URL(
        `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      )
      const currentUrl = new URL(redirectUri)
      incoming.searchParams.forEach((value, key) => {
        currentUrl.searchParams.set(key, value)
      })

      const state = currentUrl.searchParams.get('state')
      if (!state) {
        throw new BadRequestException('Missing OAuth state')
      }

      const pending = this.pendingLogins.get(state)
      if (
        !pending ||
        pending.provider !== id ||
        pending.expiresAt < Date.now()
      ) {
        throw new UnauthorizedException('SSO session expired - try again')
      }

      signupFlow = pending.signup
      this.pendingLogins.delete(state)

      const config = await this.getOidcConfig(id)
      const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: pending.codeVerifier,
        expectedState: state,
      })

      const claims = tokens.claims()
      const email =
        typeof claims?.email === 'string'
          ? claims.email
          : typeof claims?.preferred_username === 'string'
            ? claims.preferred_username
            : null

      if (!email) {
        throw new UnauthorizedException(
          'Identity provider did not return an email',
        )
      }

      const fullName =
        typeof claims?.name === 'string'
          ? claims.name
          : [claims?.given_name, claims?.family_name]
              .filter((part) => typeof part === 'string')
              .join(' ')
              .trim() || email.split('@')[0]

      let user: UserWithAccess
      const existing = await this.authService.findUserByEmail(email)
      if (existing) {
        if (!existing.isActive) {
          throw new UnauthorizedException('Account is inactive')
        }
        user = existing
      } else if (pending.signup) {
        user = await this.authService.registerPortalFromSso(email, fullName)
      } else {
        throw new UnauthorizedException(
          'SSO account not provisioned. Create a client account first or contact your administrator.',
        )
      }

      const result = await this.authService.login(user)

      if (result.mfaRequired) {
        const mfaToken = await this.authService.createMfaPendingToken(
          result.pendingUserId,
        )
        this.cookies.setMfaPendingCookie(res, mfaToken)
        return res.redirect(`${frontendUrl}/login?mfa=1`)
      }

      if (!result.tokens) {
        throw new UnauthorizedException('SSO sign-in failed')
      }

      this.cookies.setAuthCookies(
        res,
        result.tokens.accessToken,
        result.tokens.refreshToken,
      )

      if (result.mfaEnrollmentRequired) {
        return res.redirect(`${frontendUrl}/settings?mfa=enroll`)
      }

      return res.redirect(`${frontendUrl}/dashboard`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'SSO sign-in failed'
      const signupQuery = signupFlow ? 'signup=1&' : ''
      return res.redirect(
        `${frontendUrl}/login?${signupQuery}error=${encodeURIComponent(message)}`,
      )
    }
  }

  private parseProvider(provider: string): SsoProvider {
    if (!SSO_PROVIDERS.includes(provider as SsoProvider)) {
      throw new NotFoundException(`Unknown SSO provider: ${provider}`)
    }
    return provider as SsoProvider
  }

  private isProviderConfigured(provider: SsoProvider): boolean {
    const c = this.creds[provider]
    return Boolean(c.clientId && c.clientSecret)
  }

  private callbackUrl(provider: SsoProvider): string {
    const frontendUrl = this.config.getOrThrow('FRONTEND_URL')
    return `${frontendUrl}/api/auth/sso/${provider}/callback`
  }

  private async getOidcConfig(
    provider: SsoProvider,
  ): Promise<oidc.Configuration> {
    const c = this.creds[provider]
    if (!c.clientId || !c.clientSecret) {
      throw new BadRequestException('SSO provider is not configured')
    }

    if (provider === 'microsoft') {
      const tenant = c.tenantId || 'common'
      return oidc.discovery(
        new URL(`https://login.microsoftonline.com/${tenant}/v2.0`),
        c.clientId,
        c.clientSecret,
      )
    }

    return oidc.discovery(
      new URL('https://accounts.google.com'),
      c.clientId,
      c.clientSecret,
    )
  }

  private pruneExpired() {
    const now = Date.now()
    for (const [state, pending] of this.pendingLogins) {
      if (pending.expiresAt < now) {
        this.pendingLogins.delete(state)
      }
    }
  }
}
