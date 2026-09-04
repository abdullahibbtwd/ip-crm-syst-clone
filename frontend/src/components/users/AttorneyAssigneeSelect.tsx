import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAttorneyAssignees } from '@/features/users/hooks/useAttorneyAssignees'
import { formatAssigneeOption } from '@/features/users/utils'
import type { AttorneyAssignee } from '@/features/users/api'

const UNASSIGNED_VALUE = '__unassigned__'

type AttorneyAssigneeSelectProps = {
  value?: string
  onValueChange: (userId: string | undefined) => void
  placeholder?: string
  allowUnassigned?: boolean
  'aria-invalid'?: boolean
}

export function AttorneyAssigneeSelect({
  value,
  onValueChange,
  placeholder,
  allowUnassigned = true,
  'aria-invalid': ariaInvalid,
}: AttorneyAssigneeSelectProps) {
  const { t } = useTranslation('users')
  const { data: assignees, isLoading } = useAttorneyAssignees()

  const selectValue = value ?? (allowUnassigned ? UNASSIGNED_VALUE : '')
  const unassignedLabel = t('assigneeSelect.unassigned')
  const resolvedPlaceholder = isLoading
    ? t('assigneeSelect.loading')
    : (placeholder ?? t('assigneeSelect.placeholder'))

  const displayLabel = useMemo(() => {
    if (!value) {
      return allowUnassigned ? unassignedLabel : null
    }
    const assignee = assignees?.find((a) => a.id === value)
    return assignee ? formatAssigneeOption(assignee) : null
  }, [value, assignees, allowUnassigned, unassignedLabel])

  return (
    <Select
      value={selectValue}
      onValueChange={(v) =>
        onValueChange(v === UNASSIGNED_VALUE || !v ? undefined : v)
      }
    >
      <SelectTrigger aria-invalid={ariaInvalid}>
        <SelectValue placeholder={resolvedPlaceholder}>
          {displayLabel}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowUnassigned ? (
          <SelectItem value={UNASSIGNED_VALUE} label={unassignedLabel}>
            {unassignedLabel}
          </SelectItem>
        ) : null}
        {assignees?.map((assignee: AttorneyAssignee) => (
          <SelectItem
            key={assignee.id}
            value={assignee.id}
            label={formatAssigneeOption(assignee)}
          >
            {formatAssigneeOption(assignee)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
