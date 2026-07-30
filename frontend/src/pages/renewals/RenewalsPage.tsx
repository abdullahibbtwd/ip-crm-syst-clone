import { useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDeadlineAssignees } from '@/features/deadlines/hooks/useDeadlines'
import { formatDeadlineDate } from '@/features/deadlines/utils'
import { JurisdictionSelect } from '@/features/jurisdictions/components/JurisdictionSelect'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import { useRenewals } from '@/features/renewals/hooks/useRenewals'
import type { RenewalStatus } from '@/features/renewals/types'
import {
  renewalStatusLabel,
  RENEWAL_URGENCY_ROW_CLASS,
  renewalUrgency,
} from '@/features/renewals/utils'
import { clientDisplayName } from '@/features/crm/utils'
import { hasAnyRole, type SystemRole } from '@/lib/rbac'
import { cn } from '@/lib/utils'

const ALL = 'all'
const STATUSES: RenewalStatus[] = ['upcoming', 'instructed', 'filed', 'completed', 'lapsed']

type LayoutContext = {
  activeRole: SystemRole
}

export function RenewalsPage() {
  const { t } = useTranslation('renewals')
  const { activeRole } = useOutletContext<LayoutContext>()
  const [searchParams] = useSearchParams()
  const myOnly = searchParams.get('scope') === 'my' || activeRole === 'ip_attorney'

  const [status, setStatus] = useState<RenewalStatus | undefined>()
  const [jurisdiction, setJurisdiction] = useState<string | undefined>()
  const [assignedToId, setAssignedToId] = useState<string | undefined>()

  const scope = myOnly && !hasAnyRole([activeRole], ['managing_partner', 'coordinator', 'docketing_admin'])
    ? 'my'
    : 'firm'

  const { data, isLoading } = useRenewals(
    {
      status,
      jurisdiction,
      assignedToId,
      limit: 50,
    },
    scope,
  )

  const { data: assignees } = useDeadlineAssignees()
  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('page.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {scope === 'my' ? t('page.descriptionMy') : t('page.descriptionFirm')}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={status ?? ALL}
          onValueChange={(v) => {
            if (!v || v === ALL) setStatus(undefined)
            else setStatus(v as RenewalStatus)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('page.filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('page.filters.allStatuses')}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {renewalStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <JurisdictionSelect
          className="w-[200px]"
          value={jurisdiction ?? ALL}
          onValueChange={(v) => {
            if (!v || v === ALL) setJurisdiction(undefined)
            else setJurisdiction(v)
          }}
          allowAll
          allLabel={t('page.filters.allJurisdictions')}
          placeholder={t('page.filters.jurisdiction')}
        />

        {scope === 'firm' ? (
          <Select
            value={assignedToId ?? ALL}
            onValueChange={(v) => {
              if (!v || v === ALL) setAssignedToId(undefined)
              else setAssignedToId(v)
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('page.filters.assignee')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('page.filters.allAssignees')}</SelectItem>
              {(assignees ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('page.table.ipRight')}</TableHead>
            <TableHead>{t('page.table.matter')}</TableHead>
            <TableHead>{t('page.table.client')}</TableHead>
            <TableHead>{t('page.table.cycle')}</TableHead>
            <TableHead>{t('page.table.due')}</TableHead>
            <TableHead>{t('page.table.status')}</TableHead>
            <TableHead>{t('page.table.assignee')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t('page.loading')}
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t('page.empty')}
              </TableCell>
            </TableRow>
          ) : (
            items.map((row) => {
              const urgency = renewalUrgency(row.dueDate, row.status)
              return (
                <TableRow
                  key={row.id}
                  className={cn(RENEWAL_URGENCY_ROW_CLASS[urgency])}
                >
                  <TableCell className="font-medium">
                    <Link
                      to={`/matters/${row.matterId}/ip-rights`}
                      className="hover:underline"
                    >
                      {row.ipRight.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link to={`/matters/${row.matterId}`} className="hover:underline">
                      {row.matter.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {MATTER_TYPE_LABELS[row.matter.matterType]}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {clientDisplayName(row.matter.client)}
                  </TableCell>
                  <TableCell>{row.cycleNumber}</TableCell>
                  <TableCell>{formatDeadlineDate(row.dueDate)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{renewalStatusLabel(row.status)}</Badge>
                    {(row.parts?.length ?? 0) > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.parts!.length} parts
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.matter.assignedTo?.fullName ?? '-'}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
