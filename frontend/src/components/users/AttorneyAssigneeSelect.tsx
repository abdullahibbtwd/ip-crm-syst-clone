import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useAttorneyAssignees } from '@/features/users/hooks/useAttorneyAssignees'
import { formatAssigneeOption } from '@/features/users/utils'
import type { AttorneyAssignee } from '@/features/users/api'
import { cn } from '@/lib/utils'

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
  placeholder = 'Select responsible attorney',
  allowUnassigned = true,
  'aria-invalid': ariaInvalid,
}: AttorneyAssigneeSelectProps) {
  const { data: assignees, isLoading } = useAttorneyAssignees()

  const selectValue = value ?? (allowUnassigned ? UNASSIGNED_VALUE : '')

  const displayLabel = useMemo(() => {
    if (!value) {
      return allowUnassigned ? 'Unassigned' : null
    }
    const assignee = assignees?.find((a) => a.id === value)
    return assignee ? formatAssigneeOption(assignee) : null
  }, [value, assignees, allowUnassigned])

  const resolvedPlaceholder = isLoading ? 'Loading attorneys…' : placeholder

  return (
    <Select
      value={selectValue}
      onValueChange={(v) =>
        onValueChange(v === UNASSIGNED_VALUE || !v ? undefined : v)
      }
    >
      <SelectTrigger aria-invalid={ariaInvalid}>
        <span
          className={cn(
            'flex-1 truncate text-left',
            !displayLabel && 'text-muted-foreground/70',
          )}
        >
          {displayLabel ?? resolvedPlaceholder}
        </span>
      </SelectTrigger>
      <SelectContent>
        {allowUnassigned ? (
          <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
        ) : null}
        {assignees?.map((assignee: AttorneyAssignee) => (
          <SelectItem key={assignee.id} value={assignee.id}>
            {formatAssigneeOption(assignee)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
