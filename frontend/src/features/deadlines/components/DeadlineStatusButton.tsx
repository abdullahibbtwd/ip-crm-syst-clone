import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import type { DeadlineStatus } from '@/features/deadlines/types'
import { useUpdateDeadlineStatus } from '@/features/deadlines/hooks/useDeadlines'

type DeadlineStatusButtonProps = {
  deadlineId: string
  status: DeadlineStatus
  matterId?: string
}

export function DeadlineStatusButton({
  deadlineId,
  status,
  matterId,
}: DeadlineStatusButtonProps) {
  const { t } = useTranslation('deadlines')
  const updateStatus = useUpdateDeadlineStatus(matterId)

  if (status === 'completed' || status === 'superseded') return null

  return (
    <PermissionGate resource="deadline" action="update">
      <Button
        size="sm"
        variant="outline"
        disabled={updateStatus.isPending}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          updateStatus.mutate({
            id: deadlineId,
            status: status === 'pending' ? 'in_progress' : 'completed',
          })
        }}
      >
        {status === 'pending' ? t('actions.start') : t('actions.complete')}
      </Button>
    </PermissionGate>
  )
}
