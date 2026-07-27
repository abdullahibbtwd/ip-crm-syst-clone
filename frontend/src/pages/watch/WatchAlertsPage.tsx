import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Eye, XCircle } from 'lucide-react'
import { ReportPanel, ReportStatCard } from '@/components/reports/report-ui'
import {
  WATCH_ALERT_PAGE_SIZE,
  WatchAlertsTable,
} from '@/components/watch/WatchAlertsTable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { JURISDICTION_OPTIONS } from '@/features/deadlines/utils'
import { useWatchAlerts } from '@/features/watch/hooks/useWatch'
import type { WatchAlertStatus, WatchRegistrySource } from '@/features/watch/types'
import {
  registrySourceLabel,
  watchAlertStatusLabel,
} from '@/features/watch/utils'

const ALL = 'all'
const STATUSES: WatchAlertStatus[] = ['new', 'accepted', 'rejected']
const SOURCES: WatchRegistrySource[] = ['BPO', 'EUIPO', 'WIPO', 'EPO']

export function WatchAlertsPage() {
  const { t } = useTranslation('watch')
  const [status, setStatus] = useState<WatchAlertStatus | undefined>('new')
  const [jurisdiction, setJurisdiction] = useState<string | undefined>()
  const [source, setSource] = useState<WatchRegistrySource | undefined>()
  const [minSimilarity, setMinSimilarity] = useState<string>(ALL)
  const [sortBy, setSortBy] = useState<'detectedAt' | 'similarity'>('detectedAt')
  const [pageIndex, setPageIndex] = useState(0)
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])

  useEffect(() => {
    setPageIndex(0)
    setCursors([undefined])
  }, [status, jurisdiction, source, minSimilarity, sortBy])

  const filters = useMemo(
    () => ({
      status,
      jurisdiction,
      source,
      minSimilarity:
        minSimilarity === ALL ? undefined : Number(minSimilarity),
      sortBy,
      limit: WATCH_ALERT_PAGE_SIZE,
      cursor: cursors[pageIndex],
    }),
    [status, jurisdiction, source, minSimilarity, sortBy, pageIndex, cursors],
  )

  const { data, isLoading, isFetching } = useWatchAlerts(filters)
  const items = data?.items ?? []

  const handleNextPage = () => {
    if (!data?.nextCursor) return
    setCursors((prev) => {
      const next = [...prev]
      next[pageIndex + 1] = data.nextCursor ?? undefined
      return next
    })
    setPageIndex((p) => p + 1)
  }

  const handlePreviousPage = () => {
    if (pageIndex > 0) setPageIndex((p) => p - 1)
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-white to-brand-green/[0.04] p-6 shadow-[0_8px_40px_rgba(26,60,52,0.06)]">
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Eye className="size-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Trademark Watch</span>
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{t('page.title')}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{t('page.description')}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ReportStatCard
          label={t('stats.new')}
          value={data?.newCount ?? 0}
          icon={AlertTriangle}
          tone="alert"
          hint="Awaiting triage"
        />
        <ReportStatCard
          label={t('stats.accepted')}
          value={data?.acceptedCount ?? 0}
          icon={CheckCircle2}
          tone="green"
          hint="Matters created"
        />
        <ReportStatCard
          label={t('stats.rejected')}
          value={data?.rejectedCount ?? 0}
          icon={XCircle}
          tone="neutral"
          hint="False positives"
        />
      </div>

      <ReportPanel className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-brand-green">
            <Eye className="size-4" />
            <h2 className="font-medium">Worklist</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Filter by status, jurisdiction, or registry source.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select
            value={status ?? ALL}
            onValueChange={(v) => setStatus(v === ALL ? undefined : (v as WatchAlertStatus))}
          >
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder={t('filters.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('filters.all', { ns: 'common' })}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {watchAlertStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={jurisdiction ?? ALL}
            onValueChange={(v) => setJurisdiction(!v || v === ALL ? undefined : v)}
          >
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder={t('filters.jurisdiction')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('filters.all', { ns: 'common' })}</SelectItem>
              {JURISDICTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={source ?? ALL}
            onValueChange={(v) => setSource(v === ALL ? undefined : (v as WatchRegistrySource))}
          >
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder={t('filters.source')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('filters.all', { ns: 'common' })}</SelectItem>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {registrySourceLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={minSimilarity} onValueChange={(v) => setMinSimilarity(v ?? ALL)}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder={t('filters.minSimilarity')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('filters.anySimilarity')}</SelectItem>
              <SelectItem value="0.3">{t('filters.similarityAtLeast', { pct: 30 })}</SelectItem>
              <SelectItem value="0.5">{t('filters.similarityAtLeast', { pct: 50 })}</SelectItem>
              <SelectItem value="0.7">{t('filters.similarityAtLeast', { pct: 70 })}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy((v as 'detectedAt' | 'similarity') ?? 'detectedAt')}
          >
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder={t('filters.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="detectedAt">{t('filters.sortDetected')}</SelectItem>
              <SelectItem value="similarity">{t('filters.sortSimilarity')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ReportPanel>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <WatchAlertsTable
          items={items}
          isLoading={isLoading || (isFetching && !data)}
          pageIndex={pageIndex}
          hasNextPage={Boolean(data?.nextCursor)}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
        />
      </div>
    </div>
  )
}

