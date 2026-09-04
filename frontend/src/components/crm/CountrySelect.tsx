import { useMemo } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fieldVariants, focusRing } from '@/components/ui/shared'
import { getCountryLabel, getCountryOptions } from '@/lib/countries'
import { cn } from '@/lib/utils'

type CountryItem = {
  value: string
  label: string
}

type CountrySelectProps = {
  value: string
  onValueChange: (code: string) => void
  placeholder?: string
  className?: string
  'aria-invalid'?: boolean
  allowEmpty?: boolean
  disabled?: boolean
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder,
  className,
  'aria-invalid': ariaInvalid,
  allowEmpty = true,
  disabled = false,
}: CountrySelectProps) {
  const { t } = useTranslation('crm')
  const resolvedPlaceholder = placeholder ?? t('countrySelect.placeholder')
  const items = useMemo(() => {
    const countries = getCountryOptions().map((country) => ({
      value: country.code,
      label: country.name,
    }))
    return allowEmpty
      ? [{ value: '', label: t('countrySelect.none') }, ...countries]
      : countries
  }, [allowEmpty, t])

  const selected = useMemo((): CountryItem | null => {
    if (!value) return null
    return (
      items.find((item) => item.value === value) ?? {
        value,
        label: getCountryLabel(value),
      }
    )
  }, [value, items])

  return (
    <Combobox.Root
      items={items}
      value={selected}
      onValueChange={(item) => onValueChange(item?.value ?? '')}
      isItemEqualToValue={(a, b) => a.value === b.value}
      autoHighlight
      disabled={disabled}
    >
      <Combobox.Trigger
        className={cn(
          fieldVariants(),
          'flex w-full cursor-pointer items-center justify-between gap-2 pr-2.5 text-left',
          'data-placeholder:text-muted-foreground/70',
          className,
        )}
        aria-invalid={ariaInvalid}
      >
        <span className="flex-1 truncate">
          <Combobox.Value placeholder={resolvedPlaceholder} />
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground/80" />
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner side="bottom" sideOffset={6} align="start" className="isolate z-50">
          <Combobox.Popup
            className={cn(
              'w-(--anchor-width) min-w-40 origin-(--transform-origin) overflow-hidden rounded-md',
              'border border-border/80 bg-popover text-popover-foreground shadow-lg shadow-foreground/5',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:duration-150',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            )}
          >
            <div className="border-b border-border/80 p-2">
              <Combobox.Input
                placeholder={t('countrySelect.search')}
                className={cn(fieldVariants({ size: 'sm' }), 'w-full')}
              />
            </div>

            <Combobox.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t('countrySelect.empty')}
            </Combobox.Empty>

            <Combobox.List className="max-h-64 overflow-y-auto p-1 shell-scrollbar">
              {(item: CountryItem) => (
                <Combobox.Item
                  key={item.value || 'none'}
                  value={item}
                  className={cn(
                    'relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-2 pr-8 pl-2',
                    'text-sm outline-none select-none',
                    'data-highlighted:bg-muted/80 data-highlighted:text-foreground',
                    focusRing,
                  )}
                >
                  <Combobox.ItemIndicator
                    className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-primary"
                  >
                    <Check className="size-3.5 stroke-[2.5]" />
                  </Combobox.ItemIndicator>
                  <span className="truncate">{item.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
