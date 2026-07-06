import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { renewalsApi } from '@/features/renewals/api'
import { usePortalRenewals } from '@/features/renewals/hooks/useRenewals'
import { renewalKeys } from '@/features/renewals/queryKeys'
import { RENEWAL_STATUS_LABELS } from '@/features/renewals/utils'
import { formatDeadlineDate } from '@/features/deadlines/utils'
import { getApiErrorMessage } from '@/lib/api-client'

export function PortalRenewalsPage() {
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Renewals</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming trademark and design renewals for your IP rights.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Could not load renewals</p>
          <p className="mt-1 text-muted-foreground">
            {getApiErrorMessage(error, 'Please try again or sign out and back in if permissions changed.')}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : !renewals?.length ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">No renewals require your attention</p>
          <p className="mt-2">
            Renewals appear here after your firm registers an IP right on one of your matters.
            You will be asked to <strong className="font-medium text-foreground">Proceed</strong> or{' '}
            <strong className="font-medium text-foreground">Decline</strong> before each renewal due date.
          </p>
          <p className="mt-3">
            <Link to="/matters" className="text-primary hover:underline">
              View my matters
            </Link>
            {' · '}
            <Link to="/deadlines/my" className="text-primary hover:underline">
              View my deadlines
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {renewals.map((row) => (
            <li key={row.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.ipRight.title}</p>
                  <p className="text-sm text-muted-foreground">{row.matter.title}</p>
                  <p className="mt-1 text-sm">
                    Due {formatDeadlineDate(row.dueDate)} · cycle {row.cycleNumber}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {RENEWAL_STATUS_LABELS[row.status]}
                  </Badge>
                </div>
                {row.status === 'upcoming' ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={instruct.isPending}
                      onClick={() => {
                        instruct.mutate(
                          { id: row.id, decision: 'proceed' },
                          {
                            onError: (err) =>
                              alert(getApiErrorMessage(err, 'Could not submit instruction')),
                          },
                        )
                      }}
                    >
                      Proceed
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
                              alert(getApiErrorMessage(err, 'Could not submit instruction')),
                          },
                        )
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
