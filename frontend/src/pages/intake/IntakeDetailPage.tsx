import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { CounterpartiesSection } from '@/components/intake/CounterpartiesSection'
import { ClientAddressFields } from '@/components/crm/ClientAddressFields'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  emptyClientAddressInput,
  toClientAddressPayload,
} from '@/features/crm/addressInput'
import {
  useConvertIntake,
  useIntakeLead,
  useResolveConflict,
  useRunConflictCheck,
} from '@/features/intake/hooks/useIntake'
import { convertIntakeSchema } from '@/features/intake/schemas'
import {
  conflictEntityLabel,
  formatSimilarity,
  groupConflictHits,
  intakeDisplayName,
  intakeMatterTypeLabel,
  intakeStatusLabel,
  referralSourceLabel,
} from '@/features/intake/utils'
import { useHoldingGroups } from '@/features/crm/hooks/useHoldingGroups'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/api-client'
import { getCountryLabel } from '@/lib/countries'
import { cn } from '@/lib/utils'

export function IntakeDetailPage() {
  const { t } = useTranslation(['intake', 'crm', 'common'])
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: lead, isLoading, isError } = useIntakeLead(id)
  const conflictCheck = useRunConflictCheck(id)
  const resolveConflict = useResolveConflict(id)
  const convertIntake = useConvertIntake(id)
  const { data: holdingGroups } = useHoldingGroups()

  const [gdprConsent, setGdprConsent] = useState(false)
  const [holdingGroupId, setHoldingGroupId] = useState<string | undefined>()
  const [registeredLegalAddress, setRegisteredLegalAddress] = useState(
    emptyClientAddressInput(),
  )
  const [correspondenceAddress, setCorrespondenceAddress] = useState(
    emptyClientAddressInput(),
  )
  const [convertError, setConvertError] = useState<string | null>(null)

  const isManagingPartner = user?.roles.includes('managing_partner')
  const latestCheck = lead?.conflictChecks[0]
  const isPortalSubmission = lead?.source === 'portal' && Boolean(lead?.submittedClient)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('intake:detail.loadingLead')}</p>
  }
  if (isError || !lead) {
    return <p className="text-sm text-destructive">{t('intake:detail.notFound')}</p>
  }

  const handleConvert = async () => {
    setConvertError(null)
    const parsed = convertIntakeSchema.safeParse({
      gdprConsent: isPortalSubmission ? true : gdprConsent,
      holdingGroupId,
      registeredLegalAddress: toClientAddressPayload(registeredLegalAddress),
      correspondenceAddress: toClientAddressPayload(correspondenceAddress),
    })
    if (!parsed.success) {
      setConvertError(parsed.error.issues[0]?.message ?? t('intake:convert.invalidForm'))
      return
    }
    try {
      const result = await convertIntake.mutateAsync(parsed.data)
      const matterId = result.convertedMatter?.id
      if (matterId) {
        navigate(`/matters/${matterId}/overview`, { replace: true })
        return
      }
      const clientId = result.convertedClient?.id
      if (clientId) navigate(`/clients/${clientId}/overview`, { replace: true })
    } catch (err) {
      setConvertError(getApiErrorMessage(err, t('intake:convert.conversionFailed')))
    }
  }

  const matterPreviewTitle = `${intakeDisplayName(lead)} - ${intakeMatterTypeLabel(lead.matterType)}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/intake"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
      >
        {t('intake:detail.back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl">{intakeDisplayName(lead)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {intakeMatterTypeLabel(lead.matterType)} · {referralSourceLabel(lead.referralSource)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPortalSubmission && (
            <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
              {t('intake:detail.portalSubmission')}
            </Badge>
          )}
          <Badge variant="secondary">{intakeStatusLabel(lead.status)}</Badge>
        </div>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('intake:detail.enquiryDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Field label={t('intake:detail.type')} value={lead.enquirerType} />
          <Field label={t('intake:detail.country')} value={getCountryLabel(lead.country)} />
          {lead.companyName && <Field label={t('intake:detail.company')} value={lead.companyName} />}
          {lead.fullName && (
            <Field label={t('intake:detail.contactName')} value={lead.fullName} />
          )}
          <Field label={t('intake:detail.email')} value={lead.email} />
          <Field label={t('intake:detail.phone')} value={lead.phone} />
          <Field label={t('intake:detail.urgency')} value={lead.urgency} />
          <Field
            label={t('intake:detail.responsibleAttorney')}
            value={lead.assignedUser?.fullName ?? t('intake:detail.notAssigned')}
          />
          {lead.referredBy && (
            <Field label={t('intake:detail.referredBy')} value={lead.referredBy} />
          )}
          <div className="sm:col-span-2">
            <Field label={t('intake:detail.description')} value={lead.description} />
          </div>
          {lead.notes && (
            <div className="sm:col-span-2">
              <Field label={t('intake:detail.internalNotes')} value={lead.notes} />
            </div>
          )}
        </CardContent>
      </Card>

      <CounterpartiesSection
        intakeId={lead.id}
        status={lead.status}
        counterparties={lead.counterparties ?? []}
      />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('intake:conflict.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!latestCheck && lead.status !== 'converted' && lead.status !== 'rejected' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('intake:conflict.description')}</p>
              <Button
                onClick={() => conflictCheck.mutate()}
                disabled={conflictCheck.isPending}
              >
                {conflictCheck.isPending ? t('intake:conflict.running') : t('intake:conflict.run')}
              </Button>
              {conflictCheck.isError && (
                <p className="text-sm text-destructive">
                  {getApiErrorMessage(conflictCheck.error)}
                </p>
              )}
            </div>
          )}

          {latestCheck && (
            <div className="space-y-3">
              <div
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4',
                  latestCheck.result === 'flagged'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-emerald-500/30 bg-emerald-500/5',
                )}
              >
                {latestCheck.result === 'flagged' ? (
                  <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                )}
                <div>
                  <p className="font-medium">
                    {latestCheck.result === 'flagged'
                      ? t('intake:conflict.flaggedMatches', { count: latestCheck.hits.length })
                      : t('intake:conflict.clearedForConversion')}
                  </p>
                  {latestCheck.result === 'flagged' && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('intake:conflict.reviewHint')}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('intake:conflict.checkedAt', {
                      date: new Date(latestCheck.createdAt).toLocaleString(),
                    })}
                  </p>
                </div>
              </div>

              {latestCheck.hits.length > 0 && (
                <div className="space-y-4 text-sm">
                  {[...groupConflictHits(latestCheck.hits).entries()].map(([entityType, hits]) => (
                    <div key={entityType}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {conflictEntityLabel(entityType)} ({hits.length})
                      </p>
                      <ul className="space-y-2">
                        {hits.map((hit) => (
                          <li
                            key={`${hit.entityType}-${hit.entityId}-${hit.matchField}`}
                            className="rounded-md border px-3 py-2"
                          >
                            <p>{hit.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {hit.matchedTerm ? (
                                <>
                                  {t('intake:conflict.matchedTerm', {
                                    term: hit.matchedTerm,
                                    field: hit.matchField.replace(/_/g, ' '),
                                  })}
                                  {hit.similarity != null && (
                                    <>
                                      {' '}
                                      ·{' '}
                                      {t('intake:conflict.similarPct', {
                                        pct: formatSimilarity(hit.similarity),
                                      })}
                                    </>
                                  )}
                                </>
                              ) : (
                                t('intake:conflict.matchedOn', {
                                  field: hit.matchField.replace(/_/g, ' '),
                                })
                              )}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {lead.status === 'conflict_flagged' && latestCheck.resolution === 'pending' && (
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    size="sm"
                    onClick={() =>
                      resolveConflict.mutate({
                        decision: 'approved',
                        note: 'Reviewed - no conflict',
                      })
                    }
                    disabled={resolveConflict.isPending}
                  >
                    {t('intake:conflict.approve')}
                  </Button>
                  {isManagingPartner && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        resolveConflict.mutate({
                          decision: 'overridden',
                          note: 'MP override',
                        })
                      }
                      disabled={resolveConflict.isPending}
                    >
                      {t('intake:conflict.mpOverride')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveConflict.mutate({ decision: 'rejected' })}
                    disabled={resolveConflict.isPending}
                  >
                    {t('intake:conflict.rejectLead')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {lead.status === 'approved' && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4" />
              {t('intake:convert.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isPortalSubmission
                ? t('intake:convert.portalDescription')
                : t('intake:convert.standardDescription')}
            </p>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{t('intake:convert.willCreate')}</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {!isPortalSubmission && (
                  <li>
                    <span className="text-foreground">{t('intake:convert.clientLabel')}</span>{' '}
                    {intakeDisplayName(lead)}
                    {lead.country ? ` (${getCountryLabel(lead.country)})` : ''}
                  </li>
                )}
                {isPortalSubmission && lead.submittedClient && (
                  <li>
                    <span className="text-foreground">{t('intake:convert.clientLabel')}</span>{' '}
                    {lead.submittedClient.companyName ??
                      [lead.submittedClient.firstName, lead.submittedClient.lastName]
                        .filter(Boolean)
                        .join(' ')}{' '}
                    <span className="text-xs">{t('intake:convert.existingPortalAccount')}</span>
                  </li>
                )}
                <li>
                  <span className="text-foreground">{t('intake:convert.matterLabel')}</span>{' '}
                  {matterPreviewTitle}
                  {lead.country ? ` · ${lead.country}` : ''}
                  {lead.assignedUser ? ` · ${lead.assignedUser.fullName}` : ''}
                </li>
              </ul>
            </div>

            {!isPortalSubmission && (
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <span>{t('intake:convert.gdprConsent')}</span>
              </label>
            )}

            {!isPortalSubmission && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium">{t('crm:offices.addresses.title')}</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <ClientAddressFields
                    idPrefix="convert-registered"
                    title={t('crm:offices.addresses.registeredLegal')}
                    value={registeredLegalAddress}
                    onChange={setRegisteredLegalAddress}
                  />
                  <ClientAddressFields
                    idPrefix="convert-correspondence"
                    title={t('crm:offices.addresses.correspondence')}
                    value={correspondenceAddress}
                    onChange={setCorrespondenceAddress}
                  />
                </div>
              </div>
            )}

            <div className="max-w-xs space-y-1.5">
              <p className="text-sm font-medium">{t('intake:convert.holdingGroup')}</p>
              <Select
                value={holdingGroupId ?? ''}
                onValueChange={(v) => setHoldingGroupId(v || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('intake:convert.none')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('intake:convert.none')}</SelectItem>
                  {holdingGroups?.items.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {convertError && <p className="text-sm text-destructive">{convertError}</p>}

            <Button
              onClick={handleConvert}
              disabled={(!isPortalSubmission && !gdprConsent) || convertIntake.isPending}
            >
              {convertIntake.isPending
                ? t('intake:convert.converting')
                : t('intake:convert.button')}
            </Button>
          </CardContent>
        </Card>
      )}

      {lead.status === 'converted' && (lead.convertedMatter || lead.convertedClient) && (
        <Card className="shadow-none border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div>
              <p className="font-medium">{t('intake:convert.converted')}</p>
              <p className="text-sm text-muted-foreground">
                {lead.convertedMatter?.title}
                {lead.convertedClient?.internalCode
                  ? ` · ${lead.convertedClient.internalCode}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lead.convertedMatter ? (
                <Link
                  to={`/matters/${lead.convertedMatter.id}/overview`}
                  className={buttonVariants({ variant: 'default', size: 'sm' })}
                >
                  {t('intake:convert.openMatter')}
                </Link>
              ) : null}
              {lead.convertedClient ? (
                <Link
                  to={`/clients/${lead.convertedClient.id}/overview`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  {t('intake:convert.viewClient')}
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 capitalize">{value ?? '-'}</p>
    </div>
  )
}
