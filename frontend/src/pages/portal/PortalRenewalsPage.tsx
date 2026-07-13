import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { renewalsApi } from '@/features/renewals/api'
import { usePortalRenewals } from '@/features/renewals/hooks/useRenewals'
import { renewalKeys } from '@/features/renewals/queryKeys'
import { formatDeadlineDate } from '@/features/deadlines/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import type { RenewalStatus } from '@/features/renewals/types'

export function PortalRenewalsPage() {
  const { t } = useTranslation('portal')
  const qc = useQueryClient()
  const { data: renewals, isLoading, isError, error, refetch } = usePortalRenewals()

  const instruct = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string
      decision: 'proceed' | 'abandon'
    }) => renewalsApi.portalInstruct(id, { decision }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: renewalKeys.all })
    },
  })

  const instructPart = useMutation({
    mutationFn: ({
      partId,
      decision,
    }: {
      partId: string
      decision: 'proceed' | 'abandon'
    }) => renewalsApi.portalInstructPart(partId, { decision }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: renewalKeys.all })
    },
  })

  const renewalStatusLabel = (status: RenewalStatus) => t(`renewalStatus.${status}`)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          {t('renewals.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('renewals.description')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('renewals.loading')}</p>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">{t('renewals.couldNotLoad')}</p>
          <p className="mt-1 text-muted-foreground">
            {getApiErrorMessage(error, t('renewals.errorFallback'))}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            {t('renewals.retry')}
          </Button>
        </div>
      ) : !renewals?.length ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t('renewals.empty.title')}</p>
          <p className="mt-2">{t('renewals.empty.description')}</p>
          <p className="mt-3">
            <Link to="/matters" className="text-primary hover:underline">
              {t('renewals.empty.viewMatters')}
            </Link>
            {' · '}
            <Link to="/deadlines/my" className="text-primary hover:underline">
              {t('renewals.empty.viewDeadlines')}
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {renewals.map((row) => {
            const parts = row.parts ?? []
            const hasParts = parts.length > 0
            return (
              <li key={row.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.ipRight.title}</p>
                    <p className="text-sm text-muted-foreground">{row.matter.title}</p>
                    <p className="mt-1 text-sm">
                      {t('renewals.due', { date: formatDeadlineDate(row.dueDate) })} ·{' '}
                      {t('renewals.cycle', { number: row.cycleNumber })}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {renewalStatusLabel(row.status)}
                    </Badge>
                  </div>
                  {!hasParts && row.status === 'upcoming' ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={instruct.isPending}
                        onClick={() => {
                          instruct.mutate(
                            { id: row.id, decision: 'proceed' },
                            {
                              onError: (err) =>
                                alert(getApiErrorMessage(err, t('renewals.instructionError'))),
                            },
                          )
                        }}
                      >
                        {t('renewals.proceed')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={instruct.isPending}
                        onClick={() => {
                          instruct.mutate(
                            { id: row.id, decision: 'abandon' },
                            {
                              onError: (err) =>
                                alert(getApiErrorMessage(err, t('renewals.instructionError'))),
                            },
                          )
                        }}
                      >
                        {t('renewals.decline')}
                      </Button>
                    </div>
                  ) : null}
                </div>
                {hasParts ? (
                  <ul className="mt-3 space-y-2 border-t pt-3">
                    {parts.map((part) => (
                      <li
                        key={part.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{part.jurisdiction}</span>
                          {part.niceClasses.length ? (
                            <span className="text-muted-foreground">
                              {' '}
                              · classes {part.niceClasses.join(', ')}
                            </span>
                          ) : null}
                          <Badge variant="outline" className="ml-2">
                            {renewalStatusLabel(part.status)}
                          </Badge>
                        </div>
                        {part.status === 'upcoming' ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              disabled={instructPart.isPending}
                              onClick={() => {
                                instructPart.mutate(
                                  { partId: part.id, decision: 'proceed' },
                                  {
                                    onError: (err) =>
                                      alert(
                                        getApiErrorMessage(err, t('renewals.instructionError')),
                                      ),
                                  },
                                )
                              }}
                            >
                              {t('renewals.proceed')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={instructPart.isPending}
                              onClick={() => {
                                instructPart.mutate(
                                  { partId: part.id, decision: 'abandon' },
                                  {
                                    onError: (err) =>
                                      alert(
                                        getApiErrorMessage(err, t('renewals.instructionError')),
                                      ),
                                  },
                                )
                              }}
                            >
                              {t('renewals.decline')}
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
