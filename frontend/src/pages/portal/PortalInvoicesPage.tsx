import { useTranslation } from 'react-i18next'
import { PortalRetainerBalance } from '@/features/retainers/components/PortalRetainerBalance'
import { InvoiceListTable } from '@/features/invoices/components/InvoiceListTable'
import { usePortalInvoices } from '@/features/invoices/hooks/useInvoices'

export function PortalInvoicesPage() {
  const { t } = useTranslation('portal')
  const { data: invoices, isLoading, isError } = usePortalInvoices()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('invoices.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('invoices.description')}</p>
      </div>

      <PortalRetainerBalance />

      {isLoading && <p className="text-sm text-muted-foreground">{t('invoices.loading')}</p>}
      {isError && <p className="text-sm text-destructive">{t('invoices.error')}</p>}
      {invoices && (
        <InvoiceListTable invoices={invoices} portal showMatter />
      )}
    </div>
  )
}
