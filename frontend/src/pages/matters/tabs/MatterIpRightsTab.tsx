import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
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
import type { IpRight, IpRightStatus } from '@/features/matters/types'
import {
  IP_RIGHT_STATUS_LABELS,
  MATTER_TYPE_LABELS,
  formatMatterDate,
} from '@/features/matters/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { getCountryOptions } from '@/lib/countries'
import type { MatterTabContext } from '../MatterLayout'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function MatterIpRightsTab() {
  const { matterId, matter } = useOutletContext<MatterTabContext>()
  const { data: ipRights, isLoading } = useMatterIpRights(matterId)
  const { data: documents } = useMatterDocuments(matterId)
  const createIpRight = useCreateIpRight(matterId)
  const fileIpRight = useFileIpRight(matterId)
  const countryOptions = getCountryOptions()

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

  const selectedFilingDocument = useMemo(
    () => documentVersionOptions.find((opt) => opt.id === fileDocumentVersionId),
    [documentVersionOptions, fileDocumentVersionId],
  )

  const resetForm = () => {
    setTitle('')
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Application no.</TableHead>
            <TableHead>Jurisdiction</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Filing date</TableHead>
            <TableHead className="w-[140px]">Actions</TableHead>
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
              <TableRow key={right.id}>
                <TableCell className="font-medium">{right.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {MATTER_TYPE_LABELS[right.rightType]}
                </TableCell>
                <TableCell>{right.applicationNumber ?? right.registrationNumber ?? '-'}</TableCell>
                <TableCell>{right.jurisdiction}</TableCell>
                <TableCell>{IP_RIGHT_STATUS_LABELS[right.status]}</TableCell>
                <TableCell className="text-muted-foreground">
                  {right.filingDate ? formatMatterDate(right.filingDate) : '-'}
                </TableCell>
                <TableCell>
                  {right.status === 'pending' ? (
                    <PermissionGate resource="matter" action="update">
                      <Button size="sm" variant="outline" onClick={() => openFileDrawer(right)}>
                        <FileText className="size-4" />
                        File application
                      </Button>
                    </PermissionGate>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
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
            <label className="text-sm text-muted-foreground">Registration number</label>
            <Input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. EUTM-2026-12345"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Jurisdiction</label>
            <Select value={jurisdiction} onValueChange={(v) => v && setJurisdiction(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                {MATTER_TYPE_LABELS[fileTarget.rightType]} · {fileTarget.jurisdiction}
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
              <label className="text-sm font-medium">Jurisdiction</label>
              <Select value={fileJurisdiction} onValueChange={(v) => v && setFileJurisdiction(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  )
}
