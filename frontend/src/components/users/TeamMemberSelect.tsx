import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useTeamMembers } from '@/features/tasks/hooks/useTasks'
import type { TeamMember } from '@/features/tasks/types'
import { cn } from '@/lib/utils'

type TeamMemberSelectProps = {
  value: string
  onValueChange: (userId: string) => void
  placeholder?: string
  enabled?: boolean
  id?: string
  'aria-invalid'?: boolean
}

export function TeamMemberSelect({
  value,
  onValueChange,
  placeholder = 'Select team member',
  enabled = true,
  id,
  'aria-invalid': ariaInvalid,
}: TeamMemberSelectProps) {
  const { data: members, isLoading } = useTeamMembers(enabled)

  const displayLabel = useMemo(() => {
    if (!value) return null
    const member = members?.find((m) => m.id === value)
    return member?.fullName ?? null
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
        {members?.map((member: TeamMember) => (
          <SelectItem key={member.id} value={member.id}>
            {member.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
