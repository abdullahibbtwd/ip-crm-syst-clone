import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { CounterpartiesSection } from '@/components/intake/CounterpartiesSection'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  useConvertIntake,
  useIntakeLead,
  useResolveConflict,
  useRunConflictCheck,
} from '@/features/intake/hooks/useIntake'
import { convertIntakeSchema } from '@/features/intake/schemas'
import {
  INTAKE_STATUS_LABELS,
  MATTER_TYPE_LABELS,
  REFERRAL_SOURCE_LABELS,
  CONFLICT_ENTITY_LABELS,
  formatSimilarity,
  groupConflictHits,
  intakeDisplayName,
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
  const [convertError, setConvertError] = useState<string | null>(null)

  const isManagingPartner = user?.roles.includes('managing_partner')
  const latestCheck = lead?.conflictChecks[0]

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading intake lead…</p>
  if (isError || !lead) {
    return <p className="text-sm text-destructive">Intake lead not found.</p>
  }

  const handleConvert = async () => {
    setConvertError(null)
    const parsed = convertIntakeSchema.safeParse({ gdprConsent, holdingGroupId })
    if (!parsed.success) {
      setConvertError(parsed.error.issues[0]?.message ?? 'Invalid form')
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
      setConvertError(getApiErrorMessage(err, 'Conversion failed'))
    }
  }

  const matterPreviewTitle = `${intakeDisplayName(lead)} - ${MATTER_TYPE_LABELS[lead.matterType]}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/intake"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
      >
        ← Back to intake
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl">{intakeDisplayName(lead)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {MATTER_TYPE_LABELS[lead.matterType]} · {REFERRAL_SOURCE_LABELS[lead.referralSource]}
          </p>
        </div>
        <Badge variant="secondary">{INTAKE_STATUS_LABELS[lead.status]}</Badge>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Enquiry details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Field label="Type" value={lead.enquirerType} />
          <Field label="Country" value={getCountryLabel(lead.country)} />
          {lead.companyName && <Field label="Company" value={lead.companyName} />}
          {lead.fullName && <Field label="Contact name" value={lead.fullName} />}
          <Field label="Email" value={lead.email} />
          <Field label="Phone" value={lead.phone} />
          <Field label="Urgency" value={lead.urgency} />
          <Field
            label="Responsible attorney"
            value={lead.assignedUser?.fullName ?? 'Not assigned'}
          />
          {lead.referredBy && <Field label="Referred by" value={lead.referredBy} />}
          <div className="sm:col-span-2">
            <Field label="Description" value={lead.description} />
          </div>
          {lead.notes && (
            <div className="sm:col-span-2">
              <Field label="Internal notes" value={lead.notes} />
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
          <CardTitle className="text-base">Conflict check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!latestCheck && lead.status !== 'converted' && lead.status !== 'rejected' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Fuzzy search across clients, contacts, related companies, and recorded
                counterparties. Matches above 30% composite similarity are flagged for review.
              </p>
              <Button
                onClick={() => conflictCheck.mutate()}
                disabled={conflictCheck.isPending}
              >
                {conflictCheck.isPending ? 'Running…' : 'Run conflict check'}
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
                      ? `${latestCheck.hits.length} potential match(es) - review required`
                      : 'No similar names found - cleared for conversion'}
                  </p>
                  {latestCheck.result === 'flagged' && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Similar names are surfaced for human review. Approve if there is no real
                      conflict, or reject if the lead cannot proceed.
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Checked {new Date(latestCheck.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {latestCheck.hits.length > 0 && (
                <div className="space-y-4 text-sm">
                  {[...groupConflictHits(latestCheck.hits).entries()].map(([entityType, hits]) => (
                    <div key={entityType}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {CONFLICT_ENTITY_LABELS[entityType]} ({hits.length})
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
                                  Matched “{hit.matchedTerm}” on {hit.matchField.replace(/_/g, ' ')}
                                  {hit.similarity != null && (
                                    <> · {formatSimilarity(hit.similarity)} similar</>
                                  )}
                                </>
                              ) : (
                                <>Matched on {hit.matchField.replace(/_/g, ' ')}</>
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
                    Approve - no conflict
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
                      MP override
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveConflict.mutate({ decision: 'rejected' })}
                    disabled={resolveConflict.isPending}
                  >
                    Reject lead
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
              Convert to matter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Creates a client record and opens a matter in one step - no re-entering enquiry
              details. GDPR consent is required at this step.
            </p>

            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Will create</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>
                  <span className="text-foreground">Client:</span> {intakeDisplayName(lead)}
                  {lead.country ? ` (${getCountryLabel(lead.country)})` : ''}
                </li>
                <li>
                  <span className="text-foreground">Matter:</span> {matterPreviewTitle}
                  {lead.country ? ` · ${lead.country}` : ''}
                  {lead.assignedUser ? ` · ${lead.assignedUser.fullName}` : ''}
                </li>
              </ul>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={gdprConsent}
                onChange={(e) => setGdprConsent(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <span>
                I confirm valid GDPR consent has been obtained for this client before conversion.
              </span>
            </label>

            <div className="max-w-xs space-y-1.5">
              <p className="text-sm font-medium">Holding group (optional)</p>
              <Select
                value={holdingGroupId ?? ''}
                onValueChange={(v) => setHoldingGroupId(v || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {holdingGroups?.items.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {convertError && <p className="text-sm text-destructive">{convertError}</p>}

            <Button onClick={handleConvert} disabled={!gdprConsent || convertIntake.isPending}>
              {convertIntake.isPending ? 'Converting…' : 'Convert to matter'}
            </Button>
          </CardContent>
        </Card>
      )}

      {lead.status === 'converted' && (lead.convertedMatter || lead.convertedClient) && (
        <Card className="shadow-none border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div>
              <p className="font-medium">Converted to matter</p>
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
                  Open matter
                </Link>
              ) : null}
              {lead.convertedClient ? (
                <Link
                  to={`/clients/${lead.convertedClient.id}/overview`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  View client
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
