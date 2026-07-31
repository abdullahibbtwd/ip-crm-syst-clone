import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/features/crm/hooks/useClients'
import { clientDisplayName } from '@/features/crm/utils'
import type { IntakePartyFormValues } from '@/features/intake/schemas'
import { cn } from '@/lib/utils'

type PartyMode = 'same' | 'link' | 'create'

type IntakePartyFieldsProps = {
  label: string
  hint?: string
  value: IntakePartyFormValues | undefined
  onChange: (value: IntakePartyFormValues | undefined) => void
  excludeClientId?: string
  className?: string
}

function modeFromValue(value: IntakePartyFormValues | undefined): PartyMode {
  if (!value) return 'same'
  if (value.existingClientId) return 'link'
  if (value.companyName || value.fullName) return 'create'
  return 'same'
}

export function IntakePartyFields({
  label,
  hint,
  value,
  onChange,
  excludeClientId,
  className,
}: IntakePartyFieldsProps) {
  const { t } = useTranslation('intake')
  const [mode, setMode] = useState<PartyMode>(() => modeFromValue(value))
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data: results } = useClients({
    search: debounced || undefined,
    limit: 8,
    status: 'active',
  })

  const options =
    results?.items.filter((c) => c.id !== excludeClientId) ?? []

  const setModeAndClear = (next: PartyMode) => {
    setMode(next)
    setSearch('')
    if (next === 'same') onChange(undefined)
    if (next === 'link') onChange({ existingClientId: value?.existingClientId })
    if (next === 'create')
      onChange({
        type: value?.type ?? 'company',
        companyName: value?.companyName,
        fullName: value?.fullName,
        country: value?.country,
      })
  }

  return (
    <div className={cn('space-y-2 rounded-md border p-3', className)}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>

      <Select value={mode} onValueChange={(v) => setModeAndClear(v as PartyMode)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="same">{t('parties.modeSame')}</SelectItem>
          <SelectItem value="link">{t('parties.modeLink')}</SelectItem>
          <SelectItem value="create">{t('parties.modeCreate')}</SelectItem>
        </SelectContent>
      </Select>

      {mode === 'link' ? (
        <div className="space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('parties.searchPlaceholder')}
          />
          {value?.existingClientId ? (
            <p className="text-xs text-muted-foreground">
              {t('parties.selected')}:{' '}
              {options.find((c) => c.id === value.existingClientId)
                ? clientDisplayName(
                    options.find((c) => c.id === value.existingClientId)!,
                  )
                : value.existingClientId}
            </p>
          ) : null}
          <ul className="max-h-36 space-y-1 overflow-y-auto text-sm">
            {options.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={cn(
                    'w-full rounded-md px-2 py-1.5 text-left hover:bg-muted',
                    value?.existingClientId === c.id && 'bg-primary/10',
                  )}
                  onClick={() => onChange({ existingClientId: c.id })}
                >
                  {clientDisplayName(c)}
                  {c.internalCode ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({c.internalCode})
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mode === 'create' ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label>{t('parties.type')}</Label>
            <Select
              value={value?.type ?? 'company'}
              onValueChange={(v) =>
                onChange({
                  ...value,
                  type: v as 'company' | 'individual',
                  companyName: v === 'company' ? value?.companyName : undefined,
                  fullName: v === 'individual' ? value?.fullName : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">{t('form.type.company')}</SelectItem>
                <SelectItem value="individual">{t('form.type.individual')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(value?.type ?? 'company') === 'company' ? (
            <div className="space-y-1">
              <Label>{t('form.companyName')}</Label>
              <Input
                value={value?.companyName ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    type: 'company',
                    companyName: e.target.value,
                  })
                }
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>{t('form.fullName')}</Label>
              <Input
                value={value?.fullName ?? ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    type: 'individual',
                    fullName: e.target.value,
                  })
                }
              />
            </div>
          )}
          <div className="space-y-1">
            <Label>{t('form.country')}</Label>
            <CountrySelect
              value={value?.country ?? ''}
              onValueChange={(country) => onChange({ ...value, type: value?.type ?? 'company', country })}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
