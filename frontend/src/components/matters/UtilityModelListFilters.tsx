import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Filter, RotateCcw, Search } from 'lucide-react'
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
  UTILITY_MODEL_FILTER_CERTIFICATE_OPTIONS,
  UTILITY_MODEL_FILTER_STATUS_OPTIONS,
  UTILITY_MODEL_FILTER_TERRITORY_OPTIONS,
  utilityModelStatusFilterLabelKey,
} from '@/features/matters/utility-model-list-filter-options'
import {
  countActiveUtilityModelListFilters,
  EMPTY_UTILITY_MODEL_LIST_FILTERS,
  type UtilityModelListFilterState,
} from '@/features/matters/utility-model-list-filters'
import { getCountryLabel } from '@/lib/countries'
import { cn } from '@/lib/utils'

type UtilityModelListFiltersProps = {
  value: UtilityModelListFilterState
  onChange: (next: UtilityModelListFilterState) => void
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
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function UtilityModelListFilters({
  value,
  onChange,
  onApply,
  onClear,
}: UtilityModelListFiltersProps) {
  const { t } = useTranslation('matters')
  const [open, setOpen] = useState(true)
  const { data: holdingGroups } = useHoldingGroups({ limit: 200 })
  const activeCount = countActiveUtilityModelListFilters(value)
  const chooseLabel = t('utilityModelList.filters.choose')

  const patch = (partial: Partial<UtilityModelListFilterState>) => {
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
              {t('utilityModelList.filters.title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('utilityModelList.filters.subtitle')}
            </p>
          </div>
          {activeCount > 0 ? (
            <Badge variant="default" className="normal-case tracking-normal">
              {t('utilityModelList.filters.activeCount', { count: activeCount })}
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
            <FilterField label={t('utilityModelList.filters.applicant')}>
              <Input
                value={value.applicant}
                onChange={(e) => patch({ applicant: e.target.value })}
                placeholder={t('utilityModelList.filters.applicantPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('utilityModelList.filters.name')}>
              <Input
                value={value.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={t('utilityModelList.filters.namePlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('utilityModelList.filters.incomingNo')}>
              <Input
                value={value.incoming}
                onChange={(e) => patch({ incoming: e.target.value })}
                placeholder={t('utilityModelList.filters.incomingPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>
            <FilterField label={t('utilityModelList.filters.regNo')}>
              <Input
                value={value.regNo}
                onChange={(e) => patch({ regNo: e.target.value })}
                placeholder={t('utilityModelList.filters.regNoPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>

            <FilterField label={t('utilityModelList.filters.territory')}>
              <OptionalSelect
                value={value.territory}
                placeholder={t('utilityModelList.filters.chooseTerritory')}
                onValueChange={(territory) => patch({ territory })}
              >
                {UTILITY_MODEL_FILTER_TERRITORY_OPTIONS.map((code) => (
                  <SelectItem key={code} value={code} label={getCountryLabel(code) ?? code}>
                    {getCountryLabel(code) ?? code}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('utilityModelList.filters.representative')}>
              <OptionalSelect
                value={value.representative}
                placeholder={t('utilityModelList.filters.chooseRepresentative')}
                onValueChange={(representative) => patch({ representative })}
              >
                {holdingGroups?.items.map((group) => (
                  <SelectItem key={group.id} value={group.id} label={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('utilityModelList.filters.applicationDate')}>
              <Input
                type="date"
                value={value.appFrom}
                onChange={(e) => patch({ appFrom: e.target.value, appTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('utilityModelList.filters.registrationDate')}>
              <Input
                type="date"
                value={value.regFrom}
                onChange={(e) => patch({ regFrom: e.target.value, regTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>

            <FilterField label={t('utilityModelList.filters.contact')}>
              <Input
                value={value.contact}
                onChange={(e) => patch({ contact: e.target.value })}
                placeholder={t('utilityModelList.filters.contactPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('utilityModelList.filters.status')}>
              <OptionalSelect
                value={value.stage}
                placeholder={chooseLabel}
                onValueChange={(stage) => patch({ stage })}
              >
                {UTILITY_MODEL_FILTER_STATUS_OPTIONS.map((stage) => {
                  const labelKey = utilityModelStatusFilterLabelKey(stage)
                  const label = t(labelKey)
                  return (
                    <SelectItem key={stage} value={stage} label={label}>
                      {label}
                    </SelectItem>
                  )
                })}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('utilityModelList.filters.certificate')}>
              <OptionalSelect
                value={value.certificate}
                placeholder={chooseLabel}
                onValueChange={(certificate) => patch({ certificate })}
              >
                {UTILITY_MODEL_FILTER_CERTIFICATE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    label={t(`utilityModelList.filters.certificateOptions.${option}`)}
                  >
                    {t(`utilityModelList.filters.certificateOptions.${option}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                onChange(EMPTY_UTILITY_MODEL_LIST_FILTERS)
                onClear()
              }}
            >
              <RotateCcw className="size-3.5" />
              {t('utilityModelList.filters.clear')}
            </Button>
            <Button type="button" size="sm" className="gap-1.5" onClick={onApply}>
              <Search className="size-3.5" />
              {t('utilityModelList.filters.apply')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
