import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Folder, Pencil } from 'lucide-react'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { CasePartyListEditor } from '@/components/matters/CasePartyListEditor'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import {
  CASE_CLIENT_ROLES,
  casePartyTone,
  normalizeCaseClientRole,
  type CaseClientRole,
  type CasePartyKind,
  type CaseSectionTone,
} from '@/features/create-file/case-subtypes'
import type { CasePartyDraft } from '@/features/create-file/case-subtypes'
import { Field } from '@/features/create-file/create-file-form'
import { clientDisplayName } from '@/features/crm/utils'
import {
  appendCaseEvent,
  CASE_STATUS_VALUES,
  formatPartyBlock,
  readCaseFields,
  type CaseStatusValue,
} from '@/features/matters/case-matter'
import { partiesToDraft, serializeCaseParties } from '@/features/matters/case-party-form'
import { formatCaseRefDate } from '@/features/matters/case-list-utils'
import { useUpdateMatter } from '@/features/matters/hooks/useMatters'
import type { MatterDetail } from '@/features/matters/types'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type CaseMatterTabProps = {
  matter: MatterDetail
}

const TONE_SIDE: Record<CaseSectionTone, string> = {
  us: 'border-l-[5px] border-l-emerald-600',
  them: 'border-l-[5px] border-l-rose-500',
  third: 'border-l-[5px] border-l-amber-500',
  case: 'border-l-[5px] border-l-sky-600',
}

const TONE_HEADER: Record<CaseSectionTone, string> = {
  us: 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50',
  them: 'border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50',
  third:
    'border-amber-100 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/50',
  case: 'border-sky-100 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/50',
}

const TONE_TITLE: Record<CaseSectionTone, string> = {
  us: 'text-emerald-950 dark:text-emerald-100',
  them: 'text-rose-950 dark:text-rose-100',
  third: 'text-amber-950 dark:text-amber-100',
  case: 'text-sky-950 dark:text-sky-100',
}

function TonePanel({
  tone,
  title,
  subtitle,
  children,
}: {
  tone: CaseSectionTone
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm',
        TONE_SIDE[tone],
      )}
    >
      <div className={cn('border-b px-4 py-3', TONE_HEADER[tone])}>
        <h3 className={cn('text-xs font-semibold tracking-wide uppercase', TONE_TITLE[tone])}>
          {title}
        </h3>
        {subtitle ? (
          <p className={cn('mt-1 text-[11px] font-medium uppercase', TONE_TITLE[tone])}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="space-y-2 whitespace-pre-line p-4 text-sm">{children}</div>
    </section>
  )
}

function AccordionBar({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-lg border border-sky-200/80 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-sky-950 dark:text-sky-100"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{title}</span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && children ? (
        <div className="border-t border-sky-200/80 px-4 py-3 text-sm dark:border-sky-900/60">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function CaseMatterTab({ matter }: CaseMatterTabProps) {
  const { t } = useTranslation('matters')
  const canUpdate = usePermission('matter', 'update')
  const updateMatter = useUpdateMatter(matter.id)
  const attrs = matter.attributes?.attributes ?? {}

  const [editing, setEditing] = useState(matter.status === 'draft')
  const [error, setError] = useState<string | null>(null)

  const [clientRole, setClientRole] = useState<CaseClientRole | null>(null)
  const [plaintiffs, setPlaintiffs] = useState<CasePartyDraft[]>([])
  const [defendants, setDefendants] = useState<CasePartyDraft[]>([])
  const [interestedParties, setInterestedParties] = useState<CasePartyDraft[]>([])

  const [court, setCourt] = useState('')
  const [territory, setTerritory] = useState('')
  const [authority, setAuthority] = useState('')
  const [panel, setPanel] = useState('')
  const [division, setDivision] = useState('')
  const [incomingNumber, setIncomingNumber] = useState('')
  const [incomingNumber2, setIncomingNumber2] = useState('')
  const [claimGrounds, setClaimGrounds] = useState('')
  const [claimValue, setClaimValue] = useState('')

  const [rightsOther, setRightsOther] = useState(false)
  const [rightObject, setRightObject] = useState('')
  const [rightApplicationNumber, setRightApplicationNumber] = useState('')
  const [rightName, setRightName] = useState('')
  const [rightApplicationDate, setRightApplicationDate] = useState('')
  const [rightScope, setRightScope] = useState('')
  const [rightOwner, setRightOwner] = useState('')

  const [expertiseType, setExpertiseType] = useState('')
  const [experts, setExperts] = useState('')
  const [expertiseQuestions, setExpertiseQuestions] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')

  const [caseStatus, setCaseStatus] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [events, setEvents] = useState(readCaseFields(attrs).caseEvents)

  const [reminderRegarding, setReminderRegarding] = useState('')
  const [reminderDeadline, setReminderDeadline] = useState('')
  const [reminderInfo, setReminderInfo] = useState('')

  const syncFromMatter = () => {
    const next = readCaseFields(matter.attributes?.attributes ?? {})
    setClientRole(next.caseClientRole)
    setPlaintiffs(partiesToDraft(next.plaintiffs))
    setDefendants(partiesToDraft(next.defendants))
    setInterestedParties(partiesToDraft(next.interestedParties))
    setCourt(next.court ?? '')
    setTerritory(next.territory ?? '')
    setAuthority(next.authority ?? '')
    setPanel(next.panel ?? '')
    setDivision(next.division ?? '')
    setIncomingNumber(next.incomingNumber ?? '')
    setIncomingNumber2(next.incomingNumber2 ?? '')
    setClaimGrounds(next.claimGrounds ?? '')
    setClaimValue(next.claimValue ?? '')
    setRightsOther(next.rightsOther)
    setRightObject(next.rightObject ?? '')
    setRightApplicationNumber(next.rightApplicationNumber ?? '')
    setRightName(next.rightName ?? '')
    setRightApplicationDate(next.rightApplicationDate ?? '')
    setRightScope(next.rightScope ?? '')
    setRightOwner(next.rightOwner ?? '')
    setExpertiseType(next.expertiseType ?? '')
    setExperts(next.experts ?? '')
    setExpertiseQuestions(next.expertiseQuestions ?? '')
    setAdditionalInfo(next.additionalInfo ?? '')
    setCaseStatus(next.caseStatus ?? '')
    setScheduledDate(next.scheduledDate ?? '')
    setEvents(next.caseEvents)
  }

  useEffect(() => {
    syncFromMatter()
    setEditing(matter.status === 'draft')
    setError(null)
    setReminderRegarding('')
    setReminderDeadline('')
    setReminderInfo('')
  }, [matter.id, matter.updatedAt, matter.status])

  const fields = readCaseFields(attrs)
  const clientName = fields.clientLegalName || clientDisplayName(matter.client)
  const partyTitle = (kind: CasePartyKind) =>
    t(`createFile.sections.caseParties.${kind}`)

  const caseNumber =
    fields.incomingNumber ?? fields.incomingNumber2 ?? matter.title

  const handleSave = async () => {
    if (!canUpdate || !editing) return
    setError(null)

    if (!clientRole) {
      setError(t('createFile.errors.caseClientRole'))
      return
    }

    const nextAttributes: Record<string, unknown> = {
      ...attrs,
      caseClientRole: clientRole,
      plaintiffs: serializeCaseParties(plaintiffs),
      defendants: serializeCaseParties(defendants),
      interestedParties: serializeCaseParties(interestedParties),
      court: court.trim() || undefined,
      territory: territory || undefined,
      authority: authority.trim() || undefined,
      panel: panel.trim() || undefined,
      division: division.trim() || undefined,
      incomingNumber: incomingNumber.trim() || undefined,
      incomingNumber2: incomingNumber2.trim() || undefined,
      claimGrounds: claimGrounds.trim() || undefined,
      claimValue: claimValue.trim() || undefined,
      rightsOther,
      rightObject: rightObject.trim() || undefined,
      rightApplicationNumber: rightApplicationNumber.trim() || undefined,
      rightName: rightName.trim() || undefined,
      rightApplicationDate: rightApplicationDate || undefined,
      rightScope: rightScope.trim() || undefined,
      rightOwner: rightOwner.trim() || undefined,
      expertiseType: expertiseType.trim() || undefined,
      experts: experts.trim() || undefined,
      expertiseQuestions: expertiseQuestions.trim() || undefined,
      additionalInfo: additionalInfo.trim() || undefined,
      caseStatus: caseStatus || undefined,
      scheduledDate: caseStatus === 'scheduled' ? scheduledDate || undefined : undefined,
      caseEvents: events,
    }

    const title =
      court.trim() ||
      incomingNumber.trim() ||
      incomingNumber2.trim() ||
      matter.title

    try {
      await updateMatter.mutateAsync({
        title,
        attributes: nextAttributes,
      })
      setEditing(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('caseView.errors.saveFailed')))
    }
  }

  const handleAddReminder = async () => {
    if (!canUpdate || !reminderRegarding.trim()) return
    setError(null)
    const nextAttrs = appendCaseEvent(attrs, {
      date: new Date().toISOString().slice(0, 10),
      deadline: reminderDeadline || undefined,
      regarding: reminderRegarding.trim(),
      info: reminderInfo.trim() || undefined,
    })
    try {
      await updateMatter.mutateAsync({
        attributes: nextAttrs,
      })
      setEvents(readCaseFields(nextAttrs).caseEvents)
      setReminderRegarding('')
      setReminderDeadline('')
      setReminderInfo('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('caseView.errors.saveFailed')))
    }
  }

  const editControls = canUpdate ? (
    editing ? (
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={updateMatter.isPending}
          onClick={() => {
            syncFromMatter()
            setEditing(matter.status === 'draft')
            setError(null)
          }}
        >
          {t('caseView.cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={updateMatter.isPending}
          onClick={() => void handleSave()}
        >
          {updateMatter.isPending ? t('caseView.saving') : t('caseView.save')}
        </Button>
      </div>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setEditing(true)}
      >
        <Pencil className="size-3.5" />
        {t('caseView.edit')}
      </Button>
    )
  ) : null

  const plaintiffBlock = formatPartyBlock(fields.plaintiffs)
  const defendantBlock = formatPartyBlock(fields.defendants)
  const interestedBlock = formatPartyBlock(fields.interestedParties)

  const subjectText =
    fields.rightObject ||
    fields.rightName ||
    fields.claimGrounds ||
    fields.additionalInfo ||
    '—'

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t('caseView.editHint')}</p>
          {editControls}
        </div>

        <Card className="overflow-hidden border-border/80">
          <div className="bg-gradient-to-r from-muted/70 via-muted/40 to-muted/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="font-semibold uppercase tracking-wide">
                {t('caseView.clientLabel')}: {clientName}
              </p>
              <p className="font-mono font-semibold">
                {t('caseView.caseNumberLabel')}: {caseNumber || '—'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('createFile.fields.theClientIs')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={clientRole ?? undefined}
              onValueChange={(value) => setClientRole(normalizeCaseClientRole(value))}
            >
              <SelectTrigger className="max-w-md bg-background">
                <SelectValue placeholder={t('createFile.fields.theClientIs')} />
              </SelectTrigger>
              <SelectContent>
                {CASE_CLIENT_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`createFile.caseClientRoles.${role}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <CasePartyListEditor
          title={partyTitle('plaintiff')}
          tone={casePartyTone(clientRole, 'plaintiff')}
          rows={plaintiffs}
          onChange={setPlaintiffs}
        />
        <CasePartyListEditor
          title={partyTitle('defendant')}
          tone={casePartyTone(clientRole, 'defendant')}
          rows={defendants}
          onChange={setDefendants}
        />
        <CasePartyListEditor
          title={partyTitle('interested')}
          tone={casePartyTone(clientRole, 'interested')}
          rows={interestedParties}
          onChange={setInterestedParties}
        />

        <section className="overflow-hidden rounded-xl border border-sky-200/80 border-l-[5px] border-l-sky-600 bg-card shadow-sm">
          <div className="border-b border-sky-100 bg-sky-50 px-5 py-3 dark:border-sky-900/60 dark:bg-sky-950/50">
            <h2 className="text-sm font-semibold tracking-wide text-sky-950 uppercase dark:text-sky-100">
              {t('createFile.sections.caseData')}
            </h2>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('createFile.fields.court')}>
                <Input value={court} onChange={(e) => setCourt(e.target.value)} />
              </Field>
              <Field label={t('createFile.fields.territory')}>
                <CountrySelect
                  value={territory}
                  onValueChange={setTerritory}
                  placeholder={t('createFile.fields.territory')}
                />
              </Field>
              <Field label={t('createFile.fields.authority')}>
                <Input value={authority} onChange={(e) => setAuthority(e.target.value)} />
              </Field>
              <Field label={t('createFile.fields.panel')}>
                <Input value={panel} onChange={(e) => setPanel(e.target.value)} />
              </Field>
              <Field label={t('createFile.fields.division')}>
                <Input value={division} onChange={(e) => setDivision(e.target.value)} />
              </Field>
              <Field label={t('createFile.fields.incomingNumber')}>
                <Input
                  value={incomingNumber}
                  onChange={(e) => setIncomingNumber(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.incomingNumber')}>
                <Input
                  value={incomingNumber2}
                  onChange={(e) => setIncomingNumber2(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.claimGrounds')} className="sm:col-span-2">
                <Input
                  value={claimGrounds}
                  onChange={(e) => setClaimGrounds(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.claimValue')}>
                <Input value={claimValue} onChange={(e) => setClaimValue(e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 border-t border-border/60 pt-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
              <div className="space-y-3">
                <p className="text-sm font-medium">{t('caseView.statusTitle')}</p>
                <Select
                  value={caseStatus || 'none'}
                  onValueChange={(value) =>
                    setCaseStatus(!value || value === 'none' ? '' : value)
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('caseView.chooseStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('caseView.chooseStatus')}</SelectItem>
                    {CASE_STATUS_VALUES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`caseList.statusOptions.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {caseStatus === 'scheduled' ? (
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase text-foreground">
                  {t('createFile.sections.caseRights')}
                </h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rightsOther}
                    onChange={(e) => setRightsOther(e.target.checked)}
                    className="size-4 rounded border"
                  />
                  {t('createFile.fields.other')}
                </label>
              </div>
              <Field label={t('createFile.fields.rightObject')}>
                <Input
                  value={rightObject}
                  onChange={(e) => setRightObject(e.target.value)}
                  placeholder={t('createFile.fields.selectObject')}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('createFile.fields.applicationNumber')}>
                  <Input
                    value={rightApplicationNumber}
                    onChange={(e) => setRightApplicationNumber(e.target.value)}
                  />
                </Field>
                <Field label={t('createFile.fields.rightName')}>
                  <Input value={rightName} onChange={(e) => setRightName(e.target.value)} />
                </Field>
                <Field label={t('createFile.fields.rightApplicationDate')}>
                  <Input
                    type="date"
                    value={rightApplicationDate}
                    onChange={(e) => setRightApplicationDate(e.target.value)}
                  />
                </Field>
                <Field label={t('createFile.fields.rightScope')}>
                  <Input value={rightScope} onChange={(e) => setRightScope(e.target.value)} />
                </Field>
                <Field label={t('createFile.fields.owner')} className="sm:col-span-2">
                  <Input value={rightOwner} onChange={(e) => setRightOwner(e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-4">
              <h3 className="text-sm font-semibold uppercase text-foreground">
                {t('createFile.sections.expertise')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('createFile.fields.expertiseType')}>
                  <Input
                    value={expertiseType}
                    onChange={(e) => setExpertiseType(e.target.value)}
                  />
                </Field>
                <Field label={t('createFile.fields.experts')}>
                  <Input value={experts} onChange={(e) => setExperts(e.target.value)} />
                </Field>
              </div>
              <Field label={t('createFile.fields.expertiseQuestions')}>
                <Textarea
                  rows={4}
                  value={expertiseQuestions}
                  onChange={(e) => setExpertiseQuestions(e.target.value)}
                />
              </Field>
            </div>

            <Field label={t('createFile.sections.additionalInfo')}>
              <Textarea
                rows={4}
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
              />
            </Field>
          </div>
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">{editControls}</div>

      <Card className="overflow-hidden border-border/80">
        <div className="bg-gradient-to-r from-muted/70 via-muted/40 to-muted/70 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="font-semibold uppercase tracking-wide">
              {t('caseView.clientLabel')}: {clientName}
            </p>
            <p className="font-mono font-semibold">
              {t('caseView.caseNumberLabel')}: {caseNumber}
              {fields.isIncoming || fields.incomingNumber2
                ? ` (${t('caseList.incomingSuffix')})`
                : ''}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <TonePanel
          tone={casePartyTone(fields.caseClientRole, 'plaintiff')}
          title={partyTitle('plaintiff')}
          subtitle={t('createFile.sections.lawyers')}
        >
          <div>{plaintiffBlock.parties}</div>
          <div className="border-t border-border/60 pt-2 text-muted-foreground">
            {plaintiffBlock.lawyers}
          </div>
        </TonePanel>
        <TonePanel
          tone={casePartyTone(fields.caseClientRole, 'interested')}
          title={partyTitle('interested')}
          subtitle={t('createFile.sections.lawyers')}
        >
          <div>{interestedBlock.parties}</div>
          <div className="border-t border-border/60 pt-2 text-muted-foreground">
            {interestedBlock.lawyers}
          </div>
        </TonePanel>
        <TonePanel
          tone={casePartyTone(fields.caseClientRole, 'defendant')}
          title={partyTitle('defendant')}
          subtitle={t('createFile.sections.lawyers')}
        >
          <div>{defendantBlock.parties}</div>
          <div className="border-t border-border/60 pt-2 text-muted-foreground">
            {defendantBlock.lawyers}
          </div>
        </TonePanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('caseView.statusTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {caseStatus
                ? t(`caseList.statusOptions.${caseStatus as CaseStatusValue}`)
                : '—'}
              {caseStatus === 'scheduled' && scheduledDate
                ? ` (${formatCaseRefDate(scheduledDate)})`
                : ''}
            </p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">{t('createFile.fields.court')}:</span>{' '}
                {court || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">{t('createFile.fields.authority')}:</span>{' '}
                {authority || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">{t('createFile.fields.panel')}:</span>{' '}
                {panel || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">{t('createFile.fields.division')}:</span>{' '}
                {division || '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <AccordionBar title={t('caseView.subjectTitle')} defaultOpen>
            <p>{subjectText}</p>
            {fields.rightApplicationNumber ? (
              <p className="mt-2 text-muted-foreground">
                {fields.rightApplicationNumber}
                {fields.rightApplicationDate
                  ? ` · ${formatCaseRefDate(fields.rightApplicationDate)}`
                  : ''}
              </p>
            ) : null}
          </AccordionBar>
          {fields.caseInstances.map((instance) => (
            <AccordionBar
              key={instance.id}
              title={t('caseView.instanceTitle', {
                number: instance.caseNumber ?? '—',
                court: instance.court ?? court ?? '—',
              })}
            >
              <p>
                {instance.instance
                  ? `${t('createFile.fields.authority')}: ${instance.instance}`
                  : null}
                {instance.panel ? ` · ${t('createFile.fields.panel')}: ${instance.panel}` : null}
                {instance.division
                  ? ` · ${t('createFile.fields.division')}: ${instance.division}`
                  : null}
              </p>
            </AccordionBar>
          ))}
        </div>
      </div>

      {events.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('caseView.eventsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('caseView.events.date')}</TableHead>
                  <TableHead>{t('caseView.events.deadline')}</TableHead>
                  <TableHead>{t('caseView.events.regarding')}</TableHead>
                  <TableHead>{t('caseView.events.info')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{formatCaseRefDate(event.date) || '—'}</TableCell>
                    <TableCell>{formatCaseRefDate(event.deadline) || '—'}</TableCell>
                    <TableCell>{event.regarding || '—'}</TableCell>
                    <TableCell className="whitespace-normal">{event.info || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {canUpdate ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('caseView.reminderTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-[1fr_180px_1fr_auto] lg:items-end">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t('caseView.events.regarding')}
              </span>
              <Input
                value={reminderRegarding}
                onChange={(e) => setReminderRegarding(e.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t('caseView.events.deadline')}
              </span>
              <Input
                type="date"
                value={reminderDeadline}
                onChange={(e) => setReminderDeadline(e.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t('caseView.events.info')}
              </span>
              <Textarea
                rows={2}
                value={reminderInfo}
                onChange={(e) => setReminderInfo(e.target.value)}
              />
            </label>
            <Button type="button" onClick={() => void handleAddReminder()}>
              {t('caseView.addReminder')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <Link
          to={`/matters/${matter.id}/documents`}
          className={buttonVariants({ variant: 'outline' })}
        >
          <Folder className="size-4" />
          {t('caseView.openArchive')}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled>
            {t('caseView.actions.decision')}
          </Button>
          <Button type="button" variant="secondary" disabled>
            {t('caseView.actions.agreement')}
          </Button>
          <Button type="button" variant="secondary" disabled>
            {t('caseView.actions.ruling')}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
