import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FALLBACK_JURISDICTION_OPTIONS } from '@/features/jurisdictions/utils'
import { useJurisdictionOptions } from '@/features/jurisdictions/hooks/useJurisdictions'

type JurisdictionSelectProps = {
  value: string
  onValueChange: (value: string) => void
  /** Include an "all" option (filters). */
  allowAll?: boolean
  allLabel?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
}

export function JurisdictionSelect({
  value,
  onValueChange,
  allowAll = false,
  allLabel = 'All jurisdictions',
  placeholder,
  className,
  disabled,
  id,
}: JurisdictionSelectProps) {
  const { options, isLoading } = useJurisdictionOptions()
  const items = options.length > 0 ? options : FALLBACK_JURISDICTION_OPTIONS

  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onValueChange(v ?? (allowAll ? 'all' : ''))}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">{allLabel}</SelectItem>}
        {items.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
