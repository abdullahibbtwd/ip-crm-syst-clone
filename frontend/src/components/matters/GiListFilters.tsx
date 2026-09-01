import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Filter, RotateCcw, Search } from 'lucide-react'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHoldingGroups } from '@/features/crm/hooks/useHoldingGroups'
import {
  GI_FILTER_CERTIFICATE_OPTIONS,
  GI_FILTER_STATUS_OPTIONS,
  GI_FILTER_TERRITORY_OPTIONS,
  giStatusFilterLabelKey,
  giTerritoryFilterLabelKey,
} from '@/features/matters/gi-list-filter-options'
import {
  countActiveGiListFilters,
  EMPTY_GI_LIST_FILTERS,
  type GiListFilterState,
} from '@/features/matters/gi-list-filters'
import { cn } from '@/lib/utils'

type GiListFiltersProps = {
  value: GiListFilterState
  onChange: (next: GiListFilterState) => void
  onApply: () => void
  onClear: () => void
}

const ALL = 'all'

function OptionalSelect({
  value,
  placeholder,
  onValueChange,
  children,
}: {
  value: string
  placeholder: string
  onValueChange: (next: string) => void
  children: React.ReactNode
}) {
  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onValueChange(!v || v === ALL ? '' : v)}
    >
      <SelectTrigger className="bg-background">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL} label={placeholder}>
          {placeholder}
        </SelectItem>
        {children}
      </SelectContent>
    </Select>
  )
}

function FilterField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('grid gap-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function GiListFilters({
  value,
  onChange,
  onApply,
  onClear,
}: GiListFiltersProps) {
  const { t } = useTranslation('matters')
  const [open, setOpen] = useState(true)
  const { data: holdingGroups } = useHoldingGroups({ limit: 200 })
  const activeCount = countActiveGiListFilters(value)
  const chooseLabel = t('giList.filters.choose')

  const patch = (partial: Partial<GiListFilterState>) => {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-gradient-to-b from-muted/20 to-background shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/25"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Filter className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('giList.filters.title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('giList.filters.subtitle')}
            </p>
          </div>
          {activeCount > 0 ? (
            <Badge variant="default" className="normal-case tracking-normal">
              {t('giList.filters.activeCount', { count: activeCount })}
            </Badge>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-border/60 px-4 pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterField label={t('giList.filters.applicant')}>
              <Input
                value={value.applicant}
                onChange={(e) => patch({ applicant: e.target.value })}
                placeholder={t('giList.filters.applicantPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('giList.filters.name')}>
              <Input
                value={value.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={t('giList.filters.namePlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('giList.filters.incomingNo')}>
              <Input
                value={value.incoming}
                onChange={(e) => patch({ incoming: e.target.value })}
                placeholder={t('giList.filters.incomingPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>
            <FilterField label={t('giList.filters.regNo')}>
              <Input
                value={value.regNo}
                onChange={(e) => patch({ regNo: e.target.value })}
                placeholder={t('giList.filters.regNoPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>

            <FilterField label={t('giList.filters.territory')}>
              <OptionalSelect
                value={value.territory}
                placeholder={t('giList.filters.chooseTerritory')}
                onValueChange={(territory) => patch({ territory })}
              >
                {GI_FILTER_TERRITORY_OPTIONS.map((route) => {
                  const label = t(giTerritoryFilterLabelKey(route))
                  return (
                    <SelectItem key={route} value={route} label={label}>
                      {label}
                    </SelectItem>
                  )
                })}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('giList.filters.representative')}>
              <OptionalSelect
                value={value.representative}
                placeholder={t('giList.filters.chooseRepresentative')}
                onValueChange={(representative) => patch({ representative })}
              >
                {holdingGroups?.items.map((group) => (
                  <SelectItem key={group.id} value={group.id} label={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('giList.filters.applicationDate')}>
              <Input
                type="date"
                value={value.appFrom}
                onChange={(e) => patch({ appFrom: e.target.value, appTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('giList.filters.registrationDate')}>
              <Input
                type="date"
                value={value.regFrom}
                onChange={(e) => patch({ regFrom: e.target.value, regTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>

            <FilterField label={t('giList.filters.contact')}>
              <Input
                value={value.contact}
                onChange={(e) => patch({ contact: e.target.value })}
                placeholder={t('giList.filters.contactPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('giList.filters.status')}>
              <OptionalSelect
                value={value.stage}
                placeholder={chooseLabel}
                onValueChange={(stage) => patch({ stage })}
              >
                {GI_FILTER_STATUS_OPTIONS.map((stage) => {
                  const labelKey = giStatusFilterLabelKey(stage)
                  const label = t(labelKey)
                  return (
                    <SelectItem key={stage} value={stage} label={label}>
                      {label}
                    </SelectItem>
                  )
                })}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('giList.filters.certificate')}>
              <OptionalSelect
                value={value.certificate}
                placeholder={chooseLabel}
                onValueChange={(certificate) => patch({ certificate })}
              >
                {GI_FILTER_CERTIFICATE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    label={t(`giList.filters.certificateOptions.${option}`)}
                  >
                    {t(`giList.filters.certificateOptions.${option}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField
              label={t('giList.filters.country')}
              className="sm:col-span-2 lg:col-span-4"
            >
              <CountrySelect
                value={value.country}
                onValueChange={(country) => patch({ country })}
                placeholder={t('giList.filters.chooseCountry')}
              />
            </FilterField>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                onChange(EMPTY_GI_LIST_FILTERS)
                onClear()
              }}
            >
              <RotateCcw className="size-3.5" />
              {t('giList.filters.clear')}
            </Button>
            <Button type="button" size="sm" className="gap-1.5" onClick={onApply}>
              <Search className="size-3.5" />
              {t('giList.filters.apply')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
