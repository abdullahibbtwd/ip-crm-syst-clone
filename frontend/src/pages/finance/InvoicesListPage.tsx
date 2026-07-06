import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InvoiceListTable } from '@/features/invoices/components/InvoiceListTable'
import { useAllInvoices } from '@/features/invoices/hooks/useInvoices'
import type { InvoiceStatus, PaymentStatus } from '@/features/invoices/types'
import { PAYMENT_STATUS_LABELS } from '@/features/invoices/utils'

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

export function InvoicesListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput)

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

  return (
    <PermissionGate
      resource="invoice"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">You do not have permission to view invoices.</p>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">Invoices</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Firm-wide invoice register across all matters. Issue invoices from matter billing tabs,
            then record payments here.
          </p>
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
