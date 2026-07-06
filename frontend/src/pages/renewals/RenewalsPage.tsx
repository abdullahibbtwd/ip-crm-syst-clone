import { useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
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
import { JURISDICTION_OPTIONS, formatDeadlineDate } from '@/features/deadlines/utils'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import { useRenewals } from '@/features/renewals/hooks/useRenewals'
import type { RenewalStatus } from '@/features/renewals/types'
import {
  RENEWAL_STATUS_LABELS,
  RENEWAL_URGENCY_ROW_CLASS,
  renewalUrgency,
} from '@/features/renewals/utils'
import { clientDisplayName } from '@/features/crm/utils'
import { hasAnyRole, type SystemRole } from '@/lib/rbac'
import { cn } from '@/lib/utils'

const ALL = 'all'
const STATUSES = Object.keys(RENEWAL_STATUS_LABELS) as RenewalStatus[]

type LayoutContext = {
  activeRole: SystemRole
}

export function RenewalsPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Renewals</h1>
        <p className="text-sm text-muted-foreground">
          {scope === 'my'
            ? 'Renewal windows on matters assigned to you.'
            : 'Firm-wide renewal worklist across all IP rights.'}
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
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {RENEWAL_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={jurisdiction ?? ALL}
          onValueChange={(v) => {
            if (!v || v === ALL) setJurisdiction(undefined)
            else setJurisdiction(v)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Jurisdiction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All jurisdictions</SelectItem>
            {JURISDICTION_OPTIONS.map((j) => (
              <SelectItem key={j.value} value={j.value}>
                {j.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {scope === 'firm' ? (
          <Select
            value={assignedToId ?? ALL}
            onValueChange={(v) => {
              if (!v || v === ALL) setAssignedToId(undefined)
              else setAssignedToId(v)
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All assignees</SelectItem>
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
            <TableHead>IP right</TableHead>
            <TableHead>Matter</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assignee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Loading renewals…
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No renewal windows match your filters.
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
                    <Badge variant="outline">{RENEWAL_STATUS_LABELS[row.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.matter.assignedTo?.fullName ?? '—'}
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
