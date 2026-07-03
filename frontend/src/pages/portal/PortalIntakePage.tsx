import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilePlus, Inbox, ChevronRight, CheckCircle2 } from 'lucide-react'
import { CreateIntakeForm } from '@/components/intake/CreateIntakeForm'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCreateIntake, useIntakeLeads } from '@/features/intake/hooks/useIntake'
import type { IntakeLead } from '@/features/intake/types'
import type { CreateIntakeFormValues } from '@/features/intake/schemas'
import { formatIntakeDate, MATTER_TYPE_LABELS } from '@/features/intake/utils'
import { cn } from '@/lib/utils'

const PORTAL_STATUS: Record<
  IntakeLead['status'],
  { label: string; variant: 'info' | 'warning' | 'success' | 'secondary' | 'destructive' }
> = {
  new: { label: 'Submitted', variant: 'info' },
  reviewing: { label: 'In review', variant: 'warning' },
  conflict_check: { label: 'In review', variant: 'warning' },
  conflict_flagged: { label: 'In review', variant: 'warning' },
  approved: { label: 'Accepted', variant: 'success' },
  converted: { label: 'Matter opened', variant: 'success' },
  rejected: { label: 'Not accepted', variant: 'destructive' },
}

const VALID_MATTER_TYPES = new Set<CreateIntakeFormValues['matterType']>([
  'trademark',
  'patent',
  'utility_model',
  'design',
  'other',
])

function enquiryTitle(lead: IntakeLead) {
  return lead.companyName || lead.fullName || 'Untitled enquiry'
}

export function PortalIntakePage() {
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground">Enquiries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          File a new filing request or review the enquiries you have already submitted.
        </p>
      </div>

      <div className="inline-flex rounded-lg border bg-muted/40 p-1">
        <TabButton active={tab === 'list'} onClick={() => goTo('list')} icon={Inbox}>
          My enquiries
        </TabButton>
        <TabButton
          active={tab === 'new'}
          onClick={() => {
            setSubmitted(null)
            goTo('new')
          }}
          icon={FilePlus}
        >
          File new enquiry
        </TabButton>
      </div>

      {tab === 'new' ? (
        submitted ? (
          <Card className="border-primary/20 bg-primary/5 shadow-none">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <CheckCircle2 className="size-12 text-primary" aria-hidden />
              <div>
                <h2 className="font-serif text-2xl text-foreground">Enquiry submitted</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  We ran an initial conflict check automatically. A coordinator will confirm
                  and open your matter. You can review or edit your enquiry any time until it
                  is accepted.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Link to={`/portal/intake/${submitted.id}`} className={buttonVariants()}>
                  Review this enquiry
                </Link>
                <button
                  type="button"
                  onClick={showList}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  My enquiries
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
        <p className="text-sm text-muted-foreground">Loading your enquiries…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load your enquiries.</p>
      ) : items.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Inbox className="size-6" aria-hidden />
            </span>
            <div>
              <p className="font-medium text-foreground">No enquiries yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                File a trademark or patent enquiry to get started.
              </p>
            </div>
            <button
              type="button"
              onClick={() => goTo('new')}
              className={buttonVariants({ variant: 'outline' })}
            >
              <FilePlus className="size-4" />
              File an enquiry
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((lead) => {
            const status = PORTAL_STATUS[lead.status]
            return (
              <Link key={lead.id} to={`/portal/intake/${lead.id}`} className="block">
                <Card className="group border-border/70 shadow-none transition hover:border-primary/40 hover:shadow-sm">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">
                          {enquiryTitle(lead)}
                        </p>
                        <Badge variant={status.variant} className="normal-case tracking-normal">
                          {status.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {MATTER_TYPE_LABELS[lead.matterType]} · Filed {formatIntakeDate(lead.createdAt)}
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
