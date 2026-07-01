import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useDeadlineAssignees } from '@/features/deadlines/hooks/useDeadlines'
import { cn } from '@/lib/utils'

type DeadlineAssigneeSelectProps = {
  value: string
  onValueChange: (userId: string) => void
  placeholder?: string
  enabled?: boolean
  id?: string
  'aria-invalid'?: boolean
}

export function DeadlineAssigneeSelect({
  value,
  onValueChange,
  placeholder = 'Select team member',
  enabled = true,
  id,
  'aria-invalid': ariaInvalid,
}: DeadlineAssigneeSelectProps) {
  const { data: members, isLoading } = useDeadlineAssignees(enabled)

  const displayLabel = useMemo(() => {
    if (!value) return null
    return members?.find((m) => m.id === value)?.fullName ?? null
  }, [value, members])

  const resolvedPlaceholder = isLoading ? 'Loading…' : placeholder

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? '')}>
      <SelectTrigger id={id} aria-invalid={ariaInvalid}>
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
        {members?.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
