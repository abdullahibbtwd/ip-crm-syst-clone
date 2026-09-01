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
  PATENT_FILTER_ANNUAL_FEES_OPTIONS,
  PATENT_FILTER_CERTIFICATE_OPTIONS,
  PATENT_FILTER_STATUS_OPTIONS,
  PATENT_FILTER_TERRITORY_OPTIONS,
  patentStatusFilterLabelKey,
} from '@/features/matters/patent-list-filter-options'
import {
  countActivePatentListFilters,
  EMPTY_PATENT_LIST_FILTERS,
  type PatentListFilterState,
} from '@/features/matters/patent-list-filters'
import { cn } from '@/lib/utils'

type PatentListFiltersProps = {
  value: PatentListFilterState
  onChange: (next: PatentListFilterState) => void
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

export function PatentListFilters({
  value,
  onChange,
  onApply,
  onClear,
}: PatentListFiltersProps) {
  const { t } = useTranslation('matters')
  const [open, setOpen] = useState(true)
  const { data: holdingGroups } = useHoldingGroups({ limit: 200 })
  const activeCount = countActivePatentListFilters(value)
  const chooseLabel = t('patentList.filters.choose')

  const patch = (partial: Partial<PatentListFilterState>) => {
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
              {t('patentList.filters.title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('patentList.filters.subtitle')}
            </p>
          </div>
          {activeCount > 0 ? (
            <Badge variant="default" className="normal-case tracking-normal">
              {t('patentList.filters.activeCount', { count: activeCount })}
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
            <FilterField label={t('patentList.filters.applicant')}>
              <Input
                value={value.applicant}
                onChange={(e) => patch({ applicant: e.target.value })}
                placeholder={t('patentList.filters.applicantPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('patentList.filters.patentName')}>
              <Input
                value={value.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={t('patentList.filters.patentNamePlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('patentList.filters.incomingNo')}>
              <Input
                value={value.incoming}
                onChange={(e) => patch({ incoming: e.target.value })}
                placeholder={t('patentList.filters.incomingPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>
            <FilterField label={t('patentList.filters.regNo')}>
              <Input
                value={value.regNo}
                onChange={(e) => patch({ regNo: e.target.value })}
                placeholder={t('patentList.filters.regNoPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>

            <FilterField label={t('patentList.filters.territory')}>
              <OptionalSelect
                value={value.territory}
                placeholder={t('patentList.filters.chooseTerritory')}
                onValueChange={(territory) => patch({ territory })}
              >
                {PATENT_FILTER_TERRITORY_OPTIONS.map((route) => (
                  <SelectItem
                    key={route}
                    value={route}
                    label={t(`createFile.patentFilingRoutes.${route}`)}
                  >
                    {t(`createFile.patentFilingRoutes.${route}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('patentList.filters.representative')}>
              <OptionalSelect
                value={value.representative}
                placeholder={t('patentList.filters.chooseRepresentative')}
                onValueChange={(representative) => patch({ representative })}
              >
                {holdingGroups?.items.map((group) => (
                  <SelectItem key={group.id} value={group.id} label={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('patentList.filters.applicationDateFrom')}>
              <Input
                type="date"
                value={value.appFrom}
                onChange={(e) => patch({ appFrom: e.target.value })}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('patentList.filters.applicationDateTo')}>
              <Input
                type="date"
                value={value.appTo}
                onChange={(e) => patch({ appTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>

            <FilterField label={t('patentList.filters.registrationDateFrom')}>
              <Input
                type="date"
                value={value.regFrom}
                onChange={(e) => patch({ regFrom: e.target.value })}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('patentList.filters.registrationDateTo')}>
              <Input
                type="date"
                value={value.regTo}
                onChange={(e) => patch({ regTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('patentList.filters.contact')}>
              <Input
                value={value.contact}
                onChange={(e) => patch({ contact: e.target.value })}
                placeholder={t('patentList.filters.contactPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('patentList.filters.patentStatus')}>
              <OptionalSelect
                value={value.stage}
                placeholder={chooseLabel}
                onValueChange={(stage) => patch({ stage })}
              >
                {PATENT_FILTER_STATUS_OPTIONS.map((stage) => {
                  const labelKey = patentStatusFilterLabelKey(stage)
                  const label = t(labelKey)
                  return (
                    <SelectItem key={stage} value={stage} label={label}>
                      {label}
                    </SelectItem>
                  )
                })}
              </OptionalSelect>
            </FilterField>

            <FilterField label={t('patentList.filters.certificate')}>
              <OptionalSelect
                value={value.certificate}
                placeholder={chooseLabel}
                onValueChange={(certificate) => patch({ certificate })}
              >
                {PATENT_FILTER_CERTIFICATE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    label={t(`patentList.filters.certificateOptions.${option}`)}
                  >
                    {t(`patentList.filters.certificateOptions.${option}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>

            <FilterField label={t('patentList.filters.country')}>
              <CountrySelect
                value={value.country}
                onValueChange={(code) => patch({ country: code })}
                placeholder={t('patentList.filters.chooseCountry')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('patentList.filters.annualFees')}>
              <OptionalSelect
                value={value.annualFees}
                placeholder={chooseLabel}
                onValueChange={(annualFees) => patch({ annualFees })}
              >
                {PATENT_FILTER_ANNUAL_FEES_OPTIONS.map((option) => (
                  <SelectItem
                    key={option}
                    value={option}
                    label={t(`patentList.filters.annualFeesOptions.${option}`)}
                  >
                    {t(`patentList.filters.annualFeesOptions.${option}`)}
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
                onChange(EMPTY_PATENT_LIST_FILTERS)
                onClear()
              }}
            >
              <RotateCcw className="size-3.5" />
              {t('patentList.filters.clear')}
            </Button>
            <Button type="button" size="sm" className="gap-1.5" onClick={onApply}>
              <Search className="size-3.5" />
              {t('patentList.filters.apply')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
