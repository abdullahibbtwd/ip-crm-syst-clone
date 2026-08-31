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
import {
  MARK_KINDS,
  MARK_TYPES,
  NICE_CLASS_NUMBERS,
  TERRITORIES,
} from '@/features/create-file/trademark-subtypes'
import {
  countActiveTrademarkListFilters,
  EMPTY_TRADEMARK_LIST_FILTERS,
  type TrademarkListFilterState,
} from '@/features/matters/trademark-list-filters'
import { PROSECUTION_STAGES } from '@/features/matters/prosecution-stages'
import { cn } from '@/lib/utils'

type TrademarkListFiltersProps = {
  value: TrademarkListFilterState
  onChange: (next: TrademarkListFilterState) => void
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

export function TrademarkListFilters({
  value,
  onChange,
  onApply,
  onClear,
}: TrademarkListFiltersProps) {
  const { t } = useTranslation('matters')
  const [open, setOpen] = useState(true)
  const activeCount = countActiveTrademarkListFilters(value)
  const allLabel = t('trademarkList.filters.all')

  const patch = (partial: Partial<TrademarkListFilterState>) => {
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
              {t('trademarkList.filters.title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('trademarkList.filters.subtitle')}
            </p>
          </div>
          {activeCount > 0 ? (
            <Badge variant="default" className="normal-case tracking-normal">
              {t('trademarkList.filters.activeCount', { count: activeCount })}
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
            <FilterField label={t('trademarkList.filters.applicant')}>
              <Input
                value={value.applicant}
                onChange={(e) => patch({ applicant: e.target.value })}
                placeholder={t('trademarkList.filters.applicantPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('trademarkList.filters.markName')}>
              <Input
                value={value.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder={t('trademarkList.filters.markNamePlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('trademarkList.filters.incomingNo')}>
              <Input
                value={value.incoming}
                onChange={(e) => patch({ incoming: e.target.value })}
                placeholder={t('trademarkList.filters.incomingPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>
            <FilterField label={t('trademarkList.filters.regNo')}>
              <Input
                value={value.regNo}
                onChange={(e) => patch({ regNo: e.target.value })}
                placeholder={t('trademarkList.filters.regNoPlaceholder')}
                className="bg-background font-mono text-sm"
              />
            </FilterField>

            <FilterField label={t('trademarkList.filters.markType')}>
              <OptionalSelect
                value={value.markType}
                placeholder={allLabel}
                onValueChange={(markType) => patch({ markType })}
              >
                {MARK_TYPES.map((type) => (
                  <SelectItem key={type} value={type} label={t(`createFile.markTypes.${type}`)}>
                    {t(`createFile.markTypes.${type}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('trademarkList.filters.markKind')}>
              <OptionalSelect
                value={value.markKind}
                placeholder={allLabel}
                onValueChange={(markKind) => patch({ markKind })}
              >
                {MARK_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind} label={t(`createFile.markKinds.${kind}`)}>
                    {t(`createFile.markKinds.${kind}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('trademarkList.filters.territory')}>
              <OptionalSelect
                value={value.territory}
                placeholder={allLabel}
                onValueChange={(territory) => patch({ territory })}
              >
                {TERRITORIES.map((territory) => (
                  <SelectItem
                    key={territory}
                    value={territory}
                    label={t(`createFile.territories.${territory}`)}
                  >
                    {t(`createFile.territories.${territory}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('trademarkList.filters.representative')}>
              <Input
                value={value.representative}
                onChange={(e) => patch({ representative: e.target.value })}
                placeholder={t('trademarkList.filters.representativePlaceholder')}
                className="bg-background"
              />
            </FilterField>

            <FilterField label={t('trademarkList.filters.applicationDateFrom')}>
              <Input
                type="date"
                value={value.appFrom}
                onChange={(e) => patch({ appFrom: e.target.value })}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('trademarkList.filters.applicationDateTo')}>
              <Input
                type="date"
                value={value.appTo}
                onChange={(e) => patch({ appTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('trademarkList.filters.registrationDateFrom')}>
              <Input
                type="date"
                value={value.regFrom}
                onChange={(e) => patch({ regFrom: e.target.value })}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('trademarkList.filters.registrationDateTo')}>
              <Input
                type="date"
                value={value.regTo}
                onChange={(e) => patch({ regTo: e.target.value })}
                className="bg-background"
              />
            </FilterField>

            <FilterField label={t('trademarkList.filters.contact')}>
              <Input
                value={value.contact}
                onChange={(e) => patch({ contact: e.target.value })}
                placeholder={t('trademarkList.filters.contactPlaceholder')}
                className="bg-background"
              />
            </FilterField>
            <FilterField label={t('trademarkList.filters.markStatus')}>
              <OptionalSelect
                value={value.stage}
                placeholder={allLabel}
                onValueChange={(stage) => patch({ stage })}
              >
                {PROSECUTION_STAGES.map((stage) => (
                  <SelectItem
                    key={stage}
                    value={stage}
                    label={t(`prosecution.stages.${stage}`)}
                  >
                    {t(`prosecution.stages.${stage}`)}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('trademarkList.filters.niceClass')}>
              <OptionalSelect
                value={value.niceClass}
                placeholder={allLabel}
                onValueChange={(niceClass) => patch({ niceClass })}
              >
                {NICE_CLASS_NUMBERS.map((n) => (
                  <SelectItem
                    key={n}
                    value={String(n)}
                    label={t('trademarkList.filters.classOption', { number: n })}
                  >
                    {t('trademarkList.filters.classOption', { number: n })}
                  </SelectItem>
                ))}
              </OptionalSelect>
            </FilterField>
            <FilterField label={t('trademarkList.filters.country')}>
              <CountrySelect
                value={value.country}
                onValueChange={(code) => patch({ country: code })}
                placeholder={t('trademarkList.filters.chooseCountry')}
                className="bg-background"
              />
            </FilterField>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-border accent-primary"
                checked={value.certificate}
                onChange={(e) => patch({ certificate: e.target.checked })}
              />
              {t('trademarkList.filters.hasCertificate')}
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onChange(EMPTY_TRADEMARK_LIST_FILTERS)
                  onClear()
                }}
              >
                <RotateCcw className="size-3.5" />
                {t('trademarkList.filters.clear')}
              </Button>
              <Button type="button" size="sm" className="gap-1.5" onClick={onApply}>
                <Search className="size-3.5" />
                {t('trademarkList.filters.apply')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
