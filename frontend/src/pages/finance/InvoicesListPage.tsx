import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { PAYMENT_STATUS_LABELS } from '@/features/invoices/utils'
import { getApiErrorMessage } from '@/lib/api-client'

const PAYMENT_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All payments' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
]

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
]

const EXPORT_FORMATS: Array<{ value: AccountingExportFormat; label: string }> = [
  { value: 'journal', label: 'Journal CSV' },
  { value: 'xero', label: 'Xero CSV' },
  { value: 'quickbooks', label: 'QuickBooks CSV' },
]

export function InvoicesListPage() {
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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const filters = {
    ...(statusFilter !== 'all' ? { status: statusFilter as InvoiceStatus } : {}),
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
      setExportError(getApiErrorMessage(err, 'Accounting export failed'))
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
      setExportError(getApiErrorMessage(err, 'Accounting sync failed'))
    }
  }

  return (
    <PermissionGate
      resource="invoice"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">You do not have permission to view invoices.</p>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl text-foreground md:text-3xl">Invoices</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Firm-wide invoice register across all matters. Issue invoices from matter billing tabs,
              then record payments here.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Export from</label>
            <Input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Export to</label>
            <Input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPORT_FORMATS.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant="outline"
                disabled={exporting !== null}
                onClick={() => handleExport(item.value)}
              >
                <Download className="size-3.5" />
                {exporting === item.value ? 'Exporting…' : item.label}
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
                Sync Xero
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
                Sync QuickBooks
              </Button>
            </PermissionGate>
          </div>
          {syncMessage ? <p className="w-full text-sm text-emerald-700">{syncMessage}</p> : null}
          {exportError ? <p className="w-full text-sm text-destructive">{exportError}</p> : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search invoice no., matter, client…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={(v) => setFilter('status', v ?? 'all')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
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
              {PAYMENT_FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label === 'All payments' ? item.label : PAYMENT_STATUS_LABELS[item.value as PaymentStatus]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading invoices…</p>}
        {isError && <p className="text-sm text-destructive">Failed to load invoices.</p>}

        {!isLoading && !isError && (
          <InvoiceListTable
            invoices={invoices}
            showMatter
            enableFinanceActions
          />
        )}
      </div>
    </PermissionGate>
  )
}
