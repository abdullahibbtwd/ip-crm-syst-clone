import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ClientSummary } from '@/features/crm/types'
import { getCountryLabel } from '@/lib/countries'
import { cn } from '@/lib/utils'

type ClientSidebarProps = {
  summary: ClientSummary | undefined
  isLoading?: boolean
}

export function ClientSidebar({ summary, isLoading }: ClientSidebarProps) {
  if (isLoading) {
    return (
      <Card className="shadow-none">
        <CardContent className="p-4 text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    )
  }

  if (!summary) return null

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-serif text-lg leading-tight">
          {summary.displayName}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{summary.internalCode}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {summary.status}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {summary.type}
          </Badge>
        </div>

        {summary.country && (
          <p className="text-muted-foreground">
            <span className="text-foreground">Country:</span> {getCountryLabel(summary.country)}
          </p>
        )}

        {summary.primaryContact && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Primary contact
            </p>
            <p className="mt-0.5">
              {summary.primaryContact.firstName} {summary.primaryContact.lastName}
            </p>
            {summary.primaryContact.email && (
              <p className="text-xs text-muted-foreground">{summary.primaryContact.email}</p>
            )}
          </div>
        )}

        {summary.primaryOffice && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Primary office
            </p>
            <p className="mt-0.5">{summary.primaryOffice.label}</p>
            {summary.primaryOffice.city && (
              <p className="text-xs text-muted-foreground">{summary.primaryOffice.city}</p>
            )}
          </div>
        )}

        <Link
          to={`/clients/${summary.id}/overview`}
          className={cn('text-xs text-primary hover:underline')}
        >
          View full profile
        </Link>
      </CardContent>
    </Card>
  )
}
