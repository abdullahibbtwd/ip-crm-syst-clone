import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FilePlus2,
  Plus,
  Search,
  Trash2,
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
    <section className="rounded-xl border border-border/80 bg-card/80 p-5 shadow-sm">
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
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

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
  const createMatter = useCreateMatter()
  const createClient = useCreateClient()

  const [step, setStep] = useState<'subtype' | 'form'>('subtype')
  const [procedure, setProcedure] = useState<TrademarkProcedure | null>(null)

  const [clientId, setClientId] = useState<string | undefined>()
  const [applicantClientId, setApplicantClientId] = useState<string | undefined>()
  const [applicantSameAsClient, setApplicantSameAsClient] = useState(true)

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

  const [markKind, setMarkKind] = useState<MarkKind>('individual')
  const [markType, setMarkType] = useState<CreateFileMarkType>('wordmark')
  const [territory, setTerritory] = useState<TrademarkTerritory>('national')
  const [nationalCountry, setNationalCountry] = useState('BG')
  const [internationalCountries, setInternationalCountries] = useState<string[]>([])
  const [markWords, setMarkWords] = useState('')
  const [goodsRows, setGoodsRows] = useState<GoodsServicesRow[]>([
    { classNumber: 35, description: '' },
  ])
  const [searchFiles, setSearchFiles] = useState<File[]>([])
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

  const pickSubtype = (value: TrademarkProcedure) => {
    setProcedure(value)
    setStep('form')
    setError(null)
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
      !applicantLegalName.trim()
    ) {
      setError(t('createFile.errors.applicantOrDetails'))
      return
    }
    if (procedure === 'new' && !markWords.trim()) {
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

    const title =
      procedure === 'new'
        ? markWords.trim()
        : `${t(`createFile.procedures.${procedure}`)} — ${legalName.trim() || (selectedClient ? clientDisplayName(selectedClient) : 'Trademark')}`

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
        if (!resolvedApplicantId) {
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

      for (const file of searchFiles) {
        await documentsApi.upload(matter.id, {
          file,
          displayName: file.name,
          category: 'general',
          tags: 'search,create-file',
        })
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
            const side = trademarkSideForProcedure(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => pickSubtype(value)}
                className={cn(
                  'rounded-xl border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-primary/5',
                  value === 'new' && 'border-primary/40 ring-1 ring-primary/20',
                  side === 'us' && 'border-l-4 border-l-sky-500',
                  side === 'them' && 'border-l-4 border-l-rose-500',
                )}
              >
                <p className="font-medium text-foreground">
                  {t(`createFile.procedures.${value}`)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`createFile.procedureHints.${value}`)}
                </p>
                {value === 'new' ? (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    <Check className="size-3" />
                    {t('createFile.fullFormReady')}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const isNew = procedure === 'new'

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => {
              setStep('subtype')
              setProcedure(null)
            }}
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
            {t('createFile.preliminary')}
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

      <SectionCard title={t('createFile.sections.applicant')}>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label={`${t('createFile.fields.legalName')}${!applicantClientId ? ' *' : ''}`}
                className="sm:col-span-2"
              >
                <Input
                  value={applicantLegalName}
                  onChange={(e) => setApplicantLegalName(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.eik')}>
                <Input
                  value={applicantEik}
                  onChange={(e) => setApplicantEik(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.vat')}>
                <Input
                  value={applicantVatNo}
                  onChange={(e) => setApplicantVatNo(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.city')}>
                <Input
                  value={applicantAddress.city}
                  onChange={(e) =>
                    setApplicantAddress((a) => ({ ...a, city: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('createFile.fields.postalCode')}>
                <Input
                  value={applicantAddress.postalCode}
                  onChange={(e) =>
                    setApplicantAddress((a) => ({
                      ...a,
                      postalCode: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={t('createFile.fields.country')}>
                <CountrySelect
                  value={applicantAddress.country}
                  onValueChange={(code) =>
                    setApplicantAddress((a) => ({ ...a, country: code }))
                  }
                />
              </Field>
              <Field label={t('createFile.fields.email')}>
                <Input
                  type="email"
                  value={applicantAddress.email}
                  onChange={(e) =>
                    setApplicantAddress((a) => ({ ...a, email: e.target.value }))
                  }
                />
              </Field>
              <Field label={t('createFile.fields.address')} className="sm:col-span-2">
                <Input
                  value={applicantAddress.address}
                  onChange={(e) =>
                    setApplicantAddress((a) => ({
                      ...a,
                      address: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
          </div>
        ) : null}
      </SectionCard>

      {isNew ? (
        <>
          <SectionCard title={t('createFile.sections.trademark')}>
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
            <Field label={t('createFile.fields.markWords')}>
              <Input
                value={markWords}
                onChange={(e) => setMarkWords(e.target.value)}
                placeholder="e.g. Coca-Cola"
              />
            </Field>
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

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStep('subtype')
            setProcedure(null)
          }}
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
