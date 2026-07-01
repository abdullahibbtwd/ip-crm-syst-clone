import { useOutletContext } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  JURISDICTION_STATUS_LABELS,
  MATTER_ATTRIBUTE_FIELDS,
  MATTER_TYPE_LABELS,
} from '@/features/matters/utils'
import { getCountryLabel } from '@/lib/countries'
import type { MatterTabContext } from '../MatterLayout'

export function MatterOverviewTab() {
  const { matter } = useOutletContext<MatterTabContext>()
  const attrs = matter.attributes?.attributes ?? {}
  const fieldConfigs = MATTER_ATTRIBUTE_FIELDS[matter.matterType] ?? []

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matter details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Type</span>
            <span>{MATTER_TYPE_LABELS[matter.matterType]}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <span className="capitalize">{matter.status.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Lead attorney</span>
            <span>{matter.assignedTo?.fullName ?? '-'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Opened by</span>
            <span>{matter.filedBy?.fullName ?? '-'}</span>
          </div>
          {matter.description ? (
            <div className="space-y-1 border-t pt-3">
              <span className="text-muted-foreground">Description</span>
              <p className="whitespace-pre-wrap">{matter.description}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jurisdictions</CardTitle>
        </CardHeader>
        <CardContent>
          {matter.jurisdictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jurisdictions recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Local ref.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matter.jurisdictions.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>
                      {j.countryCode} - {getCountryLabel(j.countryCode)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.localRefNumber ?? '-'}
                    </TableCell>
                    <TableCell>{JURISDICTION_STATUS_LABELS[j.status]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {fieldConfigs.length > 0 ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Type-specific attributes</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              {fieldConfigs.map((field) => {
                const raw = attrs[field.key]
                const display = Array.isArray(raw)
                  ? raw.join(', ')
                  : raw != null && raw !== ''
                    ? String(raw)
                    : '-'
                return (
                  <div key={field.key}>
                    <dt className="text-sm text-muted-foreground">{field.label}</dt>
                    <dd className="text-sm">{display}</dd>
                  </div>
                )
              })}
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
