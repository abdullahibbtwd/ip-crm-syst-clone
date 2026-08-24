import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
  useCompleteRenewalPart,
  useInstructRenewal,
  useInstructRenewalPart,
  useIpRightRenewals,
  useMarkRenewalFiled,
  useMarkRenewalPartFiled,
  useRegisterIpRight,
  useSplitRenewalWindow,
} from '@/features/renewals/hooks/useRenewals'
import type { RenewalPart, RenewalWindow, SplitRenewalPartInput } from '@/features/renewals/types'
import { useCheckEpoStatus } from '@/features/registry/hooks/useRegistry'
import {
  RENEWAL_STATUS_LABELS,
  RENEWAL_URGENCY_ROW_CLASS,
  renewalUrgency,
} from '@/features/renewals/utils'
import type { IpRight, IpRightStatus, MatterType } from '@/features/matters/types'
import { formatDeadlineDate, jurisdictionLabel } from '@/features/deadlines/utils'
import { JurisdictionSelect } from '@/features/jurisdictions/components/JurisdictionSelect'
import { cn } from '@/lib/utils'
import {
  ipRightStatusLabel,
  matterTypeLabel,
  formatMatterDate,
} from '@/features/matters/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { TrademarkScopeCard } from '@/components/matters/TrademarkScopeCard'
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
  const { t } = useTranslation(['matters', 'common'])
  const { matterId, matter, openEditScope } = useOutletContext<MatterTabContext>()
  const canUpdate = usePermission('matter', 'update')
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
        message: getApiErrorMessage(err, t('matters:ipRights.epoCheckFailed')),
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
      setRegisterError(t('matters:ipRights.errors.registrationNumberRequired'))
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
      setRegisterError(getApiErrorMessage(err, t('matters:ipRights.errors.registerFailed')))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError(t('matters:ipRights.errors.titleRequired'))
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
      setError(getApiErrorMessage(err, t('matters:ipRights.errors.addFailed')))
    }
  }

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFileError(null)
    if (!fileTarget) return
    if (!fileDocumentVersionId) {
      setFileError(t('matters:ipRights.errors.documentVersionRequired'))
      return
    }
    if (!fileApplicationNumber.trim()) {
      setFileError(t('matters:ipRights.errors.applicationNumberRequired'))
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
      setFileError(getApiErrorMessage(err, t('matters:ipRights.errors.fileFailed')))
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('matters:ipRights.loading')}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">{t('matters:ipRights.titleRegister')}</h2>
          <p className="text-sm text-muted-foreground">{t('matters:ipRights.description')}</p>
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
            {t('matters:ipRights.add')}
          </Button>
        </PermissionGate>
      </div>

      {matter.matterType === 'trademark' ? (
        <TrademarkScopeCard
          matter={matter}
          canEdit={canUpdate && !matter.isArchived}
          onEdit={() => openEditScope?.()}
        />
      ) : null}

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
            <TableHead>{t('matters:ipRights.table.title')}</TableHead>
            <TableHead>{t('matters:ipRights.table.type')}</TableHead>
            <TableHead>{t('matters:ipRights.table.applicationNo')}</TableHead>
            <TableHead>{t('matters:ipRights.table.jurisdiction')}</TableHead>
            <TableHead>{t('matters:ipRights.table.status')}</TableHead>
            <TableHead>{t('matters:ipRights.filingDate')}</TableHead>
            <TableHead className="min-w-[220px]">{t('matters:ipRights.table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(ipRights ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t('matters:ipRights.empty')}
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
                    {matterTypeLabel(right.rightType)}
                  </TableCell>
                  <TableCell>{right.applicationNumber ?? right.registrationNumber ?? '-'}</TableCell>
                  <TableCell>{jurisdictionLabel(right.jurisdiction)}</TableCell>
                  <TableCell>{ipRightStatusLabel(right.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {right.filingDate ? formatMatterDate(right.filingDate) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {right.status === 'pending' ? (
                        <PermissionGate resource="matter" action="update">
                          <Button size="sm" variant="outline" onClick={() => openFileDrawer(right)}>
                            <FileText className="size-4" />
                            {t('matters:ipRights.file')}
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
                            {t('matters:ipRights.register')}
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
                                ? t('matters:ipRights.checkEpoTitle')
                                : t('matters:ipRights.checkEpoAddNumber')
                            }
                          >
                            {checkingRightId === right.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <RefreshCw className="size-4" />
                            )}
                            {t('matters:ipRights.checkEpo')}
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
                        rightType={right.rightType}
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

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={t('matters:ipRights.addTitle')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('matters:ipRights.titleField')}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('matters:ipRights.applicationNumber')}</label>
            <Input
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value)}
              placeholder="e.g. EP3000000"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('matters:ipRights.registrationNumber')}</label>
            <Input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. EUTM-2026-12345"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('matters:ipRights.filingOffice')}</label>
            <JurisdictionSelect
              value={jurisdiction}
              onValueChange={setJurisdiction}
            />
            <p className="text-xs text-muted-foreground">{t('matters:ipRights.jurisdictionHint')}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('matters:ipRights.table.status')}</label>
            <Select value={status} onValueChange={(v) => setStatus(v as IpRightStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ['pending', 'filed', 'registered', 'expired', 'cancelled'] as IpRightStatus[]
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ipRightStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">{t('matters:ipRights.filingDate')}</label>
              <Input type="date" value={filingDate} onChange={(e) => setFilingDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">{t('matters:ipRights.registrationDate')}</label>
              <Input
                type="date"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">{t('matters:ipRights.expiryDate')}</label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={createIpRight.isPending}>
              {createIpRight.isPending ? t('common:loading.saving') : t('matters:ipRights.addRight')}
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={fileDrawerOpen}
        onClose={() => setFileDrawerOpen(false)}
        title={t('matters:ipRights.fileApplication')}
      >
        {fileTarget ? (
          <form onSubmit={handleFileSubmit} className="space-y-5">
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{fileTarget.title}</p>
              <p className="text-muted-foreground">
                {matterTypeLabel(fileTarget.rightType)} ·{' '}
                {jurisdictionLabel(fileTarget.jurisdiction)}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('matters:ipRights.fileDrawer.filingPackage')}</label>
              <p className="text-xs text-muted-foreground">
                {t('matters:ipRights.fileDrawer.filingPackageHint')}
              </p>
              {documentVersionOptions.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  {t('matters:ipRights.fileDrawer.noDocuments')}
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
                      {selectedFilingDocument?.fileName ??
                        t('matters:ipRights.fileDrawer.selectDocument')}
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
              <label className="text-sm font-medium">{t('matters:ipRights.filingDate')}</label>
              <Input
                type="date"
                value={fileFilingDate}
                onChange={(e) => setFileFilingDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('matters:ipRights.applicationNumber')}</label>
              <Input
                value={fileApplicationNumber}
                onChange={(e) => setFileApplicationNumber(e.target.value)}
                placeholder={t('matters:ipRights.fileDrawer.applicationNumberPlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('matters:ipRights.filingOffice')}</label>
              <JurisdictionSelect
                value={fileJurisdiction}
                onValueChange={setFileJurisdiction}
              />
              <p className="text-xs text-muted-foreground">
                {t('matters:ipRights.fileDrawer.jurisdictionHint')}
              </p>
            </div>

            {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setFileDrawerOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={fileIpRight.isPending || documentVersionOptions.length === 0}
              >
                {fileIpRight.isPending
                  ? t('matters:ipRights.filing')
                  : t('matters:ipRights.confirmFiling')}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>

      <Drawer
        open={registerDrawerOpen}
        onClose={() => setRegisterDrawerOpen(false)}
        title={t('matters:ipRights.registerTitle')}
      >
        {registerTarget ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{registerTarget.title}</p>
              <p className="text-muted-foreground">{t('matters:ipRights.registerDrawerHint')}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('matters:ipRights.registrationNumber')}</label>
              <Input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('matters:ipRights.registrationDate')}</label>
              <Input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('matters:ipRights.expiryDateOptional')}</label>
              <Input type="date" value={regExpiry} onChange={(e) => setRegExpiry(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t('matters:ipRights.expiryDateHint')}</p>
            </div>
            {registerError ? <p className="text-sm text-destructive">{registerError}</p> : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setRegisterDrawerOpen(false)}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={registerIpRight.isPending}>
                {registerIpRight.isPending
                  ? t('matters:ipRights.registering')
                  : t('matters:ipRights.confirmRegistration')}
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>
    </div>
  )
}

function canSplitWindow(w: RenewalWindow) {
  if (w.status !== 'upcoming') return false
  const parts = w.parts ?? []
  return parts.length === 0 || parts.every((p) => p.status === 'upcoming')
}

function SplitRenewalDrawer({
  open,
  onClose,
  window: renewalWindow,
}: {
  open: boolean
  onClose: () => void
  window: RenewalWindow | null
}) {
  const { t } = useTranslation(['matters', 'common'])
  const split = useSplitRenewalWindow()
  const [rows, setRows] = useState<Array<{ jurisdiction: string; niceClasses: string; notes: string }>>([
    { jurisdiction: '', niceClasses: '', notes: '' },
    { jurisdiction: '', niceClasses: '', notes: '' },
  ])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !renewalWindow) return
    const existing = renewalWindow.parts ?? []
    if (existing.length > 0) {
      setRows(
        existing.map((p) => ({
          jurisdiction: p.jurisdiction,
          niceClasses: p.niceClasses.join(', '),
          notes: p.notes ?? '',
        })),
      )
    } else {
      setRows([
        { jurisdiction: renewalWindow.jurisdiction, niceClasses: '', notes: '' },
        { jurisdiction: '', niceClasses: '', notes: '' },
      ])
    }
    setError(null)
  }, [open, renewalWindow])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!renewalWindow) return
    setError(null)
    const parts: SplitRenewalPartInput[] = []
    for (const row of rows) {
      const jurisdiction = row.jurisdiction.trim().toUpperCase()
      if (!jurisdiction) continue
      const niceClasses = row.niceClasses
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isInteger(n) && n > 0)
      parts.push({
        jurisdiction,
        niceClasses: niceClasses.length ? niceClasses : undefined,
        notes: row.notes.trim() || undefined,
      })
    }
    if (parts.length < 1) {
      setError(t('matters:ipRights.errors.splitJurisdictionRequired'))
      return
    }
    try {
      await split.mutateAsync({ windowId: renewalWindow.id, data: { parts } })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('matters:ipRights.errors.splitFailed')))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('matters:ipRights.splitRenewalTitle')} className="max-w-lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('matters:ipRights.splitRenewalDescription')}</p>
        {rows.map((row, index) => (
          <div key={index} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('matters:ipRights.splitPart', { n: index + 1 })}</p>
              {rows.length > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  {t('common:actions.remove')}
                </Button>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{t('matters:ipRights.splitJurisdiction')}</label>
              <Input
                value={row.jurisdiction}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) =>
                      i === index ? { ...r, jurisdiction: e.target.value } : r,
                    ),
                  )
                }
                placeholder="EU"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{t('matters:ipRights.splitNiceClasses')}</label>
              <Input
                value={row.niceClasses}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) =>
                      i === index ? { ...r, niceClasses: e.target.value } : r,
                    ),
                  )
                }
                placeholder="9, 42"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{t('matters:ipRights.splitNotes')}</label>
              <Input
                value={row.notes}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) => (i === index ? { ...r, notes: e.target.value } : r)),
                  )
                }
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRows((prev) => [...prev, { jurisdiction: '', niceClasses: '', notes: '' }])
          }
        >
          {t('matters:ipRights.splitAddPart')}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" disabled={split.isPending}>
            {split.isPending ? t('common:loading.saving') : t('matters:ipRights.splitSaveParts')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

function RenewalPartsTable({
  parts,
  onInstruct,
  onFile,
  onComplete,
}: {
  parts: RenewalPart[]
  onInstruct: (partId: string, decision: 'proceed' | 'abandon') => void
  onFile: (partId: string) => void
  onComplete: (partId: string) => void
}) {
  const { t } = useTranslation(['matters', 'common'])
  return (
    <div className="mt-2 rounded-md border bg-background/60 p-2">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t('matters:ipRights.partialRenewals')}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('matters:ipRights.table.jurisdiction')}</TableHead>
            <TableHead>{t('matters:ipRights.table.niceClasses')}</TableHead>
            <TableHead>{t('matters:ipRights.table.status')}</TableHead>
            <TableHead className="min-w-[180px]">{t('matters:ipRights.table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parts.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.jurisdiction}</TableCell>
              <TableCell>
                {p.niceClasses.length ? p.niceClasses.join(', ') : '—'}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{RENEWAL_STATUS_LABELS[p.status]}</Badge>
              </TableCell>
              <TableCell>
                <PermissionGate resource="renewal" action="update">
                  <div className="flex flex-wrap gap-1">
                    {p.status === 'upcoming' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onInstruct(p.id, 'proceed')}
                        >
                          {t('matters:ipRights.proceed')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onInstruct(p.id, 'abandon')}
                        >
                          {t('matters:ipRights.abandon')}
                        </Button>
                      </>
                    ) : null}
                    {p.status === 'instructed' ? (
                      <Button size="sm" variant="outline" onClick={() => onFile(p.id)}>
                        {t('matters:ipRights.markFiled')}
                      </Button>
                    ) : null}
                    {p.status === 'instructed' || p.status === 'filed' ? (
                      <Button size="sm" onClick={() => onComplete(p.id)}>
                        {t('matters:ipRights.complete')}
                      </Button>
                    ) : null}
                  </div>
                </PermissionGate>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function IpRightRenewalsPanel({
  matterId,
  ipRightId,
  rightType,
  onInstruct,
  onFile,
  onComplete,
}: {
  matterId: string
  ipRightId: string
  rightType: MatterType
  onInstruct: (id: string, decision: 'proceed' | 'abandon') => void
  onFile: (id: string) => void
  onComplete: (id: string) => void
}) {
  const { t } = useTranslation(['matters', 'common'])
  const { data: renewals, isLoading } = useIpRightRenewals(matterId, ipRightId)
  const instructPart = useInstructRenewalPart()
  const markPartFiled = useMarkRenewalPartFiled()
  const completePart = useCompleteRenewalPart()
  const [splitTarget, setSplitTarget] = useState<RenewalWindow | null>(null)
  const isAnnuity = rightType === 'patent' || rightType === 'utility_model'
  const scheduleTitle = isAnnuity
    ? t('matters:ipRights.annuitySchedule')
    : t('matters:ipRights.renewalSchedule')

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('matters:ipRights.loadingRenewals')}</p>
  }

  if (!renewals?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {isAnnuity ? t('matters:ipRights.noAnnuityWindows') : t('matters:ipRights.noRenewalWindows')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{scheduleTitle}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {isAnnuity ? t('matters:ipRights.table.yearCycle') : t('matters:ipRights.table.cycle')}
            </TableHead>
            <TableHead>{t('matters:ipRights.table.dueDate')}</TableHead>
            <TableHead>{t('matters:ipRights.table.status')}</TableHead>
            <TableHead className="min-w-[200px]">{t('matters:ipRights.table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renewals.map((w) => {
            const urgency = renewalUrgency(w.dueDate, w.status)
            const parts = w.parts ?? []
            const hasParts = parts.length > 0
            return (
              <Fragment key={w.id}>
                <TableRow className={RENEWAL_URGENCY_ROW_CLASS[urgency]}>
                  <TableCell className="font-medium">
                    {isAnnuity
                      ? t('matters:ipRights.yearLabel', { n: w.cycleNumber })
                      : t('matters:ipRights.cycleLabel', { n: w.cycleNumber })}
                    {hasParts ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t('matters:ipRights.partsCount', { count: parts.length })}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatDeadlineDate(w.dueDate)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{RENEWAL_STATUS_LABELS[w.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate resource="renewal" action="update">
                      <div className="flex flex-wrap gap-1">
                        {canSplitWindow(w) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSplitTarget(w)}
                          >
                            {hasParts ? t('matters:ipRights.editSplit') : t('matters:ipRights.splitRenewal')}
                          </Button>
                        ) : null}
                        {!hasParts && w.status === 'upcoming' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onInstruct(w.id, 'proceed')}
                            >
                              {t('matters:ipRights.proceed')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onInstruct(w.id, 'abandon')}
                            >
                              {t('matters:ipRights.abandon')}
                            </Button>
                          </>
                        ) : null}
                        {!hasParts && w.status === 'instructed' ? (
                          <Button size="sm" variant="outline" onClick={() => onFile(w.id)}>
                            {t('matters:ipRights.markFiled')}
                          </Button>
                        ) : null}
                        {!hasParts &&
                        (w.status === 'instructed' || w.status === 'filed') ? (
                          <Button size="sm" onClick={() => onComplete(w.id)}>
                            {t('matters:ipRights.complete')}
                          </Button>
                        ) : null}
                      </div>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
                {hasParts ? (
                  <TableRow>
                    <TableCell colSpan={4} className="bg-muted/10 p-3">
                      <RenewalPartsTable
                        parts={parts}
                        onInstruct={(partId, decision) =>
                          instructPart.mutate({ partId, data: { decision } })
                        }
                        onFile={(partId) => markPartFiled.mutate(partId)}
                        onComplete={(partId) =>
                          completePart.mutate({ partId, data: {} })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
      <SplitRenewalDrawer
        open={Boolean(splitTarget)}
        onClose={() => setSplitTarget(null)}
        window={splitTarget}
      />
    </div>
  )
}
