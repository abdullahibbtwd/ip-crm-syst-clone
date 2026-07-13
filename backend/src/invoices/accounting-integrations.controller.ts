import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import type { Request } from 'express'
import type { AuthenticatedUser } from '../auth/auth.types'
import { Audit } from '../common/decorators/audit.decorator'
import { RequirePermissions } from '../common/decorators/permissions.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { SYSTEM_ROLES } from '../rbac/rbac.constants'
import { SECRETS_MODULE } from '../secrets/secrets.constants'
import { AccountingSyncService } from './accounting-sync.service'
import {
  ACCOUNTING_MODULE,
  ACCOUNTING_SYNC_JOB,
  ACCOUNTING_SYNC_QUEUE,
  type AccountingSyncProvider,
} from './accounting-sync.constants'
import { UpsertAccountingCredentialsDto } from './dto/accounting-credentials.dto'
import type { AccountingSyncJobData } from './processors/accounting-sync.processor'

@Controller('settings/integrations')
export class AccountingIntegrationsController {
  constructor(
    private readonly sync: AccountingSyncService,
    @InjectQueue(ACCOUNTING_SYNC_QUEUE)
    private readonly queue: Queue<AccountingSyncJobData>,
  ) {}

  @Get('xero')
  @RequirePermissions('invoice:read')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE, SYSTEM_ROLES.IT_ADMIN)
  getXero() {
    return this.sync.getProviderStatus('xero')
  }

  @Put('xero')
  @RequirePermissions('invoice:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE, SYSTEM_ROLES.IT_ADMIN)
  @Audit({
    action: 'integrations.xero.update',
    resource: 'system_secret',
    module: SECRETS_MODULE,
  })
  upsertXero(
    @Body() dto: UpsertAccountingCredentialsDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser
    return this.sync.upsertCredentials('xero', dto, actor.userId)
  }

  @Delete('xero')
  @RequirePermissions('invoice:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE, SYSTEM_ROLES.IT_ADMIN)
  @Audit({
    action: 'integrations.xero.clear',
    resource: 'system_secret',
    module: SECRETS_MODULE,
  })
  clearXero() {
    return this.sync.clearCredentials('xero')
  }

  @Get('quickbooks')
  @RequirePermissions('invoice:read')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE, SYSTEM_ROLES.IT_ADMIN)
  getQuickBooks() {
    return this.sync.getProviderStatus('quickbooks')
  }

  @Put('quickbooks')
  @RequirePermissions('invoice:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE, SYSTEM_ROLES.IT_ADMIN)
  @Audit({
    action: 'integrations.quickbooks.update',
    resource: 'system_secret',
    module: SECRETS_MODULE,
  })
  upsertQuickBooks(
    @Body() dto: UpsertAccountingCredentialsDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser
    return this.sync.upsertCredentials('quickbooks', dto, actor.userId)
  }

  @Delete('quickbooks')
  @RequirePermissions('invoice:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE, SYSTEM_ROLES.IT_ADMIN)
  @Audit({
    action: 'integrations.quickbooks.clear',
    resource: 'system_secret',
    module: SECRETS_MODULE,
  })
  clearQuickBooks() {
    return this.sync.clearCredentials('quickbooks')
  }

  @Post(':provider/sync')
  @RequirePermissions('invoice:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
  @Audit({
    action: 'integrations.accounting.sync',
    resource: 'invoice',
    module: ACCOUNTING_MODULE,
  })
  async enqueueSync(
    @Param('provider') providerParam: string,
    @Req() req: Request,
  ) {
    const provider = this.parseProvider(providerParam)
    const actor = req.user as AuthenticatedUser
    const job = await this.queue.add(
      ACCOUNTING_SYNC_JOB,
      { provider, actorUserId: actor.userId },
      {
        jobId: `accounting-sync-${provider}-${Date.now()}`,
        attempts: 2,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    )
    return {
      queued: true,
      provider,
      jobId: job.id,
      message: `${provider} sync queued. Issued invoices changed since the last successful sync will be pushed.`,
    }
  }

  private parseProvider(value: string): AccountingSyncProvider {
    if (value === 'xero' || value === 'quickbooks') return value
    throw new BadRequestException(
      `Unsupported accounting provider: ${value}. Use xero or quickbooks.`,
    )
  }
}
