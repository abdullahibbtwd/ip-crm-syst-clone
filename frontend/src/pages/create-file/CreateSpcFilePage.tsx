import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ExternalLink,
  FilePlus2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { documentsApi } from '@/features/documents/api'
import { useClient, useCreateClient } from '@/features/crm/hooks/useClients'
import {
  useHoldingGroups,
  useSetClientHoldingGroup,
} from '@/features/crm/hooks/useHoldingGroups'
import { contactsApi } from '@/features/crm/api'
import { clientDisplayName } from '@/features/crm/utils'
import { useCreateMatter } from '@/features/matters/hooks/useMatters'
import { COMMERCIAL_REGISTER_URL } from '@/features/create-file/trademark-subtypes'
import {
  ApplicantPartyFields,
  ClientSearchPicker,
  Field,
  NO_HOLDING_GROUP,
  SectionCard,
  YesNoField,
  emptyAddress,
  nextId,
  type AddressDraft,
} from '@/features/create-file/create-file-form'
import {
  type PatentClaimRow,
  type SpecimenSlot,
} from '@/features/create-file/patent-subtypes'
import { getApiErrorMessage } from '@/lib/api-client'
import { getCountryOptions } from '@/lib/countries'
import { cn } from '@/lib/utils'

const emptyClaim = (index: number): PatentClaimRow => ({
  id: nextId('claim'),
  number: String(index),
  text: '',
})

const emptySpecimen = (): SpecimenSlot => ({
  id: nextId('specimen'),
  file: null,
})

export function CreateSpcFilePage() {
  const { t } = useTranslation('matters')
  const navigate = useNavigate()
  const createMatter = useCreateMatter()
  const createClient = useCreateClient()
  const setClientHoldingGroup = useSetClientHoldingGroup()
  const { data: holdingGroups } = useHoldingGroups({ limit: 100 })

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

  const [ownerSameAsClient, setOwnerSameAsClient] = useState(true)
  const [ownerLegalName, setOwnerLegalName] = useState('')
  const [ownerAddress, setOwnerAddress] = useState<AddressDraft>(emptyAddress)

  const [inventorSameAsClient, setInventorSameAsClient] = useState(true)
  const [inventorName, setInventorName] = useState('')
  const [inventorAddress, setInventorAddress] = useState<AddressDraft>(emptyAddress)

  const [filingCountry, setFilingCountry] = useState('')
  const [specimenSlots, setSpecimenSlots] = useState<SpecimenSlot[]>([
    emptySpecimen(),
  ])
  const [spcName, setSpcName] = useState('')
  const [medicinalProduct, setMedicinalProduct] = useState('')
  const [basicPatentNumber, setBasicPatentNumber] = useState('')
  const [effectStartDate, setEffectStartDate] = useState('')
  const [effectEndDate, setEffectEndDate] = useState('')
  const [firstAuthorizationNumber, setFirstAuthorizationNumber] = useState('')
  const [firstAuthorizationDate, setFirstAuthorizationDate] = useState('')
  const [claims, setClaims] = useState<PatentClaimRow[]>([emptyClaim(1)])
  const [ipcClasses, setIpcClasses] = useState<string[]>([''])

  const [applicationNumber, setApplicationNumber] = useState('')
  const [applicationDate, setApplicationDate] = useState('')
  const [conventionPriority, setConventionPriority] = useState(false)
  const [priorityCountry, setPriorityCountry] = useState('')
  const [priorityFromDate, setPriorityFromDate] = useState('')
  const [priorityApplicationNumber, setPriorityApplicationNumber] = useState('')
  const [exhibitionPriority, setExhibitionPriority] = useState(false)
  const [exhibitionFirstAppearanceDate, setExhibitionFirstAppearanceDate] =
    useState('')
  const [exhibitionName, setExhibitionName] = useState('')
  const [conversionFromPatent, setConversionFromPatent] = useState(false)
  const [conversionInvention, setConversionInvention] = useState('')
  const [conversionRequestNumber, setConversionRequestNumber] = useState('')
  const [conversionApplicationDate, setConversionApplicationDate] = useState('')
  const [conversionPriorityDate, setConversionPriorityDate] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [registrationDate, setRegistrationDate] = useState('')
  const [registrationBulletin, setRegistrationBulletin] = useState('')
  const [registrationBulletinDate, setRegistrationBulletinDate] = useState('')

  const [attachmentFile1, setAttachmentFile1] = useState<File | null>(null)
  const [attachmentFile2, setAttachmentFile2] = useState<File | null>(null)
  const [representativeGroupId, setRepresentativeGroupId] = useState(NO_HOLDING_GROUP)
  const [addMoreRepresentatives, setAddMoreRepresentatives] = useState(false)
  const [extraRepresentativeGroupIds, setExtraRepresentativeGroupIds] = useState<
    string[]
  >([])
  const [error, setError] = useState<string | null>(null)

  const { data: selectedClient } = useClient(clientId ?? '')
  const countryOptions = useMemo(() => getCountryOptions(), [])
  const allCountriesAlpha = useMemo(
    () =>
      [...countryOptions].sort((a, b) => a.name.localeCompare(b.name, 'en')),
    [countryOptions],
  )

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
  }, [selectedClient])

  const jurisdictions = useMemo(
    () => (filingCountry ? [filingCountry] : []),
    [filingCountry],
  )

  const handleSaveDraft = async () => {
    setError(null)
    if (!clientId && !legalName.trim()) {
      setError(t('createFile.errors.clientOrDetails'))
      return
    }
    if (!ownerSameAsClient && !ownerLegalName.trim()) {
      setError(t('createFile.errors.ownerOrDetails'))
      return
    }
    if (!inventorSameAsClient && !inventorName.trim()) {
      setError(t('createFile.errors.inventorOrDetails'))
      return
    }
    if (!filingCountry) {
      setError(t('createFile.errors.jurisdiction'))
      return
    }
    if (!spcName.trim()) {
      setError(t('createFile.errors.spcName'))
      return
    }

    const representativeIds = [
      representativeGroupId !== NO_HOLDING_GROUP ? representativeGroupId : null,
      ...(addMoreRepresentatives ? extraRepresentativeGroupIds : []),
    ].filter((id): id is string => Boolean(id) && id !== NO_HOLDING_GROUP)

    const ipc = ipcClasses.map((v) => v.trim()).filter(Boolean)
    const claimsPayload = claims
      .map((row) => ({
        number: row.number.trim(),
        text: row.text.trim(),
      }))
      .filter((row) => row.number || row.text)
    const claimsSummary = claimsPayload
      .map((row) =>
        [row.number, row.text].filter(Boolean).join('. '),
      )
      .join('\n')

    const attributes: Record<string, unknown> = {
      spc: true,
      patentProcedure: 'spc',
      spcName: spcName.trim(),
      patentName: spcName.trim(),
      medicinalProduct: medicinalProduct.trim() || undefined,
      basicPatentNumber: basicPatentNumber.trim() || undefined,
      effectStartDate: effectStartDate || undefined,
      effectEndDate: effectEndDate || undefined,
      firstAuthorizationNumber: firstAuthorizationNumber.trim() || undefined,
      firstAuthorizationDate: firstAuthorizationDate || undefined,
      claims: claimsPayload,
      claimsCount: claimsPayload.length || undefined,
      claimsSummary: claimsSummary || undefined,
      ipcClasses: ipc,
      technicalField: ipc.join(', ') || undefined,
      applicationNumber: applicationNumber.trim() || undefined,
      applicationDate: applicationDate || undefined,
      conventionPriority,
      priorityCountry:
        conventionPriority && priorityCountry ? priorityCountry : undefined,
      priorityFromDate: conventionPriority ? priorityFromDate || undefined : undefined,
      priorityApplicationNumber:
        conventionPriority && priorityApplicationNumber.trim()
          ? priorityApplicationNumber.trim()
          : undefined,
      exhibitionPriority,
      exhibitionFirstAppearanceDate: exhibitionPriority
        ? exhibitionFirstAppearanceDate || undefined
        : undefined,
      exhibitionName:
        exhibitionPriority && exhibitionName.trim()
          ? exhibitionName.trim()
          : undefined,
      conversionFromPatent,
      conversionInvention:
        conversionFromPatent && conversionInvention.trim()
          ? conversionInvention.trim()
          : undefined,
      conversionRequestNumber:
        conversionFromPatent && conversionRequestNumber.trim()
          ? conversionRequestNumber.trim()
          : undefined,
      conversionApplicationDate: conversionFromPatent
        ? conversionApplicationDate || undefined
        : undefined,
      conversionPriorityDate: conversionFromPatent
        ? conversionPriorityDate || undefined
        : undefined,
      priorityDate: conversionFromPatent
        ? conversionPriorityDate || undefined
        : conventionPriority
          ? priorityFromDate || undefined
          : undefined,
      registrationNumber: registrationNumber.trim() || undefined,
      registrationDate: registrationDate || undefined,
      registrationBulletin: registrationBulletin.trim() || undefined,
      registrationBulletinDate: registrationBulletinDate || undefined,
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
      ownerSameAsClient,
      ownerLegalName: ownerSameAsClient
        ? undefined
        : ownerLegalName.trim() || undefined,
      ownerAddress: ownerSameAsClient ? undefined : ownerAddress,
      inventorSameAsClient,
      inventorName: inventorSameAsClient
        ? undefined
        : inventorName.trim() || undefined,
      inventorAddress: inventorSameAsClient ? undefined : inventorAddress,
      filingCountry,
      representativeHoldingGroupIds: representativeIds,
      addMoreRepresentatives,
      prosecution: {
        stage: registrationNumber.trim()
          ? 'registration'
          : applicationNumber.trim()
            ? 'filing'
            : 'prep',
        applicationNumber: applicationNumber.trim() || undefined,
        applicationDate: applicationDate || undefined,
        bulletinNumber: registrationBulletin.trim() || undefined,
        bulletinDate: registrationBulletinDate || undefined,
      },
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
            /* contact is best-effort */
          }
        }
      }

      let resolvedOwnerId: string | undefined
      if (!ownerSameAsClient && ownerLegalName.trim()) {
        const createdOwner = await createClient.mutateAsync({
          type: 'company',
          companyName: ownerLegalName.trim(),
          country: ownerAddress.country || undefined,
          gdprConsent: true,
          billingName: ownerLegalName.trim(),
          billingAddressLine1: ownerAddress.address.trim() || undefined,
          billingCity: ownerAddress.city.trim() || undefined,
          billingPostalCode: ownerAddress.postalCode.trim() || undefined,
          billingCountry: ownerAddress.country || undefined,
          notes: 'Created as SPC owner from Create file',
          registeredLegalAddress: {
            addressLine1: ownerAddress.address.trim() || undefined,
            city: ownerAddress.city.trim() || undefined,
            postalCode: ownerAddress.postalCode.trim() || undefined,
            country: ownerAddress.country || undefined,
          },
        })
        resolvedOwnerId = createdOwner.id
      }

      const matter = await createMatter.mutateAsync({
        clientId: resolvedClientId,
        applicantClientId:
          ownerSameAsClient || resolvedOwnerId === resolvedClientId
            ? undefined
            : resolvedOwnerId,
        matterType: 'patent',
        title: spcName.trim(),
        status: 'draft',
        description: t('createFile.draftDescription', {
          procedure: t('createFile.kinds.spc'),
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

      for (const slot of specimenSlots) {
        if (!slot.file) continue
        await documentsApi.upload(matter.id, {
          file: slot.file,
          displayName: slot.file.name,
          category: 'evidence',
          tags: 'specimen,create-file',
        })
      }
      if (attachmentFile1) {
        await documentsApi.upload(matter.id, {
          file: attachmentFile1,
          displayName: attachmentFile1.name,
          category: 'general',
          tags: 'attachment,create-file',
        })
      }
      if (attachmentFile2) {
        await documentsApi.upload(matter.id, {
          file: attachmentFile2,
          displayName: attachmentFile2.name,
          category: 'general',
          tags: 'attachment,create-file',
        })
      }

      navigate(`/matters/${matter.id}/overview`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('createFile.errors.saveFailed')))
    }
  }

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
                {t('createFile.spcFormTitle')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('createFile.kinds.spc')}
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

      <SectionCard title={t('createFile.sections.owner')}>
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ownerSameAsClient}
            onChange={(e) => setOwnerSameAsClient(e.target.checked)}
            className="size-4 rounded border"
          />
          {t('createFile.sameApplicant')}
        </label>
        {!ownerSameAsClient ? (
          <ApplicantPartyFields
            legalName={ownerLegalName}
            eik=""
            vatNo=""
            address={ownerAddress}
            showIdsAndEmail={false}
            legalNameRequired
            onLegalNameChange={setOwnerLegalName}
            onEikChange={() => undefined}
            onVatChange={() => undefined}
            onAddressChange={setOwnerAddress}
          />
        ) : null}
      </SectionCard>

      <SectionCard title={t('createFile.sections.inventor')}>
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inventorSameAsClient}
            onChange={(e) => setInventorSameAsClient(e.target.checked)}
            className="size-4 rounded border"
          />
          {t('createFile.sameInventor')}
        </label>
        {!inventorSameAsClient ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={`${t('createFile.fields.name')} *`}
              className="sm:col-span-2"
            >
              <Input
                value={inventorName}
                onChange={(e) => setInventorName(e.target.value)}
              />
            </Field>
            <Field label={t('createFile.fields.city')}>
              <Input
                value={inventorAddress.city}
                onChange={(e) =>
                  setInventorAddress((a) => ({ ...a, city: e.target.value }))
                }
              />
            </Field>
            <Field label={t('createFile.fields.postalCode')}>
              <Input
                value={inventorAddress.postalCode}
                onChange={(e) =>
                  setInventorAddress((a) => ({ ...a, postalCode: e.target.value }))
                }
              />
            </Field>
            <Field label={t('createFile.fields.country')}>
              <CountrySelect
                value={inventorAddress.country}
                onValueChange={(code) =>
                  setInventorAddress((a) => ({ ...a, country: code }))
                }
              />
            </Field>
            <Field label={t('createFile.fields.address')} className="sm:col-span-2">
              <Input
                value={inventorAddress.address}
                onChange={(e) =>
                  setInventorAddress((a) => ({ ...a, address: e.target.value }))
                }
              />
            </Field>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title={t('createFile.sections.spcBasic')}>
        <div className="space-y-4">
          <Field label={`${t('createFile.fields.country')} *`}>
            <Select
              value={filingCountry || undefined}
              onValueChange={(v) => setFilingCountry(v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('createFile.chooseCountry')} />
              </SelectTrigger>
              <SelectContent>
                {allCountriesAlpha.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="space-y-2">
            {specimenSlots.map((slot, index) => (
              <div key={slot.id} className="flex items-end gap-2">
                <Field
                  label={index === 0 ? t('createFile.fields.image') : ' '}
                  className="min-w-0 flex-1"
                >
                  <Input
                    type="file"
                    accept="image/*,.pdf,.tif,.tiff"
                    onChange={(e) =>
                      setSpecimenSlots((rows) =>
                        rows.map((row) =>
                          row.id === slot.id
                            ? { ...row, file: e.target.files?.[0] ?? null }
                            : row,
                        ),
                      )
                    }
                  />
                  {slot.file ? (
                    <p className="text-xs text-muted-foreground">{slot.file.name}</p>
                  ) : null}
                </Field>
                {index === specimenSlots.length - 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mb-0.5"
                    onClick={() =>
                      setSpecimenSlots((rows) => [...rows, emptySpecimen()])
                    }
                    aria-label={t('createFile.fields.addImage')}
                  >
                    <Plus className="size-4" />
                  </Button>
                ) : null}
                {specimenSlots.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-0.5"
                    onClick={() =>
                      setSpecimenSlots((rows) =>
                        rows.filter((row) => row.id !== slot.id),
                      )
                    }
                    aria-label={t('createFile.fields.removeImage')}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <Field label={`${t('createFile.fields.spcName')} *`}>
            <Input
              value={spcName}
              onChange={(e) => setSpcName(e.target.value)}
            />
          </Field>

          <Field label={t('createFile.fields.medicinalProduct')}>
            <Input
              value={medicinalProduct}
              onChange={(e) => setMedicinalProduct(e.target.value)}
            />
          </Field>

          <Field label={t('createFile.fields.basicPatentNumber')}>
            <Input
              value={basicPatentNumber}
              onChange={(e) => setBasicPatentNumber(e.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('createFile.fields.effectStartDate')}>
              <Input
                type="date"
                value={effectStartDate}
                onChange={(e) => setEffectStartDate(e.target.value)}
              />
            </Field>
            <Field label={t('createFile.fields.effectEndDate')}>
              <Input
                type="date"
                value={effectEndDate}
                onChange={(e) => setEffectEndDate(e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {t('createFile.fields.firstAuthorization')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('createFile.fields.claimNumber')}>
                <Input
                  value={firstAuthorizationNumber}
                  onChange={(e) => setFirstAuthorizationNumber(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.applicationDate')}>
                <Input
                  type="date"
                  value={firstAuthorizationDate}
                  onChange={(e) => setFirstAuthorizationDate(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {t('createFile.sections.claims')}
            </p>
            {claims.map((row, index) => (
              <div key={row.id} className="flex items-end gap-2">
                <Field
                  label={
                    index === 0 ? t('createFile.fields.claimNumber') : ' '
                  }
                  className="w-28 shrink-0"
                >
                  <Input
                    value={row.number}
                    onChange={(e) =>
                      setClaims((rows) =>
                        rows.map((r) =>
                          r.id === row.id
                            ? { ...r, number: e.target.value }
                            : r,
                        ),
                      )
                    }
                  />
                </Field>
                <Input
                  className="min-w-0 flex-1"
                  value={row.text}
                  onChange={(e) =>
                    setClaims((rows) =>
                      rows.map((r) =>
                        r.id === row.id ? { ...r, text: e.target.value } : r,
                      ),
                    )
                  }
                />
                {index === claims.length - 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mb-0.5 shrink-0"
                    onClick={() =>
                      setClaims((rows) => [...rows, emptyClaim(rows.length + 1)])
                    }
                    aria-label={t('createFile.addClaim')}
                  >
                    <Plus className="size-4" />
                  </Button>
                ) : null}
                {claims.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-0.5 shrink-0"
                    onClick={() =>
                      setClaims((rows) => rows.filter((r) => r.id !== row.id))
                    }
                    aria-label={t('createFile.removeClaim')}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {ipcClasses.map((value, index) => (
              <div key={`ipc-${index}`} className="flex items-end gap-2">
                <Field
                  label={index === 0 ? t('createFile.fields.ipc') : ' '}
                  className="min-w-0 flex-1"
                >
                  <Input
                    value={value}
                    placeholder={t('createFile.fields.ipc')}
                    onChange={(e) =>
                      setIpcClasses((rows) =>
                        rows.map((row, i) => (i === index ? e.target.value : row)),
                      )
                    }
                  />
                </Field>
                {index === ipcClasses.length - 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mb-0.5"
                    onClick={() => setIpcClasses((rows) => [...rows, ''])}
                    aria-label={t('createFile.addIpc')}
                  >
                    <Plus className="size-4" />
                  </Button>
                ) : null}
                {ipcClasses.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-0.5"
                    onClick={() =>
                      setIpcClasses((rows) => rows.filter((_, i) => i !== index))
                    }
                    aria-label={t('createFile.removeIpc')}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t('createFile.sections.filing')}>
        <div className="space-y-6">
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
          </div>

          <div className="space-y-4 border-t border-border/60 pt-5">
            <div className="max-w-xs">
              <YesNoField
                label={t('createFile.fields.conventionPriority')}
                value={conventionPriority}
                onChange={setConventionPriority}
              />
            </div>
            {conventionPriority ? (
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
                <Field label={t('createFile.fields.priorityCountry')}>
                  <CountrySelect
                    value={priorityCountry}
                    onValueChange={setPriorityCountry}
                    placeholder={t('createFile.chooseCountry')}
                  />
                </Field>
                <Field label={t('createFile.fields.priorityFromDate')}>
                  <Input
                    type="date"
                    value={priorityFromDate}
                    onChange={(e) => setPriorityFromDate(e.target.value)}
                  />
                </Field>
                <Field label={t('createFile.fields.priorityApplicationNumber')}>
                  <Input
                    value={priorityApplicationNumber}
                    onChange={(e) => setPriorityApplicationNumber(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            <div className="max-w-xs">
              <YesNoField
                label={t('createFile.fields.exhibitionPriority')}
                value={exhibitionPriority}
                onChange={setExhibitionPriority}
              />
            </div>
            {exhibitionPriority ? (
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                <Field label={t('createFile.fields.exhibitionFirstAppearance')}>
                  <Input
                    type="date"
                    value={exhibitionFirstAppearanceDate}
                    onChange={(e) =>
                      setExhibitionFirstAppearanceDate(e.target.value)
                    }
                  />
                </Field>
                <Field label={t('createFile.fields.exhibitionName')}>
                  <Input
                    value={exhibitionName}
                    onChange={(e) => setExhibitionName(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            <div className="max-w-xs">
              <YesNoField
                label={t('createFile.fields.conversionFromPatent')}
                value={conversionFromPatent}
                onChange={setConversionFromPatent}
              />
            </div>
            {conversionFromPatent ? (
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                <Field label={t('createFile.fields.conversionInvention')}>
                  <Input
                    value={conversionInvention}
                    onChange={(e) => setConversionInvention(e.target.value)}
                  />
                </Field>
                <Field label={t('createFile.fields.conversionRequestNumber')}>
                  <Input
                    value={conversionRequestNumber}
                    onChange={(e) => setConversionRequestNumber(e.target.value)}
                  />
                </Field>
                <Field label={t('createFile.fields.conversionApplicationDate')}>
                  <Input
                    type="date"
                    value={conversionApplicationDate}
                    onChange={(e) => setConversionApplicationDate(e.target.value)}
                  />
                </Field>
                <Field label={t('createFile.fields.conversionPriorityDate')}>
                  <Input
                    type="date"
                    value={conversionPriorityDate}
                    onChange={(e) => setConversionPriorityDate(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 border-t border-border/60 pt-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('createFile.fields.patentRegistrationNumber')}>
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
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('createFile.fields.registrationBulletin')}>
                <Input
                  value={registrationBulletin}
                  onChange={(e) => setRegistrationBulletin(e.target.value)}
                />
              </Field>
              <Field label={t('createFile.fields.epRegistrationBulletinDate')}>
                <Input
                  type="date"
                  value={registrationBulletinDate}
                  onChange={(e) => setRegistrationBulletinDate(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t('createFile.sections.attachments')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('createFile.fields.attachDocument')}>
            <Input
              type="file"
              onChange={(e) => setAttachmentFile1(e.target.files?.[0] ?? null)}
            />
            {attachmentFile1 ? (
              <p className="text-xs text-muted-foreground">{attachmentFile1.name}</p>
            ) : null}
          </Field>
          <Field label={t('createFile.fields.attachDocument')}>
            <Input
              type="file"
              onChange={(e) => setAttachmentFile2(e.target.files?.[0] ?? null)}
            />
            {attachmentFile2 ? (
              <p className="text-xs text-muted-foreground">{attachmentFile2.name}</p>
            ) : null}
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t('createFile.sections.representatives')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('createFile.fields.selectRepresentative')}>
            <Select
              value={representativeGroupId}
              onValueChange={(v) => setRepresentativeGroupId(v ?? NO_HOLDING_GROUP)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t('createFile.fields.selectRepresentative')}
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
              else if (extraRepresentativeGroupIds.length === 0) {
                setExtraRepresentativeGroupIds([NO_HOLDING_GROUP])
              }
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
                <Field label={t('createFile.fields.selectRepresentative')}>
                  <Select
                    value={id || NO_HOLDING_GROUP}
                    onValueChange={(v) =>
                      setExtraRepresentativeGroupIds((rows) =>
                        rows.map((row, i) =>
                          i === index ? (v ?? NO_HOLDING_GROUP) : row,
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
                    aria-label={t('createFile.removeApplicant')}
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
