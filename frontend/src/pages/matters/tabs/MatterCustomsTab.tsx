import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useAddCustodyLog,
  useCreateCustomsApplication,
  useCreateCustomsSeizure,
  useCustomsApplications,
  useCustomsSeizure,
  useCustomsSeizures,
  useUpdateCustomsSeizure,
} from '@/features/customs/hooks/useCustoms'
import {
  APPLICATION_STATUS_LABELS,
  CUSTODY_ACTION_LABELS,
  SEIZURE_STATUS_LABELS,
  type CustodyAction,
  type CustomsSeizureStatus,
} from '@/features/customs/types'
import { mattersApi } from '@/features/matters/api'
import { matterKeys } from '@/features/matters/queryKeys'
import { getApiErrorMessage } from '@/lib/api-client'
import type { MatterTabContext } from '../MatterLayout'

const CUSTODY_ACTIONS = Object.keys(CUSTODY_ACTION_LABELS) as CustodyAction[]
const SEIZURE_STATUSES = Object.keys(SEIZURE_STATUS_LABELS) as CustomsSeizureStatus[]

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB')
}

function CreateSeizureDrawer({
  open,
  onClose,
  matterId,
}: {
  open: boolean
  onClose: () => void
  matterId: string
}) {
  const { t } = useTranslation(['matters', 'common'])
  const create = useCreateCustomsSeizure(matterId)
  const [seizureDate, setSeizureDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [customsOffice, setCustomsOffice] = useState('')
  const [goodsDescription, setGoodsDescription] = useState('')
  const [consignmentReference, setConsignmentReference] = useState('')
  const [quantity, setQuantity] = useState('')
  const [portOfEntry, setPortOfEntry] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!customsOffice.trim() || !goodsDescription.trim()) {
      setError(t('matters:customs.errors.officeAndGoodsRequired'))
      return
    }
    try {
      await create.mutateAsync({
        seizureDate,
        customsOffice: customsOffice.trim(),
        goodsDescription: goodsDescription.trim(),
        consignmentReference: consignmentReference.trim() || undefined,
        quantity: quantity.trim() || undefined,
        portOfEntry: portOfEntry.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('matters:customs.errors.createSeizureFailed')))
    }
  }

  if (!open) return null

  return (
    <Drawer open={open} onClose={onClose} title={t('matters:customs.seizures.createTitle')} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('matters:customs.seizures.deadlineHint')}</p>
        <div className="space-y-1.5">
          <Label htmlFor="seizure-date">{t('matters:customs.seizures.seizureDate')}</Label>
          <Input
            id="seizure-date"
            type="date"
            value={seizureDate}
            onChange={(e) => setSeizureDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="office">{t('matters:customs.seizures.office')}</Label>
          <Input
            id="office"
            value={customsOffice}
            onChange={(e) => setCustomsOffice(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goods">{t('matters:customs.seizures.goodsDescription')}</Label>
          <Textarea
            id="goods"
            rows={3}
            value={goodsDescription}
            onChange={(e) => setGoodsDescription(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="consignment">{t('matters:customs.seizures.consignmentRef')}</Label>
            <Input
              id="consignment"
              value={consignmentReference}
              onChange={(e) => setConsignmentReference(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qty">{t('matters:customs.seizures.quantity')}</Label>
            <Input id="qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="port">{t('matters:customs.seizures.portOfEntry')}</Label>
          <Input
            id="port"
            value={portOfEntry}
            onChange={(e) => setPortOfEntry(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? t('common:loading.saving') : t('matters:customs.seizures.create')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

function SeizureDetailDrawer({
  open,
  onClose,
  matterId,
  seizureId,
}: {
  open: boolean
  onClose: () => void
  matterId: string
  seizureId: string | null
}) {
  const { t } = useTranslation(['matters', 'common'])
  const { data: detail, isLoading } = useCustomsSeizure(seizureId)
  const update = useUpdateCustomsSeizure(matterId)
  const addCustody = useAddCustodyLog(matterId)

  const [status, setStatus] = useState<CustomsSeizureStatus>('active')
  const [linkedSearch, setLinkedSearch] = useState('')
  const [debouncedLinked, setDebouncedLinked] = useState('')
  const [linkedMatterId, setLinkedMatterId] = useState<string | null>(null)
  const [custodyAction, setCustodyAction] = useState<CustodyAction>('received')
  const [custodyAt, setCustodyAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [custodyNotes, setCustodyNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedLinked(linkedSearch.trim()), 300)
    return () => window.clearTimeout(t)
  }, [linkedSearch])

  useEffect(() => {
    if (!detail) return
    setStatus(detail.status)
    setLinkedMatterId(detail.linkedMatterId)
    setLinkedSearch(detail.linkedMatter?.title ?? '')
    setError(null)
  }, [detail])

  const { data: mattersData } = useQuery({
    queryKey: matterKeys.list({ search: debouncedLinked, limit: 8 }),
    queryFn: () => mattersApi.list({ search: debouncedLinked, limit: 8 }),
    enabled: open && debouncedLinked.length >= 2,
  })

  const saveMeta = async () => {
    if (!seizureId) return
    setError(null)
    try {
      await update.mutateAsync({
        id: seizureId,
        data: { status, linkedMatterId },
      })
    } catch (err) {
      setError(getApiErrorMessage(err, t('matters:customs.detail.updateFailed')))
    }
  }

  const submitCustody = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!seizureId) return
    setError(null)
    try {
      await addCustody.mutateAsync({
        seizureId,
        data: {
          action: custodyAction,
          occurredAt: new Date(custodyAt).toISOString(),
          notes: custodyNotes.trim() || undefined,
        },
      })
      setCustodyNotes('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('matters:customs.errors.addCustodyFailed')))
    }
  }

  if (!open) return null

  return (
    <Drawer open={open} onClose={onClose} title={t('matters:customs.detail.title')} className="max-w-xl">
      {isLoading || !detail ? (
        <p className="text-sm text-muted-foreground">{t('matters:customs.detail.loading')}</p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">{detail.customsOffice}</p>
            <p className="text-sm text-muted-foreground">{detail.goodsDescription}</p>
            <p className="text-xs text-muted-foreground">
              {t('matters:customs.detail.seizedOn', { date: formatDate(detail.seizureDate) })}
              {detail.portOfEntry ? ` · ${detail.portOfEntry}` : ''}
            </p>
          </div>

          <PermissionGate resource="customs" action="update">
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1.5">
                <Label>{t('matters:customs.seizures.status')}</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus((v as CustomsSeizureStatus) ?? 'active')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEIZURE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SEIZURE_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('matters:customs.detail.linkedMatter')}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-2.5 left-2 size-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    value={linkedSearch}
                    onChange={(e) => {
                      setLinkedSearch(e.target.value)
                      setLinkedMatterId(null)
                    }}
                    placeholder={t('matters:customs.detail.searchMatters')}
                  />
                </div>
                {debouncedLinked.length >= 2 && mattersData?.items?.length ? (
                  <div className="max-h-36 overflow-y-auto rounded-md border">
                    {mattersData.items
                      .filter((m) => m.id !== matterId)
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            setLinkedMatterId(m.id)
                            setLinkedSearch(m.title)
                          }}
                        >
                          {m.title}
                        </button>
                      ))}
                  </div>
                ) : null}
                {linkedMatterId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLinkedMatterId(null)
                      setLinkedSearch('')
                    }}
                  >
                    {t('matters:customs.detail.clearLink')}
                  </Button>
                ) : null}
              </div>
              <Button type="button" size="sm" onClick={saveMeta} disabled={update.isPending}>
                {t('matters:customs.detail.saveChanges')}
              </Button>
            </div>
          </PermissionGate>

          <div>
            <h3 className="mb-2 text-sm font-medium">{t('matters:customs.custody.timeline')}</h3>
            {detail.custodyLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('matters:customs.custody.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {detail.custodyLogs.map((log) => (
                  <li key={log.id} className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{CUSTODY_ACTION_LABELS[log.action]}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.occurredAt).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{log.actorUser.fullName}</p>
                    {log.notes ? <p className="mt-1 text-muted-foreground">{log.notes}</p> : null}
                  </li>
                ))}
              </ul>
            )}

            <PermissionGate resource="customs" action="update">
              <form onSubmit={submitCustody} className="mt-3 space-y-2 rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground">{t('matters:customs.custody.addEntry')}</p>
                <Select
                  value={custodyAction}
                  onValueChange={(v) => setCustodyAction((v as CustodyAction) ?? 'received')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTODY_ACTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {CUSTODY_ACTION_LABELS[a]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="datetime-local"
                  value={custodyAt}
                  onChange={(e) => setCustodyAt(e.target.value)}
                />
                <Input
                  placeholder={t('matters:customs.custody.notesPlaceholder')}
                  value={custodyNotes}
                  onChange={(e) => setCustodyNotes(e.target.value)}
                />
                <Button type="submit" size="sm" disabled={addCustody.isPending}>
                  {t('matters:customs.custody.append')}
                </Button>
              </form>
            </PermissionGate>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      )}
    </Drawer>
  )
}

function CreateApplicationForm({ matterId }: { matterId: string }) {
  const { t } = useTranslation(['matters', 'common'])
  const create = useCreateCustomsApplication(matterId)
  const { data: seizures } = useCustomsSeizures(matterId)
  const [authority, setAuthority] = useState('')
  const [applicationNumber, setApplicationNumber] = useState('')
  const [seizureId, setSeizureId] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!authority.trim()) {
      setError(t('matters:customs.afa.authorityRequired'))
      return
    }
    try {
      await create.mutateAsync({
        authority: authority.trim(),
        applicationNumber: applicationNumber.trim() || undefined,
        seizureId: seizureId || undefined,
        validUntil: validUntil || undefined,
      })
      setAuthority('')
      setApplicationNumber('')
      setSeizureId('')
      setValidUntil('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('matters:customs.afa.createFailed')))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>{t('matters:customs.afa.authority')}</Label>
        <Input value={authority} onChange={(e) => setAuthority(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>{t('matters:customs.afa.number')}</Label>
        <Input
          value={applicationNumber}
          onChange={(e) => setApplicationNumber(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('matters:customs.afa.validUntil')}</Label>
        <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>{t('matters:customs.afa.linkedSeizure')}</Label>
        <Select value={seizureId || undefined} onValueChange={(v) => setSeizureId(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder={t('matters:customs.afa.none')} />
          </SelectTrigger>
          <SelectContent>
            {(seizures ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {formatDate(s.seizureDate)} · {s.customsOffice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={create.isPending}>
          {t('matters:customs.afa.add')}
        </Button>
      </div>
    </form>
  )
}

export function MatterCustomsTab() {
  const { t } = useTranslation(['matters', 'common'])
  const { matterId, matter } = useOutletContext<MatterTabContext>()
  const { data: seizures, isLoading, isError } = useCustomsSeizures(matterId)
  const { data: applications, isLoading: appsLoading } = useCustomsApplications(matterId)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const sortedSeizures = useMemo(
    () => [...(seizures ?? [])].sort((a, b) => b.seizureDate.localeCompare(a.seizureDate)),
    [seizures],
  )

  if (matter.matterType !== 'border_measures') {
    return (
      <p className="text-sm text-muted-foreground">{t('matters:customs.wrongMatterType')}</p>
    )
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium">{t('matters:customs.seizures.sectionTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('matters:customs.seizures.sectionDescription')}
            </p>
          </div>
          <PermissionGate resource="customs" action="create">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              {t('matters:customs.seizures.logSeizure')}
            </Button>
          </PermissionGate>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('matters:customs.seizures.loading')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('matters:customs.seizures.loadFailed')}</p>
        ) : sortedSeizures.length === 0 ? (
          <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {t('matters:customs.seizures.empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('matters:customs.columns.date')}</TableHead>
                <TableHead>{t('matters:customs.columns.office')}</TableHead>
                <TableHead>{t('matters:customs.columns.goods')}</TableHead>
                <TableHead>{t('matters:customs.columns.status')}</TableHead>
                <TableHead>{t('matters:customs.columns.custody')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSeizures.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.seizureDate)}</TableCell>
                  <TableCell className="font-medium">{row.customsOffice}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {row.goodsDescription}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="normal-case">
                      {SEIZURE_STATUS_LABELS[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.custodyCount ?? 0}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setDetailId(row.id)}>
                      {t('matters:customs.open')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">{t('matters:customs.afa.sectionTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('matters:customs.afa.sectionDescription')}
          </p>
        </div>

        {appsLoading ? (
          <p className="text-sm text-muted-foreground">{t('matters:customs.afa.loading')}</p>
        ) : !(applications?.length) ? (
          <p className="text-sm text-muted-foreground">{t('matters:customs.afa.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('matters:customs.columns.authority')}</TableHead>
                <TableHead>{t('matters:customs.columns.number')}</TableHead>
                <TableHead>{t('matters:customs.columns.validUntil')}</TableHead>
                <TableHead>{t('matters:customs.columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.authority}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {app.applicationNumber ?? '—'}
                  </TableCell>
                  <TableCell>{formatDate(app.validUntil)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="normal-case">
                      {APPLICATION_STATUS_LABELS[app.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <PermissionGate resource="customs" action="create">
          <CreateApplicationForm matterId={matterId} />
        </PermissionGate>
      </section>

      <CreateSeizureDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        matterId={matterId}
      />
      <SeizureDetailDrawer
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        matterId={matterId}
        seizureId={detailId}
      />
    </div>
  )
}
