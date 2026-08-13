import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilePlus, Inbox, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CreateIntakeForm } from '@/components/intake/CreateIntakeForm'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCreateIntake, useIntakeLeads } from '@/features/intake/hooks/useIntake'
import type { IntakeLead } from '@/features/intake/types'
import type { CreateIntakeFormValues } from '@/features/intake/schemas'
import { formatIntakeDate } from '@/features/intake/utils'
import { cn } from '@/lib/utils'

const PORTAL_STATUS_VARIANT: Record<
  IntakeLead['status'],
  'info' | 'warning' | 'success' | 'secondary' | 'destructive'
> = {
  new: 'info',
  reviewing: 'warning',
  conflict_check: 'warning',
  conflict_flagged: 'warning',
  approved: 'success',
  converted: 'success',
  rejected: 'destructive',
}

const VALID_MATTER_TYPES = new Set<CreateIntakeFormValues['matterType']>([
  'trademark',
  'patent',
  'utility_model',
  'industrial_design',
  'copyright',
  'geographical_indication',
  'border_measures',
  'fto_analysis',
  'valuation',
  'dispute_opposition',
  'cases',
  'domain',
  'litigation_expert_report',
  'consultation',
  'official_fee_payment',
  'other',
])

function portalStatusKey(status: IntakeLead['status']) {
  switch (status) {
    case 'new':
      return 'intake.status.submitted'
    case 'reviewing':
    case 'conflict_check':
    case 'conflict_flagged':
      return 'intake.status.inReview'
    case 'approved':
      return 'intake.status.accepted'
    case 'converted':
      return 'intake.status.matterOpened'
    case 'rejected':
      return 'intake.status.notAccepted'
  }
}

export function PortalIntakePage() {
  const { t } = useTranslation(['portal', 'matters'])
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const createIntake = useCreateIntake()
  const [submitted, setSubmitted] = useState<IntakeLead | null>(null)

  const tab = searchParams.get('tab') === 'new' ? 'new' : 'list'
  const typeParam = searchParams.get('type')
  const initialMatterType =
    typeParam && VALID_MATTER_TYPES.has(typeParam as CreateIntakeFormValues['matterType'])
      ? (typeParam as CreateIntakeFormValues['matterType'])
      : 'trademark'

  const { data, isLoading, isError } = useIntakeLeads({ limit: 50 })
  const items = data?.items ?? []

  const goTo = (next: 'list' | 'new') => {
    const params = new URLSearchParams(searchParams)
    if (next === 'new') params.set('tab', 'new')
    else {
      params.delete('tab')
      params.delete('type')
    }
    setSearchParams(params, { replace: true })
  }

  const handleSubmit = async (values: CreateIntakeFormValues) => {
    const created = await createIntake.mutateAsync(values)
    setSubmitted(created)
  }

  const showList = () => {
    setSubmitted(null)
    goTo('list')
  }

  const enquiryTitle = (lead: IntakeLead) =>
    lead.companyName || lead.fullName || t('intake.untitled')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground">{t('intake.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('intake.description')}</p>
      </div>

      <div className="inline-flex rounded-lg border bg-muted/40 p-1">
        <TabButton active={tab === 'list'} onClick={() => goTo('list')} icon={Inbox}>
          {t('intake.myEnquiries')}
        </TabButton>
        <TabButton
          active={tab === 'new'}
          onClick={() => {
            setSubmitted(null)
            goTo('new')
          }}
          icon={FilePlus}
        >
          {t('intake.fileNew')}
        </TabButton>
      </div>

      {tab === 'new' ? (
        submitted ? (
          <Card className="border-primary/20 bg-primary/5 shadow-none">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <CheckCircle2 className="size-12 text-primary" aria-hidden />
              <div>
                <h2 className="font-serif text-2xl text-foreground">
                  {t('intake.submitted.title')}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('intake.submitted.description')}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link to={`/portal/intake/${submitted.id}`} className={buttonVariants()}>
                  {t('intake.submitted.reviewEnquiry')}
                </Link>
                <button
                  type="button"
                  onClick={showList}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  {t('intake.myEnquiries')}
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <CreateIntakeForm
            variant="portal"
            defaultEmail={user?.email}
            defaultFullName={user?.fullName}
            initialMatterType={initialMatterType}
            isSubmitting={createIntake.isPending}
            onSubmit={handleSubmit}
          />
        )
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t('intake.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('intake.error')}</p>
      ) : items.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Inbox className="size-6" aria-hidden />
            </span>
            <div>
              <p className="font-medium text-foreground">{t('intake.empty.title')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('intake.empty.description')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => goTo('new')}
              className={buttonVariants({ variant: 'outline' })}
            >
              <FilePlus className="size-4" />
              {t('intake.empty.action')}
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((lead) => {
            const variant = PORTAL_STATUS_VARIANT[lead.status]
            return (
              <Link key={lead.id} to={`/portal/intake/${lead.id}`} className="block">
                <Card className="group border-border/70 shadow-none transition hover:border-primary/40 hover:shadow-sm">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">
                          {enquiryTitle(lead)}
                        </p>
                        <Badge variant={variant} className="normal-case tracking-normal">
                          {t(portalStatusKey(lead.status))}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t(`type.${lead.matterType}`, { ns: 'matters' })} ·{' '}
                        {t('intake.filed', { date: formatIntakeDate(lead.createdAt) })}
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        'size-4 shrink-0 text-muted-foreground transition',
                        'group-hover:translate-x-0.5 group-hover:text-primary',
                      )}
                      aria-hidden
                    />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Inbox
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </button>
  )
}
