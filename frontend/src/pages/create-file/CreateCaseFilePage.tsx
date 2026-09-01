import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ExternalLink,
  FilePlus2,
  Search,
} from 'lucide-react'
import { CasePartyListEditor } from '@/components/matters/CasePartyListEditor'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { documentsApi } from '@/features/documents/api'
import { useClient, useCreateClient } from '@/features/crm/hooks/useClients'
import { contactsApi } from '@/features/crm/api'
import { clientDisplayName } from '@/features/crm/utils'
import { useCreateMatter } from '@/features/matters/hooks/useMatters'
import { COMMERCIAL_REGISTER_URL } from '@/features/create-file/trademark-subtypes'
import {
  ClientSearchPicker,
  Field,
  SectionCard,
  emptyAddress,
  type AddressDraft,
} from '@/features/create-file/create-file-form'
import {
  CASE_CLIENT_ROLES,
  casePartyTone,
  normalizeCaseClientRole,
  type CaseClientRole,
  type CasePartyDraft,
  type CasePartyKind,
  type CaseSectionTone,
} from '@/features/create-file/case-subtypes'
import { emptyCaseParty, serializeCaseParties } from '@/features/matters/case-party-form'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const emptyParty = emptyCaseParty

const serializeParties = serializeCaseParties

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
  action,
  children,
}: {
  tone: CaseSectionTone
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm',
        TONE_SIDE[tone],
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3',
          TONE_HEADER[tone],
        )}
      >
        <h2
          className={cn(
            'text-sm font-semibold tracking-wide uppercase',
            TONE_TITLE[tone],
          )}
        >
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-4 bg-card p-5">{children}</div>
    </section>
  )
}

export function CreateCaseFilePage() {
  const { t } = useTranslation('matters')
  const navigate = useNavigate()
  const createMatter = useCreateMatter()
  const createClient = useCreateClient()

  const [clientId, setClientId] = useState<string | undefined>()
  const [legalName, setLegalName] = useState('')
  const [eik, setEik] = useState('')
  const [vatNo, setVatNo] = useState('')
  const [mol, setMol] = useState('')

  const [registered, setRegistered] = useState<AddressDraft>(emptyAddress)
  const [correspondenceSame, setCorrespondenceSame] = useState(true)
  const [correspondence, setCorrespondence] = useState<AddressDraft>(emptyAddress)

  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactFax, setContactFax] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const [clientRole, setClientRole] = useState<CaseClientRole | null>(null)
  const [plaintiffs, setPlaintiffs] = useState<CasePartyDraft[]>([emptyParty()])
  const [defendants, setDefendants] = useState<CasePartyDraft[]>([emptyParty()])
  const [interestedParties, setInterestedParties] = useState<CasePartyDraft[]>([
    emptyParty(),
  ])

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
  const [rightFile, setRightFile] = useState<File | null>(null)

  const [expertiseType, setExpertiseType] = useState('')
  const [experts, setExperts] = useState('')
  const [expertiseQuestions, setExpertiseQuestions] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: selectedClient } = useClient(clientId ?? '')

  useEffect(() => {
    if (!selectedClient) return
    setLegalName(clientDisplayName(selectedClient))
    setEik(selectedClient.registrationNo ?? '')
    setVatNo(selectedClient.vatNo ?? '')
    const reg = selectedClient.offices?.find((o) => o.addressType === 'registered_legal')
    const corr = selectedClient.offices?.find((o) => o.addressType === 'correspondence')
    if (reg) {
      setRegistered({
        city: reg.city ?? '',
        country: reg.country ?? selectedClient.country ?? 'BG',
        postalCode: reg.postalCode ?? '',
        address: [reg.addressLine1, reg.addressLine2].filter(Boolean).join(', '),
        email: selectedClient.billingEmail ?? '',
      })
    } else {
      setRegistered((prev) => ({
        ...prev,
        country: selectedClient.country ?? prev.country,
        email: selectedClient.billingEmail ?? prev.email,
      }))
    }
    if (corr) {
      setCorrespondenceSame(false)
      setCorrespondence({
        city: corr.city ?? '',
        country: corr.country ?? 'BG',
        postalCode: corr.postalCode ?? '',
        address: [corr.addressLine1, corr.addressLine2].filter(Boolean).join(', '),
        email: selectedClient.billingEmail ?? '',
      })
    }
    const primary = selectedClient.contacts?.find((c) => c.role === 'primary')
    if (primary) {
      setContactName(`${primary.firstName} ${primary.lastName}`.trim())
      setContactPhone(primary.phone ?? primary.mobile ?? '')
      setContactEmail(primary.email ?? '')
    }
  }, [selectedClient])

  useEffect(() => {
    if (!clientRole || !legalName.trim()) return
    const fill = (rows: CasePartyDraft[]) => {
      const first = rows[0]
      if (!first || first.legalName.trim()) return rows
      return [
        {
          ...first,
          legalName: legalName.trim(),
          city: registered.city,
          postalCode: registered.postalCode,
          country: registered.country || 'BG',
          address: registered.address,
        },
        ...rows.slice(1),
      ]
    }
    if (clientRole === 'plaintiff') setPlaintiffs(fill)
    if (clientRole === 'defendant') setDefendants(fill)
    if (clientRole === 'interested') setInterestedParties(fill)
  }, [clientRole, legalName, registered])

  const handleSaveDraft = async () => {
    setError(null)
    if (!clientId && !legalName.trim()) {
      setError(t('createFile.errors.clientOrDetails'))
      return
    }
    if (!clientRole) {
      setError(t('createFile.errors.caseClientRole'))
      return
    }

    const attributes: Record<string, unknown> = {
      caseClientRole: clientRole,
      plaintiffs: serializeParties(plaintiffs),
      defendants: serializeParties(defendants),
      interestedParties: serializeParties(interestedParties),
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
      mol: mol.trim() || undefined,
      clientLegalName: legalName.trim() || undefined,
      eik: eik.trim() || undefined,
      vatNo: vatNo.trim() || undefined,
      contactPerson: {
        name: contactName.trim() || undefined,
        phone: contactPhone.trim() || undefined,
        fax: contactFax.trim() || undefined,
        email: contactEmail.trim() || undefined,
      },
      registeredAddress: registered,
      correspondenceAddress: correspondenceSame ? registered : correspondence,
      correspondenceSameAsRegistered: correspondenceSame,
    }

    try {
      let resolvedClientId = clientId
      if (!resolvedClientId) {
        const billingEmail =
          contactEmail.trim() || registered.email.trim() || undefined
        const created = await createClient.mutateAsync({
          type: 'company',
          companyName: legalName.trim(),
          registrationNo: eik.trim() || undefined,
          vatNo: vatNo.trim() || undefined,
          country: registered.country || undefined,
          gdprConsent: true,
          billingName: legalName.trim(),
          billingEmail,
          billingAddressLine1: registered.address.trim() || undefined,
          billingCity: registered.city.trim() || undefined,
          billingPostalCode: registered.postalCode.trim() || undefined,
          billingCountry: registered.country || undefined,
          notes: mol.trim() ? `MOL: ${mol.trim()}` : undefined,
          registeredLegalAddress: {
            addressLine1: registered.address.trim() || undefined,
            city: registered.city.trim() || undefined,
            postalCode: registered.postalCode.trim() || undefined,
            country: registered.country || undefined,
            phone: contactPhone.trim() || undefined,
            fax: contactFax.trim() || undefined,
          },
          correspondenceAddress: correspondenceSame
            ? undefined
            : {
                addressLine1: correspondence.address.trim() || undefined,
                city: correspondence.city.trim() || undefined,
                postalCode: correspondence.postalCode.trim() || undefined,
                country: correspondence.country || undefined,
              },
        })
        resolvedClientId = created.id

        if (contactName.trim()) {
          const parts = contactName.trim().split(/\s+/).filter(Boolean)
          const firstName = parts[0] ?? contactName.trim()
          const lastName =
            parts.length > 1 ? parts.slice(1).join(' ') : firstName
          try {
            await contactsApi.create(created.id, {
              role: 'primary',
              firstName,
              lastName,
              email: contactEmail.trim() || undefined,
              phone: contactPhone.trim() || undefined,
            })
          } catch {
            /* contact is best-effort */
          }
        }
      }

      const title =
        court.trim() ||
        incomingNumber.trim() ||
        legalName.trim() ||
        t('createFile.kinds.case')

      const matter = await createMatter.mutateAsync({
        clientId: resolvedClientId,
        matterType: 'cases',
        title,
        status: 'draft',
        description: t('createFile.draftDescription', {
          procedure: t('createFile.kinds.case'),
        }),
        jurisdictions: territory
          ? [{ countryCode: territory }]
          : registered.country
            ? [{ countryCode: registered.country }]
            : [],
        attributes,
      })

      if (rightFile) {
        await documentsApi.upload(matter.id, {
          file: rightFile,
          displayName: rightFile.name,
          category: 'evidence',
          tags: 'case-right,create-file',
        })
      }

      navigate(`/matters/${matter.id}/overview`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('createFile.errors.saveFailed')))
    }
  }

  const partyTitle = (kind: CasePartyKind) =>
    t(`createFile.sections.caseParties.${kind}`)

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/matters"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-2 px-0')}
          >
            <ArrowLeft className="mr-1 size-4" />
            {t('createFile.backToFiles')}
          </Link>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <FilePlus2 className="size-6" />
            </div>
            <div>
              <h1 className="font-serif text-3xl tracking-tight text-foreground">
                {t('createFile.caseFormTitle')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('createFile.kinds.case')}
                {' · '}
                {t('createFile.sections.basicInfo')}
              </p>
            </div>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => void handleSaveDraft()}
          disabled={createMatter.isPending || createClient.isPending}
        >
          {createMatter.isPending || createClient.isPending
            ? t('createFile.saving')
            : t('createFile.saveDraft')}
        </Button>
      </div>

      <SectionCard title={t('createFile.sections.client')}>
        <div className="space-y-4">
          <Field label={t('createFile.fields.linkClientOptional')}>
            <ClientSearchPicker value={clientId} onChange={setClientId} />
          </Field>
          {!clientId ? (
            <p className="text-xs text-muted-foreground">
              {t('createFile.clientOptionalHint')}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t('createFile.fields.legalName')}${!clientId ? ' *' : ''}`}>
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </Field>
            <Field label={t('createFile.fields.eik')}>
              <Input value={eik} onChange={(e) => setEik(e.target.value)} />
            </Field>
            <Field label={t('createFile.fields.vat')}>
              <Input value={vatNo} onChange={(e) => setVatNo(e.target.value)} />
            </Field>
            <Field label={t('createFile.fields.mol')}>
              <Input value={mol} onChange={(e) => setMol(e.target.value)} />
            </Field>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              window.open(COMMERCIAL_REGISTER_URL, '_blank', 'noopener,noreferrer')
            }
          >
            <Search className="size-4" />
            {t('createFile.checkRegister')}
            <ExternalLink className="size-3.5 opacity-70" />
          </Button>
        </div>
      </SectionCard>

      <SectionCard title={t('createFile.sections.registeredAddress')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('createFile.fields.city')}>
            <Input
              value={registered.city}
              onChange={(e) => setRegistered((a) => ({ ...a, city: e.target.value }))}
            />
          </Field>
          <Field label={t('createFile.fields.country')}>
            <CountrySelect
              value={registered.country}
              onValueChange={(code) =>
                setRegistered((a) => ({ ...a, country: code }))
              }
            />
          </Field>
          <Field label={t('createFile.fields.postalCode')}>
            <Input
              value={registered.postalCode}
              onChange={(e) =>
                setRegistered((a) => ({ ...a, postalCode: e.target.value }))
              }
            />
          </Field>
          <Field label={t('createFile.fields.email')}>
            <Input
              type="email"
              value={registered.email}
              onChange={(e) => setRegistered((a) => ({ ...a, email: e.target.value }))}
            />
          </Field>
          <Field label={t('createFile.fields.address')} className="sm:col-span-2">
            <Input
              value={registered.address}
              onChange={(e) => setRegistered((a) => ({ ...a, address: e.target.value }))}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t('createFile.sections.contact')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('createFile.fields.name')}>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field label={t('createFile.fields.phone')}>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </Field>
          <Field label={t('createFile.fields.fax')}>
            <Input value={contactFax} onChange={(e) => setContactFax(e.target.value)} />
          </Field>
          <Field label={t('createFile.fields.email')}>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t('createFile.sections.correspondence')}>
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={correspondenceSame}
            onChange={(e) => setCorrespondenceSame(e.target.checked)}
            className="size-4 rounded border"
          />
          {t('createFile.sameCorrespondence')}
        </label>
        {!correspondenceSame ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('createFile.fields.city')}>
              <Input
                value={correspondence.city}
                onChange={(e) =>
                  setCorrespondence((a) => ({ ...a, city: e.target.value }))
                }
              />
            </Field>
            <Field label={t('createFile.fields.postalCode')}>
              <Input
                value={correspondence.postalCode}
                onChange={(e) =>
                  setCorrespondence((a) => ({ ...a, postalCode: e.target.value }))
                }
              />
            </Field>
            <Field label={t('createFile.fields.country')}>
              <CountrySelect
                value={correspondence.country}
                onValueChange={(code) =>
                  setCorrespondence((a) => ({ ...a, country: code }))
                }
              />
            </Field>
            <Field label={t('createFile.fields.email')}>
              <Input
                type="email"
                value={correspondence.email}
                onChange={(e) =>
                  setCorrespondence((a) => ({ ...a, email: e.target.value }))
                }
              />
            </Field>
            <Field label={t('createFile.fields.address')} className="sm:col-span-2">
              <Input
                value={correspondence.address}
                onChange={(e) =>
                  setCorrespondence((a) => ({ ...a, address: e.target.value }))
                }
              />
            </Field>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title={t('createFile.fields.theClientIs')}>
        <Select
          value={clientRole ?? undefined}
          onValueChange={(v) => setClientRole(normalizeCaseClientRole(v))}
        >
          <SelectTrigger>
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
      </SectionCard>

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

      <TonePanel tone="case" title={t('createFile.sections.caseData')}>
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
            <Input
              value={claimValue}
              onChange={(e) => setClaimValue(e.target.value)}
            />
          </Field>
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
              <Input
                value={rightName}
                onChange={(e) => setRightName(e.target.value)}
              />
            </Field>
            <Field label={t('createFile.fields.rightApplicationDate')}>
              <Input
                type="date"
                value={rightApplicationDate}
                onChange={(e) => setRightApplicationDate(e.target.value)}
              />
            </Field>
            <Field label={t('createFile.fields.rightScope')}>
              <Input
                value={rightScope}
                onChange={(e) => setRightScope(e.target.value)}
              />
            </Field>
            <Field label={t('createFile.fields.attachDocument')}>
              <Input
                type="file"
                onChange={(e) => setRightFile(e.target.files?.[0] ?? null)}
              />
              {rightFile ? (
                <p className="text-xs text-muted-foreground">{rightFile.name}</p>
              ) : null}
            </Field>
            <Field label={t('createFile.fields.owner')} className="sm:col-span-2">
              <Input
                value={rightOwner}
                onChange={(e) => setRightOwner(e.target.value)}
              />
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
      </TonePanel>

      <SectionCard title={t('createFile.sections.additionalInfo')}>
        <Textarea
          rows={6}
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
        />
      </SectionCard>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <Link to="/matters">
          <Button type="button" variant="outline">
            {t('createFile.cancel')}
          </Button>
        </Link>
        <Button
          type="button"
          onClick={() => void handleSaveDraft()}
          disabled={createMatter.isPending || createClient.isPending}
        >
          {createMatter.isPending || createClient.isPending
            ? t('createFile.saving')
            : t('createFile.saveDraft')}
        </Button>
      </div>
    </div>
  )
}
