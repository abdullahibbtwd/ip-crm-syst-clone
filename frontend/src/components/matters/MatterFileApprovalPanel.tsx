import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Circle, ShieldCheck, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/AuthProvider'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

export type FileApprovalState = {
  clientConfirmed?: boolean
  clientConfirmedAt?: string
  clientConfirmedById?: string
  clientConfirmedByName?: string
  partnerApproved?: boolean
  partnerApprovedAt?: string
  partnerApprovedById?: string
  partnerApprovedByName?: string
}

export function readFileApproval(
  attrs: Record<string, unknown>,
): FileApprovalState {
  const raw = attrs.fileApproval
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as FileApprovalState
}

type MatterFileApprovalPanelProps = {
  matter: MatterDetail
}

export function MatterFileApprovalPanel({ matter }: MatterFileApprovalPanelProps) {
  const { t } = useTranslation('matters')
  const { user } = useAuth()
  const canUpdate = usePermission('matter', 'update')
  const isManagingPartner = user?.roles.includes('managing_partner') ?? false
  const updateMatter = useUpdateMatter(matter.id)
  const [error, setError] = useState<string | null>(null)

  if (matter.status !== 'draft') return null

  const attrs = matter.attributes?.attributes ?? {}
  const approval = readFileApproval(attrs)
  const clientDone = Boolean(approval.clientConfirmed)
  const partnerDone = Boolean(approval.partnerApproved)

  const mergeApproval = (patch: FileApprovalState) => ({
    ...attrs,
    fileApproval: {
      ...approval,
      ...patch,
    },
  })

  const markClientApproved = async () => {
    if (!user || !canUpdate) return
    setError(null)
    try {
      await updateMatter.mutateAsync({
        attributes: mergeApproval({
          clientConfirmed: true,
          clientConfirmedAt: new Date().toISOString(),
          clientConfirmedById: user.id,
          clientConfirmedByName: user.fullName,
        }),
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('fileApproval.errors.updateFailed')))
    }
  }

  const markPartnerApproved = async () => {
    if (!user || !isManagingPartner) return
    setError(null)
    try {
      await updateMatter.mutateAsync({
        status: 'active',
        attributes: {
          ...attrs,
          fileApproval: {
            ...approval,
            partnerApproved: true,
            partnerApprovedAt: new Date().toISOString(),
            partnerApprovedById: user.id,
            partnerApprovedByName: user.fullName,
          },
          prosecution: {
            ...(typeof attrs.prosecution === 'object' &&
            attrs.prosecution &&
            !Array.isArray(attrs.prosecution)
              ? (attrs.prosecution as Record<string, unknown>)
              : {}),
            stage: 'filing',
          },
        },
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('fileApproval.errors.updateFailed')))
    }
  }

  return (
    <Card className="lg:col-span-2 border-primary/20 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="text-base">{t('fileApproval.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('fileApproval.hint')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className={cn(
              'rounded-xl border p-4',
              clientDone ? 'border-emerald-500/40 bg-emerald-500/5' : 'bg-card',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'rounded-lg p-2',
                  clientDone
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {clientDone ? (
                  <Check className="size-5" />
                ) : (
                  <UserCheck className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{t('fileApproval.clientStep')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('fileApproval.clientStepHint')}
                </p>
                {clientDone ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('fileApproval.recordedBy', {
                      name: approval.clientConfirmedByName ?? '—',
                      date: approval.clientConfirmedAt
                        ? new Date(approval.clientConfirmedAt).toLocaleString()
                        : '—',
                    })}
                  </p>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    disabled={!canUpdate || updateMatter.isPending}
                    onClick={() => void markClientApproved()}
                  >
                    {t('fileApproval.markClientApproved')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div
            className={cn(
              'rounded-xl border p-4',
              partnerDone ? 'border-emerald-500/40 bg-emerald-500/5' : 'bg-card',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'rounded-lg p-2',
                  partnerDone
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {partnerDone ? (
                  <Check className="size-5" />
                ) : (
                  <ShieldCheck className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{t('fileApproval.partnerStep')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('fileApproval.partnerStepHint')}
                </p>
                {partnerDone ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('fileApproval.recordedBy', {
                      name: approval.partnerApprovedByName ?? '—',
                      date: approval.partnerApprovedAt
                        ? new Date(approval.partnerApprovedAt).toLocaleString()
                        : '—',
                    })}
                  </p>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    disabled={
                      !isManagingPartner ||
                      !clientDone ||
                      updateMatter.isPending
                    }
                    onClick={() => void markPartnerApproved()}
                  >
                    {t('fileApproval.partnerApprove')}
                  </Button>
                )}
                {!isManagingPartner && !partnerDone ? (
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Circle className="size-2.5 fill-current" />
                    {t('fileApproval.partnerOnly')}
                  </p>
                ) : null}
                {isManagingPartner && !clientDone && !partnerDone ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    {t('fileApproval.waitForClient')}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
