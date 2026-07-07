import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { formatIntakeDateTime } from '@/features/intake/utils'
import { cn } from '@/lib/utils'

type StatusConfig = {
  labelKey: string
  variant: 'info' | 'warning' | 'success' | 'secondary' | 'destructive'
  hintKey: string
  icon: typeof Clock
}

function portalStatusConfig(status: IntakeLead['status']): StatusConfig {
  switch (status) {
    case 'new':
      return {
        labelKey: 'intake.status.submitted',
        variant: 'info',
        hintKey: 'intakeDetail.statusHints.new',
        icon: Clock,
      }
    case 'reviewing':
    case 'conflict_check':
      return {
        labelKey: 'intake.status.inReview',
        variant: 'warning',
        hintKey: 'intakeDetail.statusHints.reviewing',
        icon: Clock,
      }
    case 'conflict_flagged':
      return {
        labelKey: 'intake.status.inReview',
        variant: 'warning',
        hintKey: 'intakeDetail.statusHints.conflictFlagged',
        icon: Clock,
      }
    case 'approved':
      return {
        labelKey: 'intake.status.accepted',
        variant: 'success',
        hintKey: 'intakeDetail.statusHints.approved',
        icon: CheckCircle2,
      }
    case 'converted':
      return {
        labelKey: 'intake.status.matterOpened',
        variant: 'success',
        hintKey: 'intakeDetail.statusHints.converted',
        icon: CheckCircle2,
      }
    case 'rejected':
      return {
        labelKey: 'intake.status.notAccepted',
        variant: 'destructive',
        hintKey: 'intakeDetail.statusHints.rejected',
        icon: XCircle,
      }
  }
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
      <span className="text-sm text-foreground">{value || '-'}</span>
    </div>
  )
}

export function PortalIntakeDetailPage() {
  const { t } = useTranslation('portal')
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { data: lead, isLoading, isError } = useIntakeLead(id)
  const updateIntake = useUpdateMyIntake(id)
  const [editing, setEditing] = useState(false)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('intakeDetail.loading')}</p>
  }
  if (isError || !lead) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{t('intakeDetail.error')}</p>
        <Link to="/portal/intake" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          {t('intakeDetail.backToEnquiries')}
        </Link>
      </div>
    )
  }

  const status = portalStatusConfig(lead.status)
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
        {t('intakeDetail.backToEnquiries')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">
            {lead.companyName || lead.fullName || t('intakeDetail.defaultTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`matterTypes.${lead.matterType}`)} ·{' '}
            {t('intakeDetail.filed', { date: formatIntakeDateTime(lead.createdAt) })}
          </p>
        </div>
        <Badge variant={status.variant} className="normal-case tracking-normal">
          {t(status.labelKey)}
        </Badge>
      </div>

      <Card className="border-primary/15 bg-primary/[0.04] shadow-none">
        <CardContent className="flex items-start gap-3 p-4">
          <StatusIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-foreground">{t(status.hintKey)}</p>
        </CardContent>
      </Card>

      {editing ? (
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('intakeDetail.editTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('intakeDetail.editDescription')}
            </p>
            <CreateIntakeForm
              variant="portal"
              defaultEmail={user?.email}
              defaultFullName={user?.fullName}
              initialValues={toInitialValues(lead)}
              isSubmitting={updateIntake.isPending}
              submitLabel={t('intakeDetail.saveChanges')}
              onSubmit={handleSubmit}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => setEditing(false)}
            >
              {t('intakeDetail.cancel')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
              {t('intakeDetail.enquiryDetails')}
            </CardTitle>
            {editable && (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
                {t('intakeDetail.edit')}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow
              label={t('intakeDetail.enquirer')}
              value={
                lead.enquirerType === 'company'
                  ? t('intakeDetail.enquirerCompany')
                  : t('intakeDetail.enquirerIndividual')
              }
            />
            <DetailRow
              label={
                lead.enquirerType === 'company'
                  ? t('intakeDetail.fields.companyName')
                  : t('intakeDetail.fields.fullName')
              }
              value={lead.companyName || lead.fullName || ''}
            />
            <DetailRow label={t('intakeDetail.fields.country')} value={lead.country ?? ''} />
            <DetailRow label={t('intakeDetail.fields.email')} value={lead.email ?? ''} />
            <DetailRow label={t('intakeDetail.fields.phone')} value={lead.phone ?? ''} />
            <DetailRow
              label={t('intakeDetail.fields.matterType')}
              value={t(`matterTypes.${lead.matterType}`)}
            />
            <DetailRow
              label={t('intakeDetail.fields.urgency')}
              value={
                lead.urgency === 'urgent'
                  ? t('intakeDetail.urgency.urgent')
                  : t('intakeDetail.urgency.normal')
              }
            />
            <DetailRow label={t('intakeDetail.fields.description')} value={lead.description} />
            {lead.counterparties.length > 0 && (
              <DetailRow
                label={t('intakeDetail.fields.otherParties')}
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
                  {t('intakeDetail.viewMatter')}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
