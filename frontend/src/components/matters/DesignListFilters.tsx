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
  DESIGN_FILTER_CERTIFICATE_OPTIONS,
  DESIGN_FILTER_PROCEDURE_OPTIONS,
  DESIGN_FILTER_STATUS_OPTIONS,
  DESIGN_FILTER_TERRITORY_OPTIONS,
  designStatusFilterLabelKey,
} from '@/features/matters/design-list-filter-options'
import {
  countActiveDesignListFilters,
  EMPTY_DESIGN_LIST_FILTERS,
  type DesignListFilterState,
} from '@/features/matters/design-list-filters'
import { getCountryLabel } from '@/lib/countries'
import { cn } from '@/lib/utils'

type DesignListFiltersProps = {
  value: DesignListFilterState
  onChange: (next: DesignListFilterState) => void
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

export function DesignListFilters({
  value,
  onChange,
  onApply,
  onClear,
}: DesignListFiltersProps) {
  const { t } = useTranslation('matters')
  const [open, setOpen] = useState(true)
  const { data: holdingGroups } = useHoldingGroups({ limit: 200 })
  const activeCount = countActiveDesignListFilters(value)
  const chooseLabel = t('designList.filters.choose')

  const patch = (partial: Partial<DesignListFilterState>) => {
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
              {t('designList.filters.title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('designList.filters.subtitle')}
            </p>
          </div>
          {activeCount > 0 ? (
            <Badge variant="default" className="normal-case tracking-normal">
              {t('designList.filters.activeCount', { count: activeCount })}
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
            <FilterField label={t('designList.filters.applicant')}>
              <Input
                value={value.applicant}
                onChange={(e) => patch({ applicant: e.target.value })}
                placeholder={t('designList.filters.applicantPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('designList.filters.name')}>
              <Input
                value={value.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={t('designList.filters.namePlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('designList.filters.incomingNo')}>
              <Input
                value={value.incoming}
                onChange={(e) => patch({ incoming: e.target.value })}
                placeholder={t('designList.filters.incomingPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>
            <FilterField label={t('designList.filters.regNo')}>
              <Input
                value={value.regNo}
                onChange={(e) => patch({ regNo: e.target.value })}
                placeholder={t('designList.filters.regNoPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>

            <FilterField label={t('designList.filters.territory')}>
              <OptionalSelect
                value={value.territory}
                placeholder={t('designList.filters.chooseTerritory')}
                onValueChange={(territory) => patch({ territory })}
              >
                {DESIGN_FILTER_TERRITORY_OPTIONS.map((code) => (
                  <SelectItem key={code} value={code} label={getCountryLabel(code) ?? code}>
                    {getCountryLabel(code) ?? code}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('designList.filters.representative')}>
              <OptionalSelect
                value={value.representative}
                placeholder={t('designList.filters.chooseRepresentative')}
                onValueChange={(representative) => patch({ representative })}
              >
                {holdingGroups?.items.map((group) => (
                  <SelectItem key={group.id} value={group.id} label={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('designList.filters.applicationDate')}>
              <Input
                type="date"
                value={value.appFrom}
                onChange={(e) => patch({ appFrom: e.target.value, appTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('designList.filters.registrationDate')}>
              <Input
                type="date"
                value={value.regFrom}
                onChange={(e) => patch({ regFrom: e.target.value, regTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>

            <FilterField label={t('designList.filters.procedure')}>
              <OptionalSelect
                value={value.procedure}
                placeholder={t('createFile.chooseProcedure')}
                onValueChange={(procedure) => patch({ procedure })}
              >
                {DESIGN_FILTER_PROCEDURE_OPTIONS.map((route) => (
                  <SelectItem
                    key={route}
                    value={route}
                    label={t(`createFile.designFilingRoutes.${route}`)}
                  >
                    {t(`createFile.designFilingRoutes.${route}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('designList.filters.contact')}>
              <Input
                value={value.contact}
                onChange={(e) => patch({ contact: e.target.value })}
                placeholder={t('designList.filters.contactPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('designList.filters.status')}>
              <OptionalSelect
                value={value.stage}
                placeholder={chooseLabel}
                onValueChange={(stage) => patch({ stage })}
              >
                {DESIGN_FILTER_STATUS_OPTIONS.map((stage) => {
                  const labelKey = designStatusFilterLabelKey(stage)
                  const label = t(labelKey)
                  return (
                    <SelectItem key={stage} value={stage} label={label}>
                      {label}
                    </SelectItem>
                  )
                })}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('designList.filters.certificate')}>
              <OptionalSelect
                value={value.certificate}
                placeholder={chooseLabel}
                onValueChange={(certificate) => patch({ certificate })}
              >
                {DESIGN_FILTER_CERTIFICATE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    label={t(`designList.filters.certificateOptions.${option}`)}
                  >
                    {t(`designList.filters.certificateOptions.${option}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>

            <FilterField label={t('designList.filters.country')} className="sm:col-span-2 lg:col-span-4">
              <CountrySelect
                value={value.country}
                onValueChange={(code) => patch({ country: code })}
                placeholder={t('createFile.chooseCountry')}
                className="bg-background max-w-xs"
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
                onChange(EMPTY_DESIGN_LIST_FILTERS)
                onClear()
              }}
            >
              <RotateCcw className="size-3.5" />
              {t('designList.filters.clear')}
            </Button>
            <Button type="button" size="sm" className="gap-1.5" onClick={onApply}>
              <Search className="size-3.5" />
              {t('designList.filters.apply')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
