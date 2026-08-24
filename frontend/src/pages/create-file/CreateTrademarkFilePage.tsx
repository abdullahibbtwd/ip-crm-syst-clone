import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ExternalLink,
  FilePlus2,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
} from 'lucide-react'
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
import { useClient, useClients, useCreateClient } from '@/features/crm/hooks/useClients'
import {
  useHoldingGroups,
  useSetClientHoldingGroup,
} from '@/features/crm/hooks/useHoldingGroups'
import { contactsApi } from '@/features/crm/api'
import { clientDisplayName } from '@/features/crm/utils'
import { useCreateMatter } from '@/features/matters/hooks/useMatters'
import {
  COMMERCIAL_REGISTER_URL,
  MARK_KINDS,
  MARK_TYPES,
  NICE_CLASS_NUMBERS,
  SEARCH_LINKS,
  TERRITORIES,
  TRADEMARK_PROCEDURES,
  isFullTrademarkForm,
  normalizeTrademarkProcedure,
  trademarkSideForProcedure,
  type GoodsServicesRow,
  type MarkKind,
  type CreateFileMarkType,
  type TrademarkProcedure,
  type TrademarkTerritory,
} from '@/features/create-file/trademark-subtypes'
import { getApiErrorMessage } from '@/lib/api-client'
import { getCountryLabel, getCountryOptions } from '@/lib/countries'
import { cn } from '@/lib/utils'

type AddressDraft = {
  city: string
  country: string
  postalCode: string
  address: string
  email: string
}

const emptyAddress = (): AddressDraft => ({
  city: '',
  country: 'BG',
  postalCode: '',
  address: '',
  email: '',
})

function nextId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

type BasisMarkDraft = {
  id: string
  applicationNo: string
  name: string
  applicationDate: string
  classes: string
  owner: string
  country: string
  file: File | null
}

const emptyBasisMark = (): BasisMarkDraft => ({
  id: nextId('basis'),
  applicationNo: '',
  name: '',
  applicationDate: '',
  classes: '',
  owner: '',
  country: 'BG',
  file: null,
})

function SectionCard({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function PartyPanel({
  tone,
  label,
  children,
}: {
  tone: 'us' | 'them'
  label: string
  children: ReactNode
}) {
  const isUs = tone === 'us'
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm',
        isUs ? 'border-l-[5px] border-l-emerald-600' : 'border-l-[5px] border-l-rose-500',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2.5 border-b px-5 py-3',
          isUs
            ? 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50'
            : 'border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50',
        )}
      >
        {isUs ? (
          <Shield className="size-4 text-emerald-700 dark:text-emerald-300" />
        ) : (
          <Users className="size-4 text-rose-700 dark:text-rose-300" />
        )}
        <p
          className={cn(
            'text-sm font-semibold',
            isUs
              ? 'text-emerald-950 dark:text-emerald-100'
              : 'text-rose-950 dark:text-rose-100',
          )}
        >
          {label}
        </p>
      </div>
      <div className="space-y-6 bg-card p-5">{children}</div>
    </section>
  )
}

function SubSection({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  )
}

type AdditionalApplicantDraft = {
  id: string
  legalName: string
  eik: string
  vatNo: string
  address: AddressDraft
}

const emptyApplicant = (): AdditionalApplicantDraft => ({
  id: nextId('applicant'),
  legalName: '',
  eik: '',
  vatNo: '',
  address: emptyAddress(),
})

function ApplicantPartyFields({
  legalName,
  eik,
  vatNo,
  address,
  showIdsAndEmail,
  legalNameRequired,
  onLegalNameChange,
  onEikChange,
  onVatChange,
  onAddressChange,
}: {
  legalName: string
  eik: string
  vatNo: string
  address: AddressDraft
  showIdsAndEmail: boolean
  legalNameRequired?: boolean
  onLegalNameChange: (value: string) => void
  onEikChange: (value: string) => void
  onVatChange: (value: string) => void
  onAddressChange: (next: AddressDraft) => void
}) {
  const { t } = useTranslation('matters')
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        label={`${t('createFile.fields.legalName')}${legalNameRequired ? ' *' : ''}`}
        className="sm:col-span-2"
      >
        <Input value={legalName} onChange={(e) => onLegalNameChange(e.target.value)} />
      </Field>
      {showIdsAndEmail ? (
        <>
          <Field label={t('createFile.fields.eik')}>
            <Input value={eik} onChange={(e) => onEikChange(e.target.value)} />
          </Field>
          <Field label={t('createFile.fields.vat')}>
            <Input value={vatNo} onChange={(e) => onVatChange(e.target.value)} />
          </Field>
        </>
      ) : null}
      <Field label={t('createFile.fields.city')}>
        <Input
          value={address.city}
          onChange={(e) => onAddressChange({ ...address, city: e.target.value })}
        />
      </Field>
      <Field label={t('createFile.fields.postalCode')}>
        <Input
          value={address.postalCode}
          onChange={(e) =>
            onAddressChange({ ...address, postalCode: e.target.value })
          }
        />
      </Field>
      <Field label={t('createFile.fields.country')}>
        <CountrySelect
          value={address.country}
          onValueChange={(code) => onAddressChange({ ...address, country: code })}
        />
      </Field>
      {showIdsAndEmail ? (
        <Field label={t('createFile.fields.email')}>
          <Input
            type="email"
            value={address.email}
            onChange={(e) =>
              onAddressChange({ ...address, email: e.target.value })
            }
          />
        </Field>
      ) : null}
      <Field label={t('createFile.fields.address')} className="sm:col-span-2">
        <Input
          value={address.address}
          onChange={(e) =>
            onAddressChange({ ...address, address: e.target.value })
          }
        />
      </Field>
    </div>
  )
}

function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  const { t } = useTranslation('matters')
  return (
    <Field label={label}>
      <Select value={value ? 'yes' : 'no'} onValueChange={(v) => onChange(v === 'yes')}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no">{t('createFile.no')}</SelectItem>
          <SelectItem value="yes">{t('createFile.yes')}</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  )
}

const NO_HOLDING_GROUP = '__none__'

function ClientSearchPicker({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (id: string | undefined) => void
}) {
  const { t } = useTranslation('matters')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data } = useClients({
    search: debounced || undefined,
    limit: 8,
    status: 'active',
  })
  const { data: selectedClient } = useClient(value ?? '')

  const options = data?.items ?? []

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
        <span className="font-medium">
          {selectedClient
            ? clientDisplayName(selectedClient)
            : value}
        </span>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => {
            onChange(undefined)
            setSearch('')
          }}
        >
          {t('createFile.clearClient')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('createFile.searchClient')}
      />
      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-background p-1">
        {options.length === 0 ? (
          <li className="px-2 py-3 text-xs text-muted-foreground">
            {t('createFile.noClients')}
          </li>
        ) : (
          options.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => onChange(c.id)}
              >
                {clientDisplayName(c)}
                {c.internalCode ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {c.internalCode}
                  </span>
                ) : null}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export function CreateTrademarkFilePage() {
  const { t } = useTranslation('matters')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const createMatter = useCreateMatter()
  const createClient = useCreateClient()
  const setClientHoldingGroup = useSetClientHoldingGroup()
  const { data: holdingGroups } = useHoldingGroups({ limit: 100 })

  const urlProcedure = normalizeTrademarkProcedure(searchParams.get('procedure'))
  const [step, setStep] = useState<'subtype' | 'form'>(
    urlProcedure ? 'form' : 'subtype',
  )
  const [procedure, setProcedure] = useState<TrademarkProcedure | null>(
    urlProcedure,
  )

  const [clientId, setClientId] = useState<string | undefined>()
  const [applicantClientId, setApplicantClientId] = useState<string | undefined>()
  const [applicantSameAsClient, setApplicantSameAsClient] = useState(
    urlProcedure !== 'opposition' &&
      urlProcedure !== 'cancellation' &&
      urlProcedure !== 'deletion',
  )

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

  const [applicantLegalName, setApplicantLegalName] = useState('')
  const [applicantEik, setApplicantEik] = useState('')
  const [applicantVatNo, setApplicantVatNo] = useState('')
  const [applicantAddress, setApplicantAddress] =
    useState<AddressDraft>(emptyAddress)
  const [additionalApplicants, setAdditionalApplicants] = useState<
    AdditionalApplicantDraft[]
  >([])

  const [markKind, setMarkKind] = useState<MarkKind>('individual')
  const [markType, setMarkType] = useState<CreateFileMarkType>('wordmark')
  const [territory, setTerritory] = useState<TrademarkTerritory>('national')
  const [nationalCountry, setNationalCountry] = useState('BG')
  const [internationalCountries, setInternationalCountries] = useState<string[]>([])
  const [markWords, setMarkWords] = useState('')
  const [markTransliteration, setMarkTransliteration] = useState('')
  const [goodsRows, setGoodsRows] = useState<GoodsServicesRow[]>([
    { classNumber: 35, description: '' },
  ])
  const [viennaClasses, setViennaClasses] = useState<string[]>([''])
  const [applicationNumber, setApplicationNumber] = useState('')
  const [applicationDate, setApplicationDate] = useState('')
  const [conventionPriority, setConventionPriority] = useState(false)
  const [exhibitionPriority, setExhibitionPriority] = useState(false)
  const [transformationInternational, setTransformationInternational] = useState(false)
  const [communityMarkConversion, setCommunityMarkConversion] = useState(false)
  const [applicationBulletinDate, setApplicationBulletinDate] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [registrationDate, setRegistrationDate] = useState('')
  const [registrationBulletinDate, setRegistrationBulletinDate] = useState('')
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [extraDocumentFile, setExtraDocumentFile] = useState<File | null>(null)
  const [specimenFile, setSpecimenFile] = useState<File | null>(null)
  const [grounds, setGrounds] = useState('')
  const [representativeGroupId, setRepresentativeGroupId] = useState(NO_HOLDING_GROUP)
  const [addMoreRepresentatives, setAddMoreRepresentatives] = useState(false)
  const [extraRepresentativeGroupIds, setExtraRepresentativeGroupIds] = useState<string[]>([])
  const [searchFiles, setSearchFiles] = useState<File[]>([])
  const [oppositionFiler, setOppositionFiler] = useState('')
  const [againstClasses, setAgainstClasses] = useState('')
  const [basisMarks, setBasisMarks] = useState<BasisMarkDraft[]>([
    emptyBasisMark(),
  ])
  const [additionalInformation, setAdditionalInformation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: selectedClient } = useClient(clientId ?? '')
  const { data: selectedApplicant } = useClient(applicantClientId ?? '')
  const countryOptions = useMemo(() => getCountryOptions(), [])

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
    if (selectedClient.holdingGroup?.id) {
      setRepresentativeGroupId(selectedClient.holdingGroup.id)
    }
    setOppositionFiler((prev) => prev || clientDisplayName(selectedClient))
  }, [selectedClient])

  useEffect(() => {
    if (!selectedApplicant || applicantSameAsClient) return
    setApplicantLegalName(clientDisplayName(selectedApplicant))
    setApplicantEik(selectedApplicant.registrationNo ?? '')
    setApplicantVatNo(selectedApplicant.vatNo ?? '')
    const reg = selectedApplicant.offices?.find(
      (o) => o.addressType === 'registered_legal',
    )
    if (reg) {
      setApplicantAddress({
        city: reg.city ?? '',
        country: reg.country ?? selectedApplicant.country ?? 'BG',
        postalCode: reg.postalCode ?? '',
        address: [reg.addressLine1, reg.addressLine2].filter(Boolean).join(', '),
        email: selectedApplicant.billingEmail ?? '',
      })
    } else {
      setApplicantAddress((prev) => ({
        ...prev,
        country: selectedApplicant.country ?? prev.country,
        email: selectedApplicant.billingEmail ?? prev.email,
      }))
    }
  }, [selectedApplicant, applicantSameAsClient])

  useEffect(() => {
    const next = normalizeTrademarkProcedure(searchParams.get('procedure'))
    if (!next) return
    setProcedure(next)
    setStep('form')
    setApplicantSameAsClient(
      next !== 'opposition' && next !== 'cancellation' && next !== 'deletion',
    )
    setError(null)
  }, [searchParams])

  const pickSubtype = (value: TrademarkProcedure) => {
    setSearchParams({ procedure: value })
    setProcedure(value)
    setStep('form')
    setError(null)
    setApplicantSameAsClient(
      value !== 'opposition' &&
        value !== 'cancellation' &&
        value !== 'deletion',
    )
  }

  const goToSubtypePicker = () => {
    setSearchParams({})
    setStep('subtype')
    setProcedure(null)
  }

  const jurisdictions = useMemo(() => {
    if (territory === 'national') return nationalCountry ? [nationalCountry] : []
    if (territory === 'eu') return ['EU']
    return internationalCountries.length > 0 ? internationalCountries : ['WO']
  }, [territory, nationalCountry, internationalCountries])

  const toggleInternationalCountry = (code: string) => {
    setInternationalCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  const handleSaveDraft = async () => {
    setError(null)
    if (!procedure) {
      setError(t('createFile.errors.subtype'))
      return
    }
    if (!clientId && !legalName.trim()) {
      setError(t('createFile.errors.clientOrDetails'))
      return
    }
    if (
      !applicantSameAsClient &&
      !applicantClientId &&
      !applicantLegalName.trim() &&
      procedure !== 'opposition' &&
      procedure !== 'cancellation' &&
      procedure !== 'deletion'
    ) {
      setError(t('createFile.errors.applicantOrDetails'))
      return
    }
    if (
      (procedure === 'new' ||
        procedure === 'registered' ||
        procedure === 'objection' ||
        procedure === 'opposition' ||
        procedure === 'cancellation' ||
        procedure === 'deletion') &&
      !markWords.trim()
    ) {
      setError(t('createFile.errors.markWords'))
      return
    }
    if (jurisdictions.length === 0) {
      setError(t('createFile.errors.jurisdiction'))
      return
    }

    const niceClasses = [
      ...new Set(
        goodsRows
          .map((r) => String(r.classNumber))
          .filter(Boolean),
      ),
    ]
    const goodsSummary = goodsRows
      .filter((r) => r.description.trim())
      .map((r) => `Class ${r.classNumber}: ${r.description.trim()}`)
      .join('\n')

    const title = markWords.trim()

    const representativeIds = [
      representativeGroupId !== NO_HOLDING_GROUP ? representativeGroupId : null,
      ...(addMoreRepresentatives ? extraRepresentativeGroupIds : []),
    ].filter((id): id is string => Boolean(id) && id !== NO_HOLDING_GROUP)

    const attributes: Record<string, unknown> = {
      trademarkProcedure: procedure,
      trademarkSide: trademarkSideForProcedure(procedure),
      markKind,
      markType,
      territory,
      markWords: markWords.trim(),
      niceClasses,
      markDescription: goodsSummary || undefined,
      goodsAndServices: goodsRows,
      nationalCountry: territory === 'national' ? nationalCountry : undefined,
      internationalCountries:
        territory === 'international' ? internationalCountries : undefined,
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
      applicantSameAsClient,
      applicantLegalName: applicantSameAsClient
        ? undefined
        : applicantLegalName.trim() || undefined,
      applicantEik: applicantSameAsClient
        ? undefined
        : applicantEik.trim() || undefined,
      applicantVatNo: applicantSameAsClient
        ? undefined
        : applicantVatNo.trim() || undefined,
      applicantAddress: applicantSameAsClient ? undefined : applicantAddress,
      additionalApplicants: additionalApplicants
        .filter((party) => party.legalName.trim())
        .map((party) => ({
          legalName: party.legalName.trim(),
          eik: party.eik.trim() || undefined,
          vatNo: party.vatNo.trim() || undefined,
          address: party.address,
        })),
      markTransliteration: markTransliteration.trim() || undefined,
      viennaClasses: viennaClasses.map((v) => v.trim()).filter(Boolean),
      applicationNumber: applicationNumber.trim() || undefined,
      applicationDate: applicationDate || undefined,
      conventionPriority,
      exhibitionPriority,
      transformationInternational,
      communityMarkConversion,
      applicationBulletinDate: applicationBulletinDate || undefined,
      registrationNumber:
        procedure === 'registered' ||
        procedure === 'cancellation' ||
        procedure === 'deletion'
          ? registrationNumber.trim() || undefined
          : undefined,
      registrationDate:
        procedure === 'registered' ||
        procedure === 'cancellation' ||
        procedure === 'deletion'
          ? registrationDate || undefined
          : undefined,
      registrationBulletinDate:
        procedure === 'registered' ||
        procedure === 'cancellation' ||
        procedure === 'deletion'
          ? registrationBulletinDate || undefined
          : undefined,
      representativeHoldingGroupIds: representativeIds,
      addMoreRepresentatives:
        procedure === 'registered' ? addMoreRepresentatives : false,
      grounds:
        procedure === 'objection' ||
        procedure === 'cancellation' ||
        procedure === 'deletion'
          ? grounds.trim() || undefined
          : undefined,
      oppositionFiler:
        procedure === 'opposition'
          ? oppositionFiler.trim() || legalName.trim() || undefined
          : undefined,
      requester:
        procedure === 'opposition' ||
        procedure === 'cancellation' ||
        procedure === 'deletion'
          ? oppositionFiler.trim() || legalName.trim() || undefined
          : undefined,
      againstClasses:
        procedure === 'opposition' ||
        procedure === 'cancellation' ||
        procedure === 'deletion'
          ? againstClasses.trim() || undefined
          : undefined,
      basisMarks:
        procedure === 'opposition'
          ? basisMarks
              .filter(
                (mark) =>
                  mark.applicationNo.trim() ||
                  mark.name.trim() ||
                  mark.owner.trim(),
              )
              .map((mark) => ({
                applicationNo: mark.applicationNo.trim() || undefined,
                name: mark.name.trim() || undefined,
                applicationDate: mark.applicationDate || undefined,
                classes: mark.classes.trim() || undefined,
                owner: mark.owner.trim() || undefined,
                country: mark.country || undefined,
                hasFile: Boolean(mark.file),
              }))
          : undefined,
      additionalInformation:
        procedure === 'opposition' ||
        procedure === 'cancellation' ||
        procedure === 'deletion'
          ? additionalInformation.trim() || undefined
          : undefined,
      prosecution: { stage: 'prep' },
    }

    try {
      let resolvedClientId = clientId

      if (!resolvedClientId) {
        const billingEmail =
          contactEmail.trim() ||
          registered.email.trim() ||
          undefined
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
          holdingGroupId:
            representativeGroupId !== NO_HOLDING_GROUP
              ? representativeGroupId
              : undefined,
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
            /* contact is best-effort; client + matter still proceed */
          }
        }
      }

      let resolvedApplicantId: string | undefined
      if (!applicantSameAsClient) {
        resolvedApplicantId = applicantClientId
        if (!resolvedApplicantId && applicantLegalName.trim()) {
          const createdApplicant = await createClient.mutateAsync({
            type: 'company',
            companyName: applicantLegalName.trim(),
            registrationNo: applicantEik.trim() || undefined,
            vatNo: applicantVatNo.trim() || undefined,
            country: applicantAddress.country || undefined,
            gdprConsent: true,
            billingName: applicantLegalName.trim(),
            billingEmail: applicantAddress.email.trim() || undefined,
            billingAddressLine1: applicantAddress.address.trim() || undefined,
            billingCity: applicantAddress.city.trim() || undefined,
            billingPostalCode: applicantAddress.postalCode.trim() || undefined,
            billingCountry: applicantAddress.country || undefined,
            notes: 'Created as applicant from Create file',
            registeredLegalAddress: {
              addressLine1: applicantAddress.address.trim() || undefined,
              city: applicantAddress.city.trim() || undefined,
              postalCode: applicantAddress.postalCode.trim() || undefined,
              country: applicantAddress.country || undefined,
            },
          })
          resolvedApplicantId = createdApplicant.id
        }
      }

      const matter = await createMatter.mutateAsync({
        clientId: resolvedClientId,
        applicantClientId:
          applicantSameAsClient || resolvedApplicantId === resolvedClientId
            ? undefined
            : resolvedApplicantId,
        matterType: 'trademark',
        title,
        status: 'draft',
        description: t('createFile.draftDescription', {
          procedure: t(`createFile.procedures.${procedure}`),
        }),
        jurisdictions: jurisdictions.map((countryCode) => ({ countryCode })),
        attributes,
      })

      if (
        clientId &&
        representativeGroupId !== NO_HOLDING_GROUP &&
        selectedClient?.holdingGroup?.id !== representativeGroupId
      ) {
        try {
          await setClientHoldingGroup.mutateAsync({
            clientId: resolvedClientId,
            holdingGroupId: representativeGroupId,
            holdingGroupIdForInvalidate: representativeGroupId,
          })
        } catch {
          /* holding group link is best-effort */
        }
      }

      for (const file of searchFiles) {
        await documentsApi.upload(matter.id, {
          file,
          displayName: file.name,
          category: 'general',
          tags: 'search,create-file',
        })
      }
      if (certificateFile) {
        await documentsApi.upload(matter.id, {
          file: certificateFile,
          displayName: certificateFile.name,
          category: 'certificate',
          tags: 'certificate,create-file',
        })
      }
      if (extraDocumentFile) {
        await documentsApi.upload(matter.id, {
          file: extraDocumentFile,
          displayName: extraDocumentFile.name,
          category: 'general',
          tags: 'create-file',
        })
      }
      if (specimenFile) {
        await documentsApi.upload(matter.id, {
          file: specimenFile,
          displayName: specimenFile.name,
          category: 'evidence',
          tags: 'specimen,create-file',
        })
      }
      if (procedure === 'opposition') {
        for (const mark of basisMarks) {
          if (!mark.file) continue
          await documentsApi.upload(matter.id, {
            file: mark.file,
            displayName: mark.file.name,
            category: 'evidence',
            tags: [
              'basis-mark',
              'create-file',
              mark.applicationNo.trim() || mark.name.trim() || 'opposition',
            ].join(','),
          })
        }
      }

      navigate(`/matters/${matter.id}/overview`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('createFile.errors.saveFailed')))
    }
  }

  if (step === 'subtype') {
    return (
      <div className="mx-auto max-w-4xl space-y-8 pb-10">
        <div>
          <Link
            to="/matters"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-4 px-0')}
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
                {t('createFile.trademarkTitle')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {t('createFile.subtypeHint')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TRADEMARK_PROCEDURES.map((value) => {
            const isDispute =
              value === 'objection' ||
              value === 'opposition' ||
              value === 'cancellation' ||
              value === 'deletion'
            return (
              <button
                key={value}
                type="button"
                onClick={() => pickSubtype(value)}
                className={cn(
                  'rounded-xl border border-border/80 bg-card p-4 text-left transition',
                  isDispute
                    ? 'border-l-[5px] border-l-rose-500 hover:bg-rose-50/60 dark:hover:bg-rose-950/30'
                    : 'border-l-[5px] border-l-emerald-600 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30',
                )}
              >
                <p className="font-medium text-foreground">
                  {t(`createFile.procedures.${value}`)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`createFile.procedureHints.${value}`)}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const isNew = procedure === 'new'
  const isRegistered = procedure === 'registered'
  const isObjection = procedure === 'objection'
  const isOpposition = procedure === 'opposition'
  const isCancellation = procedure === 'cancellation'
  const isDeletion = procedure === 'deletion'
  const isAgainstRegistered = isCancellation || isDeletion
  const isPartySplit = isOpposition || isAgainstRegistered
  const isExistingMark =
    isRegistered || isObjection || isOpposition || isAgainstRegistered
  const showFullForm = isFullTrademarkForm(procedure)

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={goToSubtypePicker}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-2 px-0')}
          >
            <ArrowLeft className="mr-1 size-4" />
            {t('createFile.changeSubtype')}
          </button>
          <h1 className="font-serif text-3xl tracking-tight text-foreground">
            {t('createFile.formTitle')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {procedure ? t(`createFile.procedures.${procedure}`) : null}
            {' · '}
            {isExistingMark ? t('createFile.sections.basicInfo') : t('createFile.preliminary')}
          </p>
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
          <Field label={t('createFile.fields.postalCode')}>
            <Input
              value={registered.postalCode}
              onChange={(e) =>
                setRegistered((a) => ({ ...a, postalCode: e.target.value }))
              }
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

      {isOpposition ? (
        <PartyPanel tone="us" label={t('createFile.sideUs')}>
          <SubSection title={t('createFile.sections.oppositionFiler')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('createFile.fields.oppositionFiler')}>
                <Input
                  value={oppositionFiler}
                  onChange={(e) => setOppositionFiler(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.againstClasses')}>
                <Input
                  value={againstClasses}
                  onChange={(e) => setAgainstClasses(e.target.value)}
                  placeholder="1, 3, 35"
                />
              </Field>
            </div>
          </SubSection>

          <SubSection
            title={t('createFile.sections.basisMarks')}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setBasisMarks((rows) => [...rows, emptyBasisMark()])
                }
              >
                <Plus className="size-4" />
                {t('createFile.addBasisMark')}
              </Button>
            }
          >
            <div className="space-y-3">
              {basisMarks.map((mark, index) => (
                <div
                  key={mark.id}
                  className="rounded-lg border border-border bg-muted/30 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {t('createFile.basisMark', { number: index + 1 })}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={basisMarks.length === 1}
                      onClick={() =>
                        setBasisMarks((rows) =>
                          rows.filter((row) => row.id !== mark.id),
                        )
                      }
                      aria-label={t('createFile.removeBasisMark')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t('createFile.fields.applicationNumber')}>
                      <Input
                        value={mark.applicationNo}
                        onChange={(e) =>
                          setBasisMarks((rows) =>
                            rows.map((row) =>
                              row.id === mark.id
                                ? { ...row, applicationNo: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label={t('createFile.fields.markWords')}>
                      <Input
                        value={mark.name}
                        onChange={(e) =>
                          setBasisMarks((rows) =>
                            rows.map((row) =>
                              row.id === mark.id
                                ? { ...row, name: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label={t('createFile.fields.applicationDate')}>
                      <Input
                        type="date"
                        value={mark.applicationDate}
                        onChange={(e) =>
                          setBasisMarks((rows) =>
                            rows.map((row) =>
                              row.id === mark.id
                                ? { ...row, applicationDate: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label={t('createFile.fields.classes')}>
                      <Input
                        value={mark.classes}
                        onChange={(e) =>
                          setBasisMarks((rows) =>
                            rows.map((row) =>
                              row.id === mark.id
                                ? { ...row, classes: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label={t('createFile.fields.owner')}>
                      <Input
                        value={mark.owner}
                        onChange={(e) =>
                          setBasisMarks((rows) =>
                            rows.map((row) =>
                              row.id === mark.id
                                ? { ...row, owner: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label={t('createFile.fields.country')}>
                      <CountrySelect
                        value={mark.country}
                        onValueChange={(code) =>
                          setBasisMarks((rows) =>
                            rows.map((row) =>
                              row.id === mark.id
                                ? { ...row, country: code }
                                : row,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field
                      label={t('createFile.fields.attachDocument')}
                      className="sm:col-span-2"
                    >
                      <Input
                        type="file"
                        onChange={(e) =>
                          setBasisMarks((rows) =>
                            rows.map((row) =>
                              row.id === mark.id
                                ? { ...row, file: e.target.files?.[0] ?? null }
                                : row,
                            ),
                          )
                        }
                      />
                      {mark.file ? (
                        <p className="text-xs text-muted-foreground">
                          {mark.file.name}
                        </p>
                      ) : null}
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SubSection>
        </PartyPanel>
      ) : null}

      {isAgainstRegistered ? (
        <PartyPanel
          tone="us"
          label={
            isDeletion
              ? t('createFile.sideUsDeletion')
              : t('createFile.sideUsCancellation')
          }
        >
          <SubSection
            title={
              isDeletion
                ? t('createFile.sections.requestFiler')
                : t('createFile.sections.requester')
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={
                  isDeletion
                    ? t('createFile.fields.requestFiler')
                    : t('createFile.fields.requester')
                }
              >
                <Input
                  value={oppositionFiler}
                  onChange={(e) => setOppositionFiler(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.againstClasses')}>
                <Input
                  value={againstClasses}
                  onChange={(e) => setAgainstClasses(e.target.value)}
                  placeholder="1, 3, 35"
                />
              </Field>
            </div>
          </SubSection>
          <SubSection
            title={
              isDeletion
                ? t('createFile.sections.grounds')
                : t('createFile.sections.foundation')
            }
          >
            <Textarea
              rows={6}
              value={grounds}
              onChange={(e) => setGrounds(e.target.value)}
            />
          </SubSection>
        </PartyPanel>
      ) : null}

      {!isPartySplit ? (
      <SectionCard
        title={
          isRegistered
            ? t('createFile.sections.owner')
            : t('createFile.sections.applicant')
        }
      >
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={applicantSameAsClient}
            onChange={(e) => {
              setApplicantSameAsClient(e.target.checked)
              if (e.target.checked) setApplicantClientId(undefined)
            }}
            className="size-4 rounded border"
          />
          {t('createFile.sameApplicant')}
        </label>
        {!applicantSameAsClient ? (
          <div className="space-y-4">
            {!isObjection ? (
              <>
                <Field label={t('createFile.fields.applicantClientOptional')}>
                  <ClientSearchPicker
                    value={applicantClientId}
                    onChange={setApplicantClientId}
                  />
                </Field>
                {!applicantClientId ? (
                  <p className="text-xs text-muted-foreground">
                    {t('createFile.applicantOptionalHint')}
                  </p>
                ) : null}
              </>
            ) : null}
            <ApplicantPartyFields
              legalName={applicantLegalName}
              eik={applicantEik}
              vatNo={applicantVatNo}
              address={applicantAddress}
              showIdsAndEmail={!isExistingMark}
              legalNameRequired={!applicantClientId}
              onLegalNameChange={setApplicantLegalName}
              onEikChange={setApplicantEik}
              onVatChange={setApplicantVatNo}
              onAddressChange={setApplicantAddress}
            />
          </div>
        ) : null}

        {additionalApplicants.length > 0 ? (
          <div className="mt-4 space-y-4">
            {additionalApplicants.map((party, index) => (
              <div
                key={party.id}
                className="rounded-lg border bg-muted/20 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {isRegistered
                      ? t('createFile.additionalOwner', { number: index + 2 })
                      : t('createFile.additionalApplicant', { number: index + 2 })}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setAdditionalApplicants((rows) =>
                        rows.filter((row) => row.id !== party.id),
                      )
                    }
                    aria-label={t('createFile.removeApplicant')}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <ApplicantPartyFields
                  legalName={party.legalName}
                  eik={party.eik}
                  vatNo={party.vatNo}
                  address={party.address}
                  showIdsAndEmail={!isExistingMark}
                  onLegalNameChange={(value) =>
                    setAdditionalApplicants((rows) =>
                      rows.map((row) =>
                        row.id === party.id ? { ...row, legalName: value } : row,
                      ),
                    )
                  }
                  onEikChange={(value) =>
                    setAdditionalApplicants((rows) =>
                      rows.map((row) =>
                        row.id === party.id ? { ...row, eik: value } : row,
                      ),
                    )
                  }
                  onVatChange={(value) =>
                    setAdditionalApplicants((rows) =>
                      rows.map((row) =>
                        row.id === party.id ? { ...row, vatNo: value } : row,
                      ),
                    )
                  }
                  onAddressChange={(address) =>
                    setAdditionalApplicants((rows) =>
                      rows.map((row) =>
                        row.id === party.id ? { ...row, address } : row,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 gap-1"
          onClick={() =>
            setAdditionalApplicants((rows) => [...rows, emptyApplicant()])
          }
        >
          <Plus className="size-4" />
          {isRegistered
            ? t('createFile.addAdditionalOwner')
            : t('createFile.addAdditionalApplicant')}
        </Button>
      </SectionCard>
      ) : null}

      {showFullForm ? (
        <>
          <SectionCard
            title={
              isAgainstRegistered
                ? t('createFile.sections.againstBrand')
                : isObjection || isOpposition
                  ? t('createFile.sections.againstApplication')
                  : t('createFile.sections.trademark')
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t('createFile.fields.markKind')}>
                <Select
                  value={markKind}
                  onValueChange={(v) => setMarkKind(v as MarkKind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARK_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`createFile.markKinds.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('createFile.fields.markType')}>
                <Select
                  value={markType}
                  onValueChange={(v) => setMarkType(v as CreateFileMarkType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARK_TYPES.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`createFile.markTypes.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('createFile.fields.territory')}>
                <Select
                  value={territory}
                  onValueChange={(v) => setTerritory(v as TrademarkTerritory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRITORIES.map((k) => (
                      <SelectItem key={k} value={k}>
                        {t(`createFile.territories.${k}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {territory === 'national' ? (
              <div className="mt-4">
                <Field label={t('createFile.fields.country')}>
                  <CountrySelect
                    value={nationalCountry}
                    onValueChange={setNationalCountry}
                  />
                </Field>
              </div>
            ) : null}

            {territory === 'eu' ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {t('createFile.euHint')}
              </p>
            ) : null}

            {territory === 'international' ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('createFile.selectCountries')}
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {countryOptions.map((c) => (
                      <label
                        key={c.code}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={internationalCountries.includes(c.code)}
                          onChange={() => toggleInternationalCountry(c.code)}
                          className="size-4 rounded border"
                        />
                        <span>
                          {c.name}{' '}
                          <span className="text-muted-foreground">({c.code})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                {internationalCountries.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {internationalCountries
                      .map((code) => getCountryLabel(code))
                      .join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title={t('createFile.sections.markName')}>
            <div className={cn('grid gap-3', isExistingMark && 'sm:grid-cols-2')}>
              <Field label={t('createFile.fields.markWords')}>
                <Input
                  value={markWords}
                  onChange={(e) => setMarkWords(e.target.value)}
                  placeholder="e.g. Coca-Cola"
                />
              </Field>
              {isExistingMark ? (
                <Field label={t('createFile.fields.transliteration')}>
                  <Input
                    value={markTransliteration}
                    onChange={(e) => setMarkTransliteration(e.target.value)}
                  />
                </Field>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title={t('createFile.sections.goods')}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  setGoodsRows((rows) => [
                    ...rows,
                    { classNumber: 1, description: '' },
                  ])
                }
              >
                <Plus className="size-4" />
                {t('createFile.addClass')}
              </Button>
            }
          >
            <div className="space-y-3">
              {goodsRows.map((row, index) => (
                <div
                  key={`${row.classNumber}-${index}`}
                  className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[120px_1fr_auto]"
                >
                  <Field label={t('createFile.fields.classNumber')}>
                    <Select
                      value={String(row.classNumber)}
                      onValueChange={(v) =>
                        setGoodsRows((rows) =>
                          rows.map((r, i) =>
                            i === index
                              ? { ...r, classNumber: Number(v) }
                              : r,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NICE_CLASS_NUMBERS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t('createFile.fields.goodsText')}>
                    <Textarea
                      rows={2}
                      value={row.description}
                      onChange={(e) =>
                        setGoodsRows((rows) =>
                          rows.map((r, i) =>
                            i === index
                              ? { ...r, description: e.target.value }
                              : r,
                          ),
                        )
                      }
                      placeholder={t('createFile.goodsPlaceholder')}
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={goodsRows.length === 1}
                      onClick={() =>
                        setGoodsRows((rows) => rows.filter((_, i) => i !== index))
                      }
                      aria-label={t('createFile.removeClass')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {isNew ? (
            <SectionCard title={t('createFile.sections.searchDocs')}>
              <div className="flex flex-wrap gap-2">
                {SEARCH_LINKS.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'gap-1.5',
                    )}
                  >
                    {link.label}
                    <ExternalLink className="size-3.5 opacity-70" />
                  </a>
                ))}
              </div>
              <div className="mt-4">
                <Input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setSearchFiles(Array.from(e.target.files ?? []))
                  }
                />
                {searchFiles.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {searchFiles.map((f) => (
                      <li key={`${f.name}-${f.size}`}>{f.name}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {isExistingMark ? (
            <>
              <SectionCard
                title={t('createFile.sections.vienna')}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setViennaClasses((rows) => [...rows, ''])}
                  >
                    <Plus className="size-4" />
                    {t('createFile.addClass')}
                  </Button>
                }
              >
                <div className="space-y-3">
                  {viennaClasses.map((value, index) => (
                    <div
                      key={`vienna-${index}`}
                      className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[1fr_auto]"
                    >
                      <Field label={t('createFile.fields.viennaNumber')}>
                        <Input
                          value={value}
                          onChange={(e) =>
                            setViennaClasses((rows) =>
                              rows.map((row, i) =>
                                i === index ? e.target.value : row,
                              ),
                            )
                          }
                        />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={viennaClasses.length === 1}
                          onClick={() =>
                            setViennaClasses((rows) =>
                              rows.filter((_, i) => i !== index),
                            )
                          }
                          aria-label={t('createFile.removeClass')}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title={
                  isRegistered || isAgainstRegistered
                    ? t('createFile.sections.filing')
                    : t('createFile.sections.application')
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('createFile.fields.applicationNumber')}>
                    <Input
                      value={applicationNumber}
                      onChange={(e) => setApplicationNumber(e.target.value)}
                    />
                  </Field>
                  <Field label={t('createFile.fields.applicationDate')}>
                    <Input
                      type="date"
                      value={applicationDate}
                      onChange={(e) => setApplicationDate(e.target.value)}
                    />
                  </Field>
                  <YesNoField
                    label={t('createFile.fields.conventionPriority')}
                    value={conventionPriority}
                    onChange={setConventionPriority}
                  />
                  <YesNoField
                    label={t('createFile.fields.exhibitionPriority')}
                    value={exhibitionPriority}
                    onChange={setExhibitionPriority}
                  />
                  <YesNoField
                    label={t('createFile.fields.transformationInternational')}
                    value={transformationInternational}
                    onChange={setTransformationInternational}
                  />
                  <YesNoField
                    label={t('createFile.fields.communityConversion')}
                    value={communityMarkConversion}
                    onChange={setCommunityMarkConversion}
                  />
                  <Field label={t('createFile.fields.applicationBulletin')}>
                    <Input
                      type="date"
                      value={applicationBulletinDate}
                      onChange={(e) => setApplicationBulletinDate(e.target.value)}
                    />
                  </Field>
                  {isRegistered || isAgainstRegistered ? (
                    <>
                      <Field label={t('createFile.fields.registrationNumber')}>
                        <Input
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                        />
                      </Field>
                      <Field label={t('createFile.fields.registrationDate')}>
                        <Input
                          type="date"
                          value={registrationDate}
                          onChange={(e) => setRegistrationDate(e.target.value)}
                        />
                      </Field>
                      <Field label={t('createFile.fields.registrationBulletin')}>
                        <Input
                          type="date"
                          value={registrationBulletinDate}
                          onChange={(e) =>
                            setRegistrationBulletinDate(e.target.value)
                          }
                        />
                      </Field>
                    </>
                  ) : null}
                </div>
              </SectionCard>

              {isRegistered ? (
                <>
                  <SectionCard title={t('createFile.sections.attachments')}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t('createFile.fields.certificate')}>
                        <Input
                          type="file"
                          onChange={(e) =>
                            setCertificateFile(e.target.files?.[0] ?? null)
                          }
                        />
                        {certificateFile ? (
                          <p className="text-xs text-muted-foreground">
                            {certificateFile.name}
                          </p>
                        ) : null}
                      </Field>
                      <Field label={t('createFile.fields.attachDocument')}>
                        <Input
                          type="file"
                          onChange={(e) =>
                            setExtraDocumentFile(e.target.files?.[0] ?? null)
                          }
                        />
                        {extraDocumentFile ? (
                          <p className="text-xs text-muted-foreground">
                            {extraDocumentFile.name}
                          </p>
                        ) : null}
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard title={t('createFile.sections.representatives')}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={t('createFile.fields.representative')}>
                        <Select
                          value={representativeGroupId}
                          onValueChange={(v) =>
                            setRepresentativeGroupId(v ?? NO_HOLDING_GROUP)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('createFile.fields.representative')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_HOLDING_GROUP}>
                              {t('createFile.none')}
                            </SelectItem>
                            {holdingGroups?.items.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <YesNoField
                        label={t('createFile.fields.addMoreRepresentatives')}
                        value={addMoreRepresentatives}
                        onChange={(next) => {
                          setAddMoreRepresentatives(next)
                          if (!next) setExtraRepresentativeGroupIds([])
                        }}
                      />
                    </div>
                    {addMoreRepresentatives ? (
                      <div className="mt-4 space-y-3">
                        {extraRepresentativeGroupIds.map((id, index) => (
                          <div
                            key={`extra-rep-${index}`}
                            className="grid gap-2 sm:grid-cols-[1fr_auto]"
                          >
                            <Field label={t('createFile.fields.representative')}>
                              <Select
                                value={id || NO_HOLDING_GROUP}
                                onValueChange={(v) =>
                                  setExtraRepresentativeGroupIds((rows) =>
                                    rows.map((row, i) =>
                                      i === index
                                        ? (v ?? NO_HOLDING_GROUP)
                                        : row,
                                    ),
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NO_HOLDING_GROUP}>
                                    {t('createFile.none')}
                                  </SelectItem>
                                  {holdingGroups?.items.map((group) => (
                                    <SelectItem key={group.id} value={group.id}>
                                      {group.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setExtraRepresentativeGroupIds((rows) =>
                                    rows.filter((_, i) => i !== index),
                                  )
                                }
                                aria-label={t('createFile.removeClass')}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            setExtraRepresentativeGroupIds((rows) => [
                              ...rows,
                              NO_HOLDING_GROUP,
                            ])
                          }
                        >
                          <Plus className="size-4" />
                          {t('createFile.fields.addMoreRepresentatives')}
                        </Button>
                      </div>
                    ) : null}
                  </SectionCard>
                </>
              ) : null}

              {isObjection ? (
                <>
                  <SectionCard title={t('createFile.sections.representative')}>
                    <Field label={t('createFile.fields.representative')}>
                      <Select
                        value={representativeGroupId}
                        onValueChange={(v) =>
                          setRepresentativeGroupId(v ?? NO_HOLDING_GROUP)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('createFile.fields.representative')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_HOLDING_GROUP}>
                            {t('createFile.none')}
                          </SelectItem>
                          {holdingGroups?.items.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </SectionCard>

                  <SectionCard title={t('createFile.sections.grounds')}>
                    <Textarea
                      rows={6}
                      value={grounds}
                      onChange={(e) => setGrounds(e.target.value)}
                    />
                  </SectionCard>

                  <SectionCard title={t('createFile.sections.specimen')}>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        setSpecimenFile(e.target.files?.[0] ?? null)
                      }
                    />
                    {specimenFile ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {specimenFile.name}
                      </p>
                    ) : null}
                  </SectionCard>
                </>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <SectionCard title={t('createFile.sections.markName')}>
          <Field label={t('createFile.fields.markWords')}>
            <Input
              value={markWords}
              onChange={(e) => setMarkWords(e.target.value)}
              placeholder={t('createFile.optionalMark')}
            />
          </Field>
        </SectionCard>
      )}

      {isPartySplit ? (
        <PartyPanel
          tone="them"
          label={
            isAgainstRegistered
              ? t('createFile.sideThemCancellation')
              : t('createFile.sideThem')
          }
        >
          <SubSection
            title={
              isAgainstRegistered
                ? t('createFile.sections.owner')
                : t('createFile.sections.applicant')
            }
          >
            <ApplicantPartyFields
              legalName={applicantLegalName}
              eik={applicantEik}
              vatNo={applicantVatNo}
              address={applicantAddress}
              showIdsAndEmail={false}
              onLegalNameChange={setApplicantLegalName}
              onEikChange={setApplicantEik}
              onVatChange={setApplicantVatNo}
              onAddressChange={setApplicantAddress}
            />
            {additionalApplicants.length > 0 ? (
              <div className="mt-3 space-y-3">
                {additionalApplicants.map((party, index) => (
                  <div
                    key={party.id}
                    className="rounded-lg border border-border bg-muted/30 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {isAgainstRegistered
                          ? t('createFile.additionalOwner', {
                              number: index + 2,
                            })
                          : t('createFile.additionalApplicant', {
                              number: index + 2,
                            })}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setAdditionalApplicants((rows) =>
                            rows.filter((row) => row.id !== party.id),
                          )
                        }
                        aria-label={t('createFile.removeApplicant')}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <ApplicantPartyFields
                      legalName={party.legalName}
                      eik={party.eik}
                      vatNo={party.vatNo}
                      address={party.address}
                      showIdsAndEmail={false}
                      onLegalNameChange={(value) =>
                        setAdditionalApplicants((rows) =>
                          rows.map((row) =>
                            row.id === party.id
                              ? { ...row, legalName: value }
                              : row,
                          ),
                        )
                      }
                      onEikChange={(value) =>
                        setAdditionalApplicants((rows) =>
                          rows.map((row) =>
                            row.id === party.id ? { ...row, eik: value } : row,
                          ),
                        )
                      }
                      onVatChange={(value) =>
                        setAdditionalApplicants((rows) =>
                          rows.map((row) =>
                            row.id === party.id ? { ...row, vatNo: value } : row,
                          ),
                        )
                      }
                      onAddressChange={(address) =>
                        setAdditionalApplicants((rows) =>
                          rows.map((row) =>
                            row.id === party.id ? { ...row, address } : row,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-1"
              onClick={() =>
                setAdditionalApplicants((rows) => [...rows, emptyApplicant()])
              }
            >
              <Plus className="size-4" />
              {isAgainstRegistered
                ? t('createFile.addAdditionalOwner')
                : t('createFile.addAdditionalApplicant')}
            </Button>
          </SubSection>

          <SubSection title={t('createFile.sections.representative')}>
            <Select
              value={representativeGroupId}
              onValueChange={(v) =>
                setRepresentativeGroupId(v ?? NO_HOLDING_GROUP)
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t('createFile.fields.representative')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_HOLDING_GROUP}>
                  {t('createFile.none')}
                </SelectItem>
                {holdingGroups?.items.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SubSection>
        </PartyPanel>
      ) : null}

      {isPartySplit ? (
        <SectionCard title={t('createFile.sections.additionalInfo')}>
          <Textarea
            rows={6}
            value={additionalInformation}
            onChange={(e) => setAdditionalInformation(e.target.value)}
          />
        </SectionCard>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <Button
          type="button"
          variant="outline"
          onClick={goToSubtypePicker}
        >
          {t('createFile.cancel')}
        </Button>
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
