import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useClientAddressInsights } from '@/features/crm/hooks/useClients'
import type { AddressComparison, AddressMatchLevel } from '@/features/crm/types'
import { getCountryLabel } from '@/lib/countries'
import { cn } from '@/lib/utils'

function matchLabelKey(match: AddressMatchLevel): string {
  switch (match) {
    case 'exact':
      return 'addressInsights.matchExact'
    case 'partial':
      return 'addressInsights.matchPartial'
    case 'mismatch':
      return 'addressInsights.matchMismatch'
    default:
      return 'addressInsights.matchMissing'
  }
}

function MatchBadge({ comparison }: { comparison: AddressComparison }) {
  const { t } = useTranslation('crm')
  const variant =
    comparison.match === 'exact'
      ? 'secondary'
      : comparison.match === 'partial'
        ? 'outline'
        : comparison.match === 'mismatch'
          ? 'destructive'
          : 'outline'

  return (
    <Badge variant={variant} className="gap-1">
      {comparison.match === 'mismatch' && <AlertTriangle className="size-3" />}
      {comparison.match === 'exact' && <CheckCircle2 className="size-3" />}
      {t(matchLabelKey(comparison.match))}
    </Badge>
  )
}

function formatAddressBlock(
  parts: {
    addressLine1?: string | null
    addressLine2?: string | null
    city?: string | null
    region?: string | null
    postalCode?: string | null
    country?: string | null
    formattedAddress?: string | null
  } | null | undefined,
): string {
  if (!parts) return '—'
  if (parts.formattedAddress?.trim()) return parts.formattedAddress
  const lines = [
    parts.addressLine1,
    parts.addressLine2,
    [parts.postalCode, parts.city].filter(Boolean).join(' '),
    parts.region,
    parts.country ? getCountryLabel(parts.country) : null,
  ].filter(Boolean)
  return lines.join('\n') || '—'
}

export function ClientAddressInsightsPanel({ clientId }: { clientId: string }) {
  const { t } = useTranslation('crm')
  const { data, isLoading } = useClientAddressInsights(clientId)

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{t('addressInsights.loading')}</p>
    )
  }

  if (!data) return null

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{t('addressInsights.title')}</h3>
        {data.hasAddressMismatch ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" />
            {t('addressInsights.mismatchCount', { count: data.mismatchCount })}
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="size-3" />
            {t('addressInsights.noMismatch')}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t('addressInsights.registeredVsCorrespondence')}</p>
            <MatchBadge comparison={data.registeredVsCorrespondence} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('offices.addresses.registeredLegal')}
              </p>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">
                {data.registeredLegalFormatted || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('offices.addresses.correspondence')}
              </p>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">
                {data.correspondenceFormatted || '—'}
              </p>
            </div>
          </div>
        </div>

        {data.ipAssetComparisons.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{t('addressInsights.registryVsCrm')}</p>
            {data.ipAssetComparisons.map((row) => (
              <div key={row.ipRightId} className="rounded-md border bg-muted/20 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to={`/matters/${row.matterId}/ip-rights`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.title}
                  </Link>
                  <MatchBadge comparison={row.comparisonToRegisteredLegal} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.jurisdiction}
                  {row.applicationNumber ? ` · ${row.applicationNumber}` : ''}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('addressInsights.crmRegistered')}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-muted-foreground">
                      {data.registeredLegalFormatted || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('addressInsights.registrySource')}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-muted-foreground">
                      {formatAddressBlock(row.registryApplicant?.address)}
                    </p>
                    {row.registryApplicant?.name && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.registryApplicant.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className={cn('text-xs text-muted-foreground')}>
        {t('addressInsights.hint')}
      </p>
    </section>
  )
}
