import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { apiClient } from '@/lib/api-client'

type TimeEntryRow = {
  id: string
  date: string
  hours: number
  description: string
  amount: number
  isBillable: boolean
  loggedBy: { fullName: string }
  matter: { id: string; title: string }
}

export function TimeEntriesPage() {
  const { t } = useTranslation(['billing', 'common'])
  const { data, isLoading, isError } = useQuery({
    queryKey: ['time-entries', 'firm'],
    queryFn: () => apiClient.get<TimeEntryRow[]>('/time-entries', { limit: 100 }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('timeEntries.title', { defaultValue: 'Time entries' })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('timeEntries.description', {
            defaultValue: 'Firm-wide time logged against matters.',
          })}
        </p>
      </div>

      <PermissionGate
        resource="billing"
        action="read"
        fallback={
          <p className="text-sm text-muted-foreground">
            {t('common:noPermission', { defaultValue: 'No permission.' })}
          </p>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load time entries.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Matter</TableHead>
                  <TableHead>Logged by</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No time entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.date.slice(0, 10)}</TableCell>
                      <TableCell>
                        <Link
                          to={`/matters/${row.matter.id}/billing`}
                          className="text-primary hover:underline"
                        >
                          {row.matter.title}
                        </Link>
                      </TableCell>
                      <TableCell>{row.loggedBy.fullName}</TableCell>
                      <TableCell>{row.hours}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.description}</TableCell>
                      <TableCell>{row.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </PermissionGate>
    </div>
  )
}
