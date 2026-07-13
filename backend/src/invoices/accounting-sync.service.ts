import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common'
import { InvoiceStatus, Prisma } from '../../generated/prisma/client'
import { AuditService } from '../audit/audit.service'
import { roundMoney } from '../billing/billing.utils'
import { PrismaService } from '../prisma/prisma.service'
import {
  INTEGRATION_SECRET_KEYS,
  SYSTEM_SECRET_CATEGORY,
} from '../secrets/secrets.constants'
import { SystemSecretsService } from '../secrets/system-secrets.service'
import {
  ACCOUNTING_MODULE,
  type AccountingSyncProvider,
} from './accounting-sync.constants'

const exportInclude = {
  client: {
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      internalCode: true,
    },
  },
  matter: { select: { id: true, title: true } },
  fixedFees: { orderBy: [{ date: 'asc' as const }] },
  timeEntries: { orderBy: [{ date: 'asc' as const }] },
} satisfies Prisma.InvoiceInclude

type SyncInvoice = Prisma.InvoiceGetPayload<{ include: typeof exportInclude }>

const REVENUE_ACCOUNT = '4000'

function clientName(client: SyncInvoice['client']) {
  return (
    client.companyName ||
    [client.firstName, client.lastName].filter(Boolean).join(' ') ||
    client.internalCode ||
    'Client'
  )
}

function formatDate(value: Date | null | undefined) {
  if (!value) return undefined
  return value.toISOString().slice(0, 10)
}

@Injectable()
export class AccountingSyncService {
  private readonly logger = new Logger(AccountingSyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly secrets: SystemSecretsService,
    private readonly audit: AuditService,
  ) {}

  async getProviderStatus(provider: AccountingSyncProvider) {
    const keys = this.keysFor(provider)
    const [clientId, clientSecret, accessToken, orgId, lastSync] =
      await this.secrets.getStatuses(SYSTEM_SECRET_CATEGORY.INTEGRATION, [
        keys.clientId,
        keys.clientSecret,
        keys.accessToken,
        keys.orgId,
        keys.lastSyncAt,
      ])

    const configured = Boolean(
      accessToken.configured && (orgId.nonSecretValue || orgId.configured),
    )

    return {
      provider,
      configured,
      clientId: {
        configured: clientId.configured || Boolean(clientId.nonSecretValue),
        value: clientId.nonSecretValue,
        lastFour: clientId.lastFour,
      },
      clientSecret: {
        configured: clientSecret.configured,
        lastFour: clientSecret.lastFour,
      },
      accessToken: {
        configured: accessToken.configured,
        lastFour: accessToken.lastFour,
      },
      orgId: orgId.nonSecretValue,
      lastSyncAt: lastSync.nonSecretValue,
      updatedAt:
        accessToken.updatedAt ??
        orgId.updatedAt ??
        clientId.updatedAt ??
        null,
    }
  }

  async upsertCredentials(
    provider: AccountingSyncProvider,
    dto: {
      clientId?: string
      clientSecret?: string
      accessToken?: string
      orgId?: string
    },
    updatedById?: string | null,
  ) {
    const keys = this.keysFor(provider)

    if (dto.clientId !== undefined) {
      const value = dto.clientId.trim()
      if (value) {
        await this.secrets.upsertNonSecret({
          category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
          key: keys.clientId,
          value,
          updatedById,
        })
      } else {
        await this.secrets.deleteSecret(
          SYSTEM_SECRET_CATEGORY.INTEGRATION,
          keys.clientId,
        )
      }
    }
    if (dto.clientSecret?.trim()) {
      await this.secrets.upsertSecret({
        category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
        key: keys.clientSecret,
        plaintext: dto.clientSecret.trim(),
        updatedById,
      })
    }
    if (dto.accessToken?.trim()) {
      await this.secrets.upsertSecret({
        category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
        key: keys.accessToken,
        plaintext: dto.accessToken.trim(),
        updatedById,
      })
    }
    if (dto.orgId !== undefined) {
      const value = dto.orgId.trim()
      if (value) {
        await this.secrets.upsertNonSecret({
          category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
          key: keys.orgId,
          value,
          updatedById,
        })
      } else {
        await this.secrets.deleteSecret(
          SYSTEM_SECRET_CATEGORY.INTEGRATION,
          keys.orgId,
        )
      }
    }

    return this.getProviderStatus(provider)
  }

  async clearCredentials(provider: AccountingSyncProvider) {
    const keys = this.keysFor(provider)
    await Promise.all([
      this.secrets.deleteSecret(SYSTEM_SECRET_CATEGORY.INTEGRATION, keys.clientId),
      this.secrets.deleteSecret(
        SYSTEM_SECRET_CATEGORY.INTEGRATION,
        keys.clientSecret,
      ),
      this.secrets.deleteSecret(
        SYSTEM_SECRET_CATEGORY.INTEGRATION,
        keys.accessToken,
      ),
      this.secrets.deleteSecret(SYSTEM_SECRET_CATEGORY.INTEGRATION, keys.orgId),
      this.secrets.deleteSecret(
        SYSTEM_SECRET_CATEGORY.INTEGRATION,
        keys.lastSyncAt,
      ),
    ])
    return this.getProviderStatus(provider)
  }

  async syncProvider(
    provider: AccountingSyncProvider,
    actorUserId?: string | null,
  ) {
    const status = await this.getProviderStatus(provider)
    if (!status.configured) {
      throw new BadRequestException(
        `${provider} is not configured. Add an access token and organisation id under Settings → Integrations.`,
      )
    }

    const accessToken = await this.secrets.getSecretValue(
      SYSTEM_SECRET_CATEGORY.INTEGRATION,
      this.keysFor(provider).accessToken,
    )
    const orgId = status.orgId
    if (!accessToken || !orgId) {
      throw new BadRequestException(`${provider} credentials incomplete`)
    }

    const since = status.lastSyncAt ? new Date(status.lastSyncAt) : null
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.issued,
        ...(since
          ? {
              OR: [
                { updatedAt: { gt: since } },
                { issueDate: { gt: since } },
              ],
            }
          : {}),
      },
      orderBy: [{ issueDate: 'asc' }, { invoiceNumber: 'asc' }],
      include: exportInclude,
    })

    this.logger.log(
      `Accounting sync ${provider}: ${invoices.length} invoice(s)` +
        (since ? ` since ${since.toISOString()}` : ' (full)'),
    )

    const results: Array<{
      invoiceId: string
      invoiceNumber: string | null
      ok: boolean
      error?: string
    }> = []

    for (const invoice of invoices) {
      try {
        if (provider === 'xero') {
          await this.pushXeroInvoice(invoice, accessToken, orgId)
        } else {
          await this.pushQuickBooksInvoice(invoice, accessToken, orgId)
        }
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          ok: true,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.warn(
          `${provider} sync failed for ${invoice.invoiceNumber ?? invoice.id}: ${message}`,
        )
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          ok: false,
          error: message,
        })
      }
    }

    const syncedAt = new Date().toISOString()
    const successCount = results.filter((r) => r.ok).length
    if (successCount > 0 || invoices.length === 0) {
      await this.secrets.upsertNonSecret({
        category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
        key: this.keysFor(provider).lastSyncAt,
        value: syncedAt,
      })
    }

    await this.audit.log({
      userId: actorUserId ?? null,
      action: 'accounting.sync',
      resource: provider,
      module: ACCOUNTING_MODULE,
      newValue: {
        attempted: invoices.length,
        succeeded: successCount,
        failed: results.length - successCount,
        since: since?.toISOString() ?? null,
        syncedAt,
      },
    })

    return {
      provider,
      attempted: invoices.length,
      succeeded: successCount,
      failed: results.length - successCount,
      lastSyncAt: syncedAt,
      results,
    }
  }

  private keysFor(provider: AccountingSyncProvider) {
    if (provider === 'xero') {
      return {
        clientId: INTEGRATION_SECRET_KEYS.XERO_CLIENT_ID,
        clientSecret: INTEGRATION_SECRET_KEYS.XERO_CLIENT_SECRET,
        accessToken: INTEGRATION_SECRET_KEYS.XERO_ACCESS_TOKEN,
        orgId: INTEGRATION_SECRET_KEYS.XERO_TENANT_ID,
        lastSyncAt: INTEGRATION_SECRET_KEYS.XERO_LAST_SYNC_AT,
      }
    }
    return {
      clientId: INTEGRATION_SECRET_KEYS.QUICKBOOKS_CLIENT_ID,
      clientSecret: INTEGRATION_SECRET_KEYS.QUICKBOOKS_CLIENT_SECRET,
      accessToken: INTEGRATION_SECRET_KEYS.QUICKBOOKS_ACCESS_TOKEN,
      orgId: INTEGRATION_SECRET_KEYS.QUICKBOOKS_REALM_ID,
      lastSyncAt: INTEGRATION_SECRET_KEYS.QUICKBOOKS_LAST_SYNC_AT,
    }
  }

  private buildLineItems(invoice: SyncInvoice) {
    const lines: Array<{
      description: string
      quantity: number
      unitAmount: number
    }> = []

    for (const fee of invoice.fixedFees) {
      lines.push({
        description: fee.description,
        quantity: 1,
        unitAmount: roundMoney(Number(fee.amount)),
      })
    }
    for (const entry of invoice.timeEntries) {
      lines.push({
        description: entry.description,
        quantity: roundMoney(Number(entry.hours)),
        unitAmount: roundMoney(Number(entry.rateSnapshot)),
      })
    }

    if (lines.length === 0) {
      lines.push({
        description: invoice.matter.title,
        quantity: 1,
        unitAmount: roundMoney(Number(invoice.subtotal)),
      })
    }

    return lines
  }

  private async pushXeroInvoice(
    invoice: SyncInvoice,
    accessToken: string,
    tenantId: string,
  ) {
    const lines = this.buildLineItems(invoice)
    const taxType =
      Number(invoice.taxAmount) > 0 ? 'OUTPUT2' : 'NONE'

    const body = {
      Invoices: [
        {
          Type: 'ACCREC',
          Contact: { Name: clientName(invoice.client) },
          InvoiceNumber: invoice.invoiceNumber ?? invoice.id,
          Date: formatDate(invoice.issueDate),
          DueDate: formatDate(invoice.dueDate),
          Reference: invoice.matter.title,
          Status: 'AUTHORISED',
          CurrencyCode: invoice.currency,
          LineItems: lines.map((line) => ({
            Description: line.description.slice(0, 4000),
            Quantity: line.quantity,
            UnitAmount: line.unitAmount,
            AccountCode: REVENUE_ACCOUNT,
            TaxType: taxType,
          })),
        },
      ],
    }

    const res = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Xero-tenant-id': tenantId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ServiceUnavailableException(
        `Xero API ${res.status}: ${text.slice(0, 300)}`,
      )
    }
  }

  private async pushQuickBooksInvoice(
    invoice: SyncInvoice,
    accessToken: string,
    realmId: string,
  ) {
    const customerId = await this.resolveQuickBooksCustomerId(
      clientName(invoice.client),
      accessToken,
      realmId,
    )

    const lines = this.buildLineItems(invoice)
    const body = {
      DocNumber: (invoice.invoiceNumber ?? invoice.id).slice(0, 21),
      TxnDate: formatDate(invoice.issueDate),
      DueDate: formatDate(invoice.dueDate),
      PrivateNote: invoice.matter.title,
      CustomerRef: { value: customerId },
      Line: lines.map((line, index) => ({
        Id: String(index + 1),
        Amount: roundMoney(line.quantity * line.unitAmount),
        DetailType: 'SalesItemLineDetail',
        Description: line.description.slice(0, 4000),
        SalesItemLineDetail: {
          Qty: line.quantity,
          UnitPrice: line.unitAmount,
        },
      })),
    }

    const url = `https://quickbooks.api.intuit.com/v3/company/${encodeURIComponent(realmId)}/invoice?minorversion=65`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ServiceUnavailableException(
        `QuickBooks API ${res.status}: ${text.slice(0, 300)}`,
      )
    }
  }

  private async resolveQuickBooksCustomerId(
    displayName: string,
    accessToken: string,
    realmId: string,
  ): Promise<string> {
    const query = encodeURIComponent(
      `select * from Customer where DisplayName = '${displayName.replace(/'/g, "\\'")}'`,
    )
    const lookupUrl = `https://quickbooks.api.intuit.com/v3/company/${encodeURIComponent(realmId)}/query?query=${query}&minorversion=65`
    const lookup = await fetch(lookupUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (lookup.ok) {
      const json = (await lookup.json()) as {
        QueryResponse?: { Customer?: Array<{ Id: string }> }
      }
      const existing = json.QueryResponse?.Customer?.[0]?.Id
      if (existing) return existing
    }

    const createUrl = `https://quickbooks.api.intuit.com/v3/company/${encodeURIComponent(realmId)}/customer?minorversion=65`
    const create = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ DisplayName: displayName.slice(0, 500) }),
    })

    if (!create.ok) {
      const text = await create.text().catch(() => '')
      throw new ServiceUnavailableException(
        `QuickBooks customer create failed ${create.status}: ${text.slice(0, 300)}`,
      )
    }

    const created = (await create.json()) as { Customer?: { Id?: string } }
    if (!created.Customer?.Id) {
      throw new ServiceUnavailableException(
        'QuickBooks customer create returned no Id',
      )
    }
    return created.Customer.Id
  }
}
