import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  useDecideApproval,
  usePortalApprovals,
} from '@/features/approvals/hooks/useApprovals'
import type { ClientApprovalRequest } from '@/features/approvals/types'
import { getApiErrorMessage } from '@/lib/api-client'

function PendingApprovalCard({ approval }: { approval: ClientApprovalRequest }) {
  const { t } = useTranslation('portal')
  const decide = useDecideApproval()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleDecide = async (decision: 'approved' | 'rejected') => {
    setError(null)
    try {
      await decide.mutateAsync({
        id: approval.id,
        data: {
          decision,
          note: note.trim() || undefined,
        },
      })
      setNote('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('approvals.decideError')))
    }
  }

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">{approval.title}</p>
          {approval.matter?.title ? (
            <p className="text-sm text-muted-foreground">{approval.matter.title}</p>
          ) : null}
          {approval.description ? (
            <p className="text-sm text-muted-foreground">{approval.description}</p>
          ) : null}
          {approval.dueDate ? (
            <p className="text-sm text-muted-foreground">
              {t('approvals.due', {
                date: new Date(approval.dueDate).toLocaleDateString(),
              })}
            </p>
          ) : null}
          <Badge variant="outline" className="mt-1">
            {t(`approvals.status.${approval.status}`)}
          </Badge>
        </div>
      </div>

      {approval.status === 'pending' ? (
        <div className="mt-4 space-y-3">
          <Textarea
            rows={2}
            placeholder={t('approvals.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={decide.isPending}
              onClick={() => void handleDecide('approved')}
            >
              {t('approvals.approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={decide.isPending}
              onClick={() => void handleDecide('rejected')}
            >
              {t('approvals.reject')}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function PortalApprovalsPage() {
  const { t } = useTranslation('portal')
  const { data: approvals, isLoading, isError, refetch } = usePortalApprovals()

  const pending = (approvals ?? []).filter((a) => a.status === 'pending')
  const decided = (approvals ?? []).filter((a) => a.status !== 'pending')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          {t('approvals.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('approvals.description')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('approvals.loading')}</p>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">{t('approvals.couldNotLoad')}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            {t('approvals.retry')}
          </Button>
        </div>
      ) : !approvals?.length ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t('approvals.empty.title')}</p>
          <p className="mt-2">{t('approvals.empty.description')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium">{t('approvals.pendingSection')}</h2>
              <ul className="space-y-3">
                {pending.map((row) => (
                  <PendingApprovalCard key={row.id} approval={row} />
                ))}
              </ul>
            </section>
          ) : null}

          {decided.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium">{t('approvals.historySection')}</h2>
              <ul className="space-y-3">
                {decided.map((row) => (
                  <li key={row.id} className="rounded-lg border p-4">
                    <p className="font-medium">{row.title}</p>
                    {row.matter?.title ? (
                      <p className="text-sm text-muted-foreground">{row.matter.title}</p>
                    ) : null}
                    <Badge variant="outline" className="mt-2">
                      {t(`approvals.status.${row.status}`)}
                    </Badge>
                    {row.decisionNote ? (
                      <p className="mt-2 text-sm text-muted-foreground">{row.decisionNote}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
