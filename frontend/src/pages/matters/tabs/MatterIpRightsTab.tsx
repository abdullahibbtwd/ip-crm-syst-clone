import { Fragment, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Stamp,
} from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Drawer } from '@/components/crm/Drawer'
import { useMatterDocuments } from '@/features/documents/hooks/useDocuments'
import { DOCUMENT_CATEGORY_LABELS } from '@/features/documents/utils'
import {
  useCreateIpRight,
  useFileIpRight,
  useMatterIpRights,
} from '@/features/matters/hooks/useMatters'
import {
  useCompleteRenewal,
  useInstructRenewal,
  useIpRightRenewals,
  useMarkRenewalFiled,
  useRegisterIpRight,
} from '@/features/renewals/hooks/useRenewals'
import { useCheckEpoStatus } from '@/features/registry/hooks/useRegistry'
import {
  RENEWAL_STATUS_LABELS,
  RENEWAL_URGENCY_ROW_CLASS,
  renewalUrgency,
} from '@/features/renewals/utils'
import type { IpRight, IpRightStatus } from '@/features/matters/types'
import { formatDeadlineDate, JURISDICTION_OPTIONS, jurisdictionLabel } from '@/features/deadlines/utils'
import { cn } from '@/lib/utils'
import {
  IP_RIGHT_STATUS_LABELS,
  MATTER_TYPE_LABELS,
  formatMatterDate,
} from '@/features/matters/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import type { MatterTabContext } from '../MatterLayout'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function isEpoJurisdiction(code: string | null | undefined) {
  const normalized = (code ?? '').trim().toUpperCase()
  return normalized === 'EP' || normalized === 'EPO'
}

/** Prefer application number; fall back to registration number for manually added filed rights. */
function epoLookupNumber(right: {
  applicationNumber?: string | null
  registrationNumber?: string | null
}) {
  return right.applicationNumber?.trim() || right.registrationNumber?.trim() || null
}

function canCheckEpoStatus(right: {
  jurisdiction: string
  applicationNumber?: string | null
  registrationNumber?: string | null
  status: string
}) {
  return (
    isEpoJurisdiction(right.jurisdiction) &&
    (right.status === 'filed' || right.status === 'registered')
  )
}

export function MatterIpRightsTab() {
  const { matterId, matter } = useOutletContext<MatterTabContext>()
  const { data: ipRights, isLoading } = useMatterIpRights(matterId)
  const { data: documents } = useMatterDocuments(matterId)
  const createIpRight = useCreateIpRight(matterId)
  const fileIpRight = useFileIpRight(matterId)
  const registerIpRight = useRegisterIpRight(matterId)
  const checkEpo = useCheckEpoStatus(matterId)
  const instructRenewal = useInstructRenewal()
  const markRenewalFiled = useMarkRenewalFiled()
  const completeRenewal = useCompleteRenewal()
  const [epoBanner, setEpoBanner] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const [checkingRightId, setCheckingRightId] = useState<string | null>(null)

  const handleCheckEpo = async (right: IpRight) => {
    setEpoBanner(null)
    setCheckingRightId(right.id)
    try {
      const result = await checkEpo.mutateAsync(right.id)
      setEpoBanner({
        tone: result.success ? 'success' : 'error',
        message: result.message,
      })
    } catch (err) {
      setEpoBanner({
        tone: 'error',
        message: getApiErrorMessage(err, 'EPO status check failed'),
      })
    } finally {
      setCheckingRightId(null)
    }
  }

  const documentVersionOptions = useMemo(
    () =>
      (documents ?? [])
        .flatMap((doc) =>
          doc.latestVersion
            ? [
                {
                  id: doc.latestVersion.id,
                  displayName: doc.displayName,
                  category: DOCUMENT_CATEGORY_LABELS[doc.category],
                  version: doc.latestVersion.version,
                  fileName: doc.latestVersion.fileName,
                  isApplication: doc.category === 'application',
                },
              ]
            : [],
        )
        .sort((a, b) => Number(b.isApplication) - Number(a.isApplication)),
    [documents],
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [applicationNumber, setApplicationNumber] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [jurisdiction, setJurisdiction] = useState(matter.jurisdictions[0]?.countryCode ?? 'BG')
  const [status, setStatus] = useState<IpRightStatus>('pending')
  const [filingDate, setFilingDate] = useState('')
  const [registrationDate, setRegistrationDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [fileDrawerOpen, setFileDrawerOpen] = useState(false)
  const [fileTarget, setFileTarget] = useState<IpRight | null>(null)
  const [fileDocumentVersionId, setFileDocumentVersionId] = useState('')
  const [fileFilingDate, setFileFilingDate] = useState(todayIsoDate)
  const [fileApplicationNumber, setFileApplicationNumber] = useState('')
  const [fileJurisdiction, setFileJurisdiction] = useState('BG')
  const [fileError, setFileError] = useState<string | null>(null)

  const [registerDrawerOpen, setRegisterDrawerOpen] = useState(false)
  const [registerTarget, setRegisterTarget] = useState<IpRight | null>(null)
  const [regNumber, setRegNumber] = useState('')
  const [regDate, setRegDate] = useState(todayIsoDate())
  const [regExpiry, setRegExpiry] = useState('')
  const [registerError, setRegisterError] = useState<string | null>(null)

  const [expandedRightId, setExpandedRightId] = useState<string | null>(null)

  const selectedFilingDocument = useMemo(
    () => documentVersionOptions.find((opt) => opt.id === fileDocumentVersionId),
    [documentVersionOptions, fileDocumentVersionId],
  )

  const resetForm = () => {
    setTitle('')
    setApplicationNumber('')
    setRegistrationNumber('')
    setJurisdiction(matter.jurisdictions[0]?.countryCode ?? 'BG')
    setStatus('pending')
    setFilingDate('')
    setRegistrationDate('')
    setExpiryDate('')
    setError(null)
  }

  const openFileDrawer = (right: IpRight) => {
    setFileTarget(right)
    setFileDocumentVersionId('')
    setFileFilingDate(todayIsoDate())
    setFileApplicationNumber('')
    setFileJurisdiction(right.jurisdiction)
    setFileError(null)
    setFileDrawerOpen(true)
  }

  const resetFileForm = () => {
    setFileTarget(null)
    setFileDocumentVersionId('')
    setFileFilingDate(todayIsoDate())
    setFileApplicationNumber('')
    setFileJurisdiction('BG')
    setFileError(null)
  }

  const openRegisterDrawer = (right: IpRight) => {
    setRegisterTarget(right)
    setRegNumber(right.registrationNumber ?? '')
    setRegDate(todayIsoDate())
    setRegExpiry('')
    setRegisterError(null)
    setRegisterDrawerOpen(true)
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerTarget) return
    setRegisterError(null)
    if (!regNumber.trim()) {
      setRegisterError('Enter the registration number')
      return
    }
    try {
      await registerIpRight.mutateAsync({
        ipRightId: registerTarget.id,
        data: {
          registrationNumber: regNumber.trim(),
          registrationDate: regDate,
          expiryDate: regExpiry || undefined,
        },
      })
      setRegisterDrawerOpen(false)
      setRegisterTarget(null)
      setExpandedRightId(registerTarget.id)
    } catch (err) {
      setRegisterError(getApiErrorMessage(err, 'Failed to register IP right'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Enter a title for the IP right')
      return
    }
    try {
      await createIpRight.mutateAsync({
        rightType: matter.matterType,
        title: title.trim(),
        applicationNumber: applicationNumber.trim() || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
        jurisdiction,
        status,
        filingDate: filingDate || undefined,
        registrationDate: registrationDate || undefined,
        expiryDate: expiryDate || undefined,
      })
      resetForm()
      setDrawerOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to add IP right'))
    }
  }

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFileError(null)
    if (!fileTarget) return
    if (!fileDocumentVersionId) {
      setFileError('Select the filing package document version')
      return
    }
    if (!fileApplicationNumber.trim()) {
      setFileError('Enter the official application number')
      return
    }
    try {
      await fileIpRight.mutateAsync({
        ipRightId: fileTarget.id,
        data: {
          documentVersionId: fileDocumentVersionId,
          filingDate: fileFilingDate,
          applicationNumber: fileApplicationNumber.trim(),
          jurisdiction: fileJurisdiction,
        },
      })
      resetFileForm()
      setFileDrawerOpen(false)
    } catch (err) {
      setFileError(getApiErrorMessage(err, 'Failed to file application'))
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading IP rights…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">IP rights register</h2>
          <p className="text-sm text-muted-foreground">
            File draft rights once the client confirms and the filing package is ready.
          </p>
        </div>
        <PermissionGate resource="matter" action="update">
          <Button
            size="sm"
            onClick={() => {
              resetForm()
              setDrawerOpen(true)
            }}
          >
            <Plus className="size-4" />
            Add IP right
          </Button>
        </PermissionGate>
      </div>

      {epoBanner && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
            epoBanner.tone === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-900'
              : 'border-destructive/30 bg-destructive/5 text-destructive',
          )}
        >
          {epoBanner.tone === 'success' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <p>{epoBanner.message}</p>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Application no.</TableHead>
            <TableHead>Jurisdiction</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Filing date</TableHead>
            <TableHead className="min-w-[220px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(ipRights ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No IP rights yet. A draft is created automatically when an intake is converted;
                add more rights manually after prosecution.
              </TableCell>
            </TableRow>
          ) : (
            ipRights?.map((right) => (
              <Fragment key={right.id}>
                <TableRow>
                  <TableCell>
                    <button
                      type="button"
                      className="mr-1 inline-flex text-muted-foreground"
                      onClick={() =>
                        setExpandedRightId((id) => (id === right.id ? null : right.id))
                      }
                    >
                      {expandedRightId === right.id ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                    <span className="font-medium">{right.title}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {MATTER_TYPE_LABELS[right.rightType]}
                  </TableCell>
                  <TableCell>{right.applicationNumber ?? right.registrationNumber ?? '-'}</TableCell>
                  <TableCell>{jurisdictionLabel(right.jurisdiction)}</TableCell>
                  <TableCell>{IP_RIGHT_STATUS_LABELS[right.status]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {right.filingDate ? formatMatterDate(right.filingDate) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {right.status === 'pending' ? (
                        <PermissionGate resource="matter" action="update">
                          <Button size="sm" variant="outline" onClick={() => openFileDrawer(right)}>
                            <FileText className="size-4" />
                            File
                          </Button>
                        </PermissionGate>
                      ) : null}
                      {right.status === 'filed' ? (
                        <PermissionGate resource="renewal" action="update">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRegisterDrawer(right)}
                          >
                            <Stamp className="size-4" />
                            Register
                          </Button>
                        </PermissionGate>
                      ) : null}
                      {canCheckEpoStatus(right) ? (
                        <PermissionGate resource="matter" action="update">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              checkingRightId === right.id || !epoLookupNumber(right)
                            }
                            onClick={() => void handleCheckEpo(right)}
                            title={
                              epoLookupNumber(right)
                                ? 'Check EPO legal status (OPS)'
                                : 'Add an application number before checking EPO'
                            }
                          >
                            {checkingRightId === right.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RefreshCw className="size-4" />
                            )}
                            Check EPO
                          </Button>
                        </PermissionGate>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRightId === right.id ? (
                  <TableRow key={`${right.id}-renewals`}>
                    <TableCell colSpan={7} className="bg-muted/20 p-4">
                      <IpRightRenewalsPanel
                        matterId={matterId}
                        ipRightId={right.id}
                        onInstruct={(id, decision) =>
                          instructRenewal.mutate({ id, data: { decision } })
                        }
                        onFile={(id) => markRenewalFiled.mutate(id)}
                        onComplete={(id) => completeRenewal.mutate({ id, data: {} })}
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add IP right">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Application number</label>
            <Input
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value)}
              placeholder="e.g. EP3000000"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Registration number</label>
            <Input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. EUTM-2026-12345"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Filing office / jurisdiction</label>
            <Select value={jurisdiction} onValueChange={(v) => v && setJurisdiction(v)}>
              <SelectTrigger>
                <SelectValue>
                  {(value) => jurisdictionLabel(String(value ?? ''))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {JURISDICTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Use EPO (EP) for European patents, EUIPO (EU) for EU trademarks/designs, BPO (BG)
              for Bulgaria, WIPO (WO) for PCT.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as IpRightStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(IP_RIGHT_STATUS_LABELS) as IpRightStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {IP_RIGHT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Filing date</label>
              <Input type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Registration date</label>
              <Input
                type="date"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Expiry date</label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createIpRight.isPending}>
              {createIpRight.isPending ? 'Saving…' : 'Add right'}
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={fileDrawerOpen}
        onClose={() => setFileDrawerOpen(false)}
        title="File application"
      >
        {fileTarget ? (
          <form onSubmit={handleFileSubmit} className="space-y-5">
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{fileTarget.title}</p>
              <p className="text-muted-foreground">
                {MATTER_TYPE_LABELS[fileTarget.rightType]} ·{' '}
                {jurisdictionLabel(fileTarget.jurisdiction)}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Filing package</label>
              <p className="text-xs text-muted-foreground">
                Select the document version uploaded for this filing (typically under Application).
              </p>
              {documentVersionOptions.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  No documents on this matter yet. Upload the filing PDF on the Documents tab first.
                </p>
              ) : (
                <Select
                  value={fileDocumentVersionId}
                  onValueChange={(v) => v && setFileDocumentVersionId(v)}
                >
                  <SelectTrigger>
                    <span
                      className={
                        selectedFilingDocument
                          ? 'truncate'
                          : 'truncate text-muted-foreground/70'
                      }
                    >
                      {selectedFilingDocument?.fileName ?? 'Select document version…'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {documentVersionOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="py-2.5">
                        <div className="flex flex-col gap-0.5 text-left">
                          <span className="font-medium leading-tight">{opt.fileName}</span>
                          <span className="text-xs text-muted-foreground">
                            {opt.displayName} · {opt.category} · v{opt.version}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Filing date</label>
              <Input
                type="date"
                value={fileFilingDate}
                onChange={(e) => setFileFilingDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Application number</label>
              <Input
                value={fileApplicationNumber}
                onChange={(e) => setFileApplicationNumber(e.target.value)}
                placeholder="Official number from BPO / EUIPO / EPO"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Filing office / jurisdiction</label>
              <Select value={fileJurisdiction} onValueChange={(v) => v && setFileJurisdiction(v)}>
                <SelectTrigger>
                  <SelectValue>
                    {(value) => jurisdictionLabel(String(value ?? ''))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {JURISDICTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose EPO (EP) to enable prosecution status checks against OPS.
              </p>
            </div>

            {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setFileDrawerOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={fileIpRight.isPending || documentVersionOptions.length === 0}
              >
                {fileIpRight.isPending ? 'Filing…' : 'Confirm filing'}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>

      <Drawer
        open={registerDrawerOpen}
        onClose={() => setRegisterDrawerOpen(false)}
        title="Register IP right"
      >
        {registerTarget ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{registerTarget.title}</p>
              <p className="text-muted-foreground">
                Opens cycle 1 renewal window and generates renewal deadlines.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Registration number</label>
              <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Registration date</label>
              <Input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Expiry date (optional)</label>
              <Input type="date" value={regExpiry} onChange={(e) => setRegExpiry(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Leave blank to compute from jurisdiction renewal cycle.
              </p>
            </div>
            {registerError ? <p className="text-sm text-destructive">{registerError}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setRegisterDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={registerIpRight.isPending}>
                {registerIpRight.isPending ? 'Registering…' : 'Confirm registration'}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </div>
  )
}

function IpRightRenewalsPanel({
  matterId,
  ipRightId,
  onInstruct,
  onFile,
  onComplete,
}: {
  matterId: string
  ipRightId: string
  onInstruct: (id: string, decision: 'proceed' | 'abandon') => void
  onFile: (id: string) => void
  onComplete: (id: string) => void
}) {
  const { data: renewals, isLoading } = useIpRightRenewals(matterId, ipRightId)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading renewals…</p>
  }

  if (!renewals?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No renewal windows yet. Register the IP right to open cycle 1.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Renewal windows</p>
      <div className="space-y-2">
        {renewals.map((w) => {
          const urgency = renewalUrgency(w.dueDate, w.status)
          return (
            <div
              key={w.id}
              className={cn(
                'flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2',
                RENEWAL_URGENCY_ROW_CLASS[urgency],
              )}
            >
              <div>
                <p className="text-sm font-medium">
                  Cycle {w.cycleNumber} · due {formatDeadlineDate(w.dueDate)}
                </p>
                <Badge variant="outline" className="mt-1">
                  {RENEWAL_STATUS_LABELS[w.status]}
                </Badge>
              </div>
              <PermissionGate resource="renewal" action="update">
                <div className="flex flex-wrap gap-1">
                  {w.status === 'upcoming' ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onInstruct(w.id, 'proceed')}
                      >
                        Record proceed
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onInstruct(w.id, 'abandon')}
                      >
                        Abandon
                      </Button>
                    </>
                  ) : null}
                  {w.status === 'instructed' ? (
                    <Button size="sm" variant="outline" onClick={() => onFile(w.id)}>
                      Mark filed
                    </Button>
                  ) : null}
                  {w.status === 'instructed' || w.status === 'filed' ? (
                    <Button size="sm" onClick={() => onComplete(w.id)}>
                      Complete
                    </Button>
                  ) : null}
                </div>
              </PermissionGate>
            </div>
          )
        })}
      </div>
    </div>
  )
}
