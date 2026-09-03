import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEnqueueAccountingSync } from '@/features/invoices/hooks/useAccountingIntegrations'
import { downloadCsvFile, invoicesApi } from '@/features/invoices/api'
import { InvoiceListTable } from '@/features/invoices/components/InvoiceListTable'
import { useAllInvoices } from '@/features/invoices/hooks/useInvoices'
import type {
  AccountingExportFormat,
  InvoiceStatus,
  PaymentStatus,
} from '@/features/invoices/types'
import { paymentStatusLabel } from '@/features/invoices/utils'
import { getApiErrorMessage } from '@/lib/api-client'

const PAYMENT_FILTER_VALUES = ['all', 'unpaid', 'partial', 'paid'] as const
const STATUS_FILTER_VALUES = ['all', 'draft', 'issued'] as const
const EXPORT_FORMAT_VALUES: AccountingExportFormat[] = ['journal', 'xero', 'quickbooks']

export function InvoicesListPage() {
  const { t } = useTranslation('finance')
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState<AccountingExportFormat | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const syncXero = useEnqueueAccountingSync('xero')
  const syncQuickBooks = useEnqueueAccountingSync('quickbooks')

  const paymentFilter = searchParams.get('paymentStatus') ?? 'all'
  const statusFilter = searchParams.get('status') ?? 'all'
  const proformaOnly = searchParams.get('proforma') === '1'

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const filters = {
    ...(proformaOnly
      ? { proformaOnly: true }
      : statusFilter !== 'all'
        ? { status: statusFilter as InvoiceStatus }
        : {}),
    ...(paymentFilter !== 'all' ? { paymentStatus: paymentFilter as PaymentStatus } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    limit: 100,
  }

  const { data, isLoading, isError } = useAllInvoices(filters)
  const invoices = data?.items ?? []

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const paymentFilterLabel = (value: string) => {
    if (value === 'all') return t('invoices.filters.allPayments')
    return paymentStatusLabel(value as PaymentStatus)
  }

  const statusFilterLabel = (value: string) => {
    if (value === 'all') return t('invoices.filters.allStatuses')
    return t(`invoices.invoiceStatus.${value as InvoiceStatus}`)
  }

  const handleExport = async (format: AccountingExportFormat) => {
    setExportError(null)
    setExporting(format)
    try {
      const result = await invoicesApi.exportAccounting({
        format,
        ...(exportFrom ? { from: exportFrom } : {}),
        ...(exportTo ? { to: exportTo } : {}),
      })
      downloadCsvFile(result.csv, result.filename)
    } catch (err) {
      setExportError(getApiErrorMessage(err, t('invoices.exportFailed')))
    } finally {
      setExporting(null)
    }
  }

  const handleLiveSync = async (provider: 'xero' | 'quickbooks') => {
    setSyncMessage(null)
    setExportError(null)
    try {
      const result =
        provider === 'xero'
          ? await syncXero.mutateAsync()
          : await syncQuickBooks.mutateAsync()
      setSyncMessage(result.message)
    } catch (err) {
      setExportError(getApiErrorMessage(err, t('invoices.syncFailed')))
    }
  }

  return (
    <PermissionGate
      resource="invoice"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">{t('invoices.noPermission')}</p>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl text-foreground md:text-3xl">
              {proformaOnly ? t('invoices.proformasTitle') : t('invoices.title')}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {proformaOnly ? t('invoices.proformasSubtitle') : t('invoices.listSubtitle')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('invoices.exportFrom')}</label>
            <Input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t('invoices.exportTo')}</label>
            <Input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPORT_FORMAT_VALUES.map((format) => (
              <Button
                key={format}
                type="button"
                size="sm"
                variant="outline"
                disabled={exporting !== null}
                onClick={() => handleExport(format)}
              >
                <Download className="size-3.5" />
                {exporting === format
                  ? t('invoices.exporting')
                  : t(`invoices.exportFormats.${format}`)}
              </Button>
            ))}
            <PermissionGate resource="invoice" action="update">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={syncXero.isPending || syncQuickBooks.isPending}
                onClick={() => void handleLiveSync('xero')}
              >
                {syncXero.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {t('invoices.syncXero')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={syncXero.isPending || syncQuickBooks.isPending}
                onClick={() => void handleLiveSync('quickbooks')}
              >
                {syncQuickBooks.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {t('invoices.syncQuickBooks')}
              </Button>
            </PermissionGate>
          </div>
          {syncMessage ? <p className="w-full text-sm text-emerald-700">{syncMessage}</p> : null}
          {exportError ? <p className="w-full text-sm text-destructive">{exportError}</p> : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder={t('invoices.searchListPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={proformaOnly ? 'draft' : statusFilter}
            onValueChange={(v) => setFilter('status', v ?? 'all')}
            disabled={proformaOnly}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {statusFilterLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={paymentFilter}
            onValueChange={(v) => setFilter('paymentStatus', v ?? 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_FILTER_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {paymentFilterLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">{t('invoices.loading')}</p>}
        {isError && <p className="text-sm text-destructive">{t('invoices.error')}</p>}

        {!isLoading && !isError && (
          <InvoiceListTable invoices={invoices} showMatter enableFinanceActions />
        )}
      </div>
    </PermissionGate>
  )
}
