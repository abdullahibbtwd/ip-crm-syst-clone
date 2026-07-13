import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import type { AuthenticatedUser } from '../auth/auth.types'
import { Audit } from '../common/decorators/audit.decorator'
import { RequirePermissions } from '../common/decorators/permissions.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { SYSTEM_ROLES } from '../rbac/rbac.constants'
import {
  INTEGRATION_SECRET_KEYS,
  SECRETS_MODULE,
  SYSTEM_SECRET_CATEGORY,
} from '../secrets/secrets.constants'
import { SystemSecretsService } from '../secrets/system-secrets.service'
import { UpsertEpoCredentialsDto } from '../secrets/dto/epo-credentials.dto'
import { REGISTRY_MODULE } from './registry.constants'
import { EpoProvider } from './providers/epo.provider'

@Controller('settings/integrations')
export class IntegrationsSettingsController {
  constructor(
    private readonly secrets: SystemSecretsService,
    private readonly epo: EpoProvider,
  ) {}

  @Get('epo')
  @RequirePermissions('registry:read')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN)
  async getEpoCredentialsStatus() {
    const [keyStatus, secretStatus, apiBase, authUrl] =
      await this.secrets.getStatuses(SYSTEM_SECRET_CATEGORY.INTEGRATION, [
        INTEGRATION_SECRET_KEYS.EPO_CONSUMER_KEY,
        INTEGRATION_SECRET_KEYS.EPO_CONSUMER_SECRET,
        INTEGRATION_SECRET_KEYS.EPO_API_BASE_URL,
        INTEGRATION_SECRET_KEYS.EPO_AUTH_URL,
      ])

    await this.epo.refreshCredentials()
    const configured = this.epo.isConfigured()
    const source = this.epo.getCredentialSource()

    return {
      provider: 'epo' as const,
      configured,
      source,
      consumerKey: {
        configured: keyStatus.configured,
        lastFour: keyStatus.lastFour,
      },
      consumerSecret: {
        configured: secretStatus.configured,
        lastFour: secretStatus.lastFour,
      },
      apiBaseUrl: apiBase.nonSecretValue,
      authUrl: authUrl.nonSecretValue,
      updatedAt:
        keyStatus.updatedAt ??
        secretStatus.updatedAt ??
        apiBase.updatedAt ??
        authUrl.updatedAt,
    }
  }

  @Put('epo')
  @RequirePermissions('registry:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN)
  @Audit({
    action: 'integrations.epo.update',
    resource: 'system_secret',
    module: SECRETS_MODULE,
  })
  async upsertEpoCredentials(
    @Body() dto: UpsertEpoCredentialsDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser

    if (dto.consumerKey?.trim()) {
      await this.secrets.upsertSecret({
        category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
        key: INTEGRATION_SECRET_KEYS.EPO_CONSUMER_KEY,
        plaintext: dto.consumerKey,
        updatedById: actor.userId,
      })
    }

    if (dto.consumerSecret?.trim()) {
      await this.secrets.upsertSecret({
        category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
        key: INTEGRATION_SECRET_KEYS.EPO_CONSUMER_SECRET,
        plaintext: dto.consumerSecret,
        updatedById: actor.userId,
      })
    }

    if (dto.apiBaseUrl !== undefined) {
      const value = dto.apiBaseUrl.trim()
      if (value) {
        await this.secrets.upsertNonSecret({
          category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
          key: INTEGRATION_SECRET_KEYS.EPO_API_BASE_URL,
          value,
          updatedById: actor.userId,
        })
      } else {
        await this.secrets.deleteSecret(
          SYSTEM_SECRET_CATEGORY.INTEGRATION,
          INTEGRATION_SECRET_KEYS.EPO_API_BASE_URL,
        )
      }
    }

    if (dto.authUrl !== undefined) {
      const value = dto.authUrl.trim()
      if (value) {
        await this.secrets.upsertNonSecret({
          category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
          key: INTEGRATION_SECRET_KEYS.EPO_AUTH_URL,
          value,
          updatedById: actor.userId,
        })
      } else {
        await this.secrets.deleteSecret(
          SYSTEM_SECRET_CATEGORY.INTEGRATION,
          INTEGRATION_SECRET_KEYS.EPO_AUTH_URL,
        )
      }
    }

    await this.epo.refreshCredentials()
    return this.getEpoCredentialsStatus()
  }

  @Delete('epo')
  @RequirePermissions('registry:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN)
  @Audit({
    action: 'integrations.epo.clear',
    resource: 'system_secret',
    module: REGISTRY_MODULE,
  })
  async clearEpoCredentials() {
    await Promise.all([
      this.secrets.deleteSecret(
        SYSTEM_SECRET_CATEGORY.INTEGRATION,
        INTEGRATION_SECRET_KEYS.EPO_CONSUMER_KEY,
      ),
      this.secrets.deleteSecret(
        SYSTEM_SECRET_CATEGORY.INTEGRATION,
        INTEGRATION_SECRET_KEYS.EPO_CONSUMER_SECRET,
      ),
      this.secrets.deleteSecret(
        SYSTEM_SECRET_CATEGORY.INTEGRATION,
        INTEGRATION_SECRET_KEYS.EPO_API_BASE_URL,
      ),
      this.secrets.deleteSecret(
        SYSTEM_SECRET_CATEGORY.INTEGRATION,
        INTEGRATION_SECRET_KEYS.EPO_AUTH_URL,
      ),
    ])
    await this.epo.refreshCredentials()
    return this.getEpoCredentialsStatus()
  }
}
