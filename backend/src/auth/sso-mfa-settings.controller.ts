import {
  Body,
  Controller,
  Get,
  Put,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import type { AuthenticatedUser } from './auth.types'
import { Audit } from '../common/decorators/audit.decorator'
import { RequirePermissions } from '../common/decorators/permissions.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { SYSTEM_ROLES } from '../rbac/rbac.constants'
import {
  MFA_POLICY_KEYS,
  SECRETS_MODULE,
  SSO_SECRET_KEYS,
  SYSTEM_SECRET_CATEGORY,
} from '../secrets/secrets.constants'
import { SystemSecretsService } from '../secrets/system-secrets.service'
import { UpsertSsoSettingsDto } from './dto/sso-settings.dto'
import { SsoService } from './sso.service'

@Controller('settings/sso-mfa')
@Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN)
export class SsoMfaSettingsController {
  constructor(
    private readonly secrets: SystemSecretsService,
    private readonly sso: SsoService,
  ) {}

  @Get()
  @RequirePermissions('role:read')
  async getSettings() {
    await this.sso.refreshCredentials()
    const providers = await this.sso.getProviders()

    const [msId, msSecret, msTenant, googleId, googleSecret] =
      await this.secrets.getStatuses(SYSTEM_SECRET_CATEGORY.SSO, [
        SSO_SECRET_KEYS.MICROSOFT_CLIENT_ID,
        SSO_SECRET_KEYS.MICROSOFT_CLIENT_SECRET,
        SSO_SECRET_KEYS.MICROSOFT_TENANT_ID,
        SSO_SECRET_KEYS.GOOGLE_CLIENT_ID,
        SSO_SECRET_KEYS.GOOGLE_CLIENT_SECRET,
      ])
    const mfaPolicy = await this.secrets.getStatus(
      SYSTEM_SECRET_CATEGORY.MFA_POLICY,
      MFA_POLICY_KEYS.REQUIRE_INTERNAL,
    )

    return {
      providers,
      microsoft: {
        clientIdConfigured: msId.configured,
        clientIdLastFour: msId.lastFour,
        clientId: msId.nonSecretValue,
        clientSecretConfigured: msSecret.configured,
        clientSecretLastFour: msSecret.lastFour,
        tenantId: msTenant.nonSecretValue ?? 'common',
        source: this.sso.getProviderSource('microsoft'),
        redirectUri: providers.find((p) => p.id === 'microsoft')?.redirectUri,
      },
      google: {
        clientIdConfigured: googleId.configured,
        clientIdLastFour: googleId.lastFour,
        clientId: googleId.nonSecretValue,
        clientSecretConfigured: googleSecret.configured,
        clientSecretLastFour: googleSecret.lastFour,
        source: this.sso.getProviderSource('google'),
        redirectUri: providers.find((p) => p.id === 'google')?.redirectUri,
      },
      mfa: {
        requireInternal: mfaPolicy.nonSecretValue === 'true',
      },
    }
  }

  @Put()
  @RequirePermissions('role:update')
  @Audit({
    action: 'settings.sso_mfa.update',
    resource: 'system_secret',
    module: SECRETS_MODULE,
  })
  async upsertSettings(
    @Body() dto: UpsertSsoSettingsDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser
    const updatedById = actor.userId

    if (dto.microsoftClientId?.trim()) {
      await this.secrets.upsertNonSecret({
        category: SYSTEM_SECRET_CATEGORY.SSO,
        key: SSO_SECRET_KEYS.MICROSOFT_CLIENT_ID,
        value: dto.microsoftClientId,
        updatedById,
      })
    }
    if (dto.microsoftClientSecret?.trim()) {
      await this.secrets.upsertSecret({
        category: SYSTEM_SECRET_CATEGORY.SSO,
        key: SSO_SECRET_KEYS.MICROSOFT_CLIENT_SECRET,
        plaintext: dto.microsoftClientSecret,
        updatedById,
      })
    }
    if (dto.microsoftTenantId !== undefined) {
      await this.secrets.upsertNonSecret({
        category: SYSTEM_SECRET_CATEGORY.SSO,
        key: SSO_SECRET_KEYS.MICROSOFT_TENANT_ID,
        value: dto.microsoftTenantId.trim() || 'common',
        updatedById,
      })
    }

    if (dto.googleClientId?.trim()) {
      await this.secrets.upsertNonSecret({
        category: SYSTEM_SECRET_CATEGORY.SSO,
        key: SSO_SECRET_KEYS.GOOGLE_CLIENT_ID,
        value: dto.googleClientId,
        updatedById,
      })
    }
    if (dto.googleClientSecret?.trim()) {
      await this.secrets.upsertSecret({
        category: SYSTEM_SECRET_CATEGORY.SSO,
        key: SSO_SECRET_KEYS.GOOGLE_CLIENT_SECRET,
        plaintext: dto.googleClientSecret,
        updatedById,
      })
    }

    if (dto.requireMfaForInternal !== undefined) {
      await this.secrets.upsertNonSecret({
        category: SYSTEM_SECRET_CATEGORY.MFA_POLICY,
        key: MFA_POLICY_KEYS.REQUIRE_INTERNAL,
        value: dto.requireMfaForInternal ? 'true' : 'false',
        updatedById,
      })
    }

    await this.sso.refreshCredentials()
    return this.getSettings()
  }
}
