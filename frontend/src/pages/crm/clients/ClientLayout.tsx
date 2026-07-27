import { Link, Navigate, Outlet, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClientSidebar } from '@/components/crm/ClientSidebar'
import { ClientTabNav } from '@/components/crm/ClientTabNav'
import { useClientSummary } from '@/features/crm/hooks/useClients'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ClientLayout() {
  const { t } = useTranslation('crm')
  const { id = '' } = useParams()
  const { data: summary, isLoading } = useClientSummary(id)

  if (!id) return <Navigate to="/clients" replace />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/clients"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
        >
          {t('layout.backToClients')}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <ClientSidebar summary={summary} isLoading={isLoading} />
        <div className="min-w-0 space-y-4">
          <ClientTabNav clientId={id} />
          <Outlet context={{ clientId: id, summary }} />
        </div>
      </div>
    </div>
  )
}

export type ClientTabContext = {
  clientId: string
  summary?: ReturnType<typeof useClientSummary>['data']
}
