import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react'
import {
  CreateIntakeForm,
  type IntakeFormInitialValues,
} from '@/components/intake/CreateIntakeForm'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'
import { useIntakeLead, useUpdateMyIntake } from '@/features/intake/hooks/useIntake'
import type { IntakeLead } from '@/features/intake/types'
import type { CreateIntakeFormValues } from '@/features/intake/schemas'
import {
  formatIntakeDateTime,
  MATTER_TYPE_LABELS,
} from '@/features/intake/utils'
import { cn } from '@/lib/utils'

const PORTAL_STATUS: Record<
  IntakeLead['status'],
  {
    label: string
    variant: 'info' | 'warning' | 'success' | 'secondary' | 'destructive'
    hint: string
    icon: typeof Clock
  }
> = {
  new: {
    label: 'Submitted',
    variant: 'info',
    hint: 'Received. A conflict check has run automatically and a coordinator will review it shortly.',
    icon: Clock,
  },
  reviewing: {
    label: 'In review',
    variant: 'warning',
    hint: 'A coordinator is reviewing your enquiry.',
    icon: Clock,
  },
  conflict_check: {
    label: 'In review',
    variant: 'warning',
    hint: 'A coordinator is reviewing your enquiry.',
    icon: Clock,
  },
  conflict_flagged: {
    label: 'In review',
    variant: 'warning',
    hint: 'A coordinator is reviewing your enquiry before it can be accepted.',
    icon: Clock,
  },
  approved: {
    label: 'Accepted',
    variant: 'success',
    hint: 'Your enquiry has been accepted and is being set up as a matter.',
    icon: CheckCircle2,
  },
  converted: {
    label: 'Matter opened',
    variant: 'success',
    hint: 'A matter has been opened. You can track it under My matters.',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Not accepted',
    variant: 'destructive',
    hint: 'This enquiry was not accepted. Contact us if you have questions.',
    icon: XCircle,
  },
}

function toInitialValues(lead: IntakeLead): IntakeFormInitialValues {
  return {
    enquirerType: lead.enquirerType,
    companyName: lead.companyName ?? undefined,
    fullName: lead.fullName ?? undefined,
    country: lead.country ?? '',
    email: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    matterType: lead.matterType,
    description: lead.description,
    urgency: lead.urgency,
    referralSource: lead.referralSource,
    counterparties: lead.counterparties.map((cp) => ({
      name: cp.name ?? undefined,
      company: cp.company ?? undefined,
      relationship: cp.relationship,
      notes: cp.notes ?? undefined,
    })),
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  )
}

export function PortalIntakeDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { data: lead, isLoading, isError } = useIntakeLead(id)
  const updateIntake = useUpdateMyIntake(id)
  const [editing, setEditing] = useState(false)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading enquiry…</p>
  }
  if (isError || !lead) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">Could not load this enquiry.</p>
        <Link to="/portal/intake" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back to my enquiries
        </Link>
      </div>
    )
  }

  const status = PORTAL_STATUS[lead.status]
  const StatusIcon = status.icon
  const editable = lead.status !== 'converted' && lead.status !== 'rejected'

  const handleSubmit = async (data: CreateIntakeFormValues) => {
    await updateIntake.mutateAsync(data)
    setEditing(false)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/portal/intake"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
      >
        <ArrowLeft className="size-4" />
        Back to my enquiries
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">
            {lead.companyName || lead.fullName || 'Enquiry'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {MATTER_TYPE_LABELS[lead.matterType]} · Filed {formatIntakeDateTime(lead.createdAt)}
          </p>
        </div>
        <Badge variant={status.variant} className="normal-case tracking-normal">
          {status.label}
        </Badge>
      </div>

      <Card className="border-primary/15 bg-primary/[0.04] shadow-none">
        <CardContent className="flex items-start gap-3 p-4">
          <StatusIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-foreground">{status.hint}</p>
        </CardContent>
      </Card>

      {editing ? (
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Edit enquiry</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Saving will update your enquiry and re-run the conflict check automatically.
            </p>
            <CreateIntakeForm
              variant="portal"
              defaultEmail={user?.email}
              defaultFullName={user?.fullName}
              initialValues={toInitialValues(lead)}
              isSubmitting={updateIntake.isPending}
              submitLabel="Save changes"
              onSubmit={handleSubmit}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
              Enquiry details
            </CardTitle>
            {editable && (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label="Enquirer"
              value={lead.enquirerType === 'company' ? 'Company' : 'Individual'}
            />
            <DetailRow
              label={lead.enquirerType === 'company' ? 'Company name' : 'Full name'}
              value={lead.companyName || lead.fullName || ''}
            />
            <DetailRow label="Country" value={lead.country ?? ''} />
            <DetailRow label="Email" value={lead.email ?? ''} />
            <DetailRow label="Phone" value={lead.phone ?? ''} />
            <DetailRow label="Matter type" value={MATTER_TYPE_LABELS[lead.matterType]} />
            <DetailRow label="Urgency" value={lead.urgency === 'urgent' ? 'Urgent' : 'Normal'} />
            <DetailRow label="Description" value={lead.description} />
            {lead.counterparties.length > 0 && (
              <DetailRow
                label="Other parties"
                value={lead.counterparties
                  .map((cp) => cp.name || cp.company || '')
                  .filter(Boolean)
                  .join(', ')}
              />
            )}
            {lead.convertedMatter && (
              <div className="border-t pt-3">
                <Link
                  to={`/matters/${lead.convertedMatter.id}/overview`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  View matter
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
