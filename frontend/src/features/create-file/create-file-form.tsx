import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClient, useClients } from '@/features/crm/hooks/useClients'
import { clientDisplayName } from '@/features/crm/utils'
import { cn } from '@/lib/utils'

export type AddressDraft = {
  city: string
  country: string
  postalCode: string
  address: string
  email: string
}

export const emptyAddress = (): AddressDraft => ({
  city: '',
  country: 'BG',
  postalCode: '',
  address: '',
  email: '',
})

export function nextId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function SectionCard({
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

export function SubSection({
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

export function Field({
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

export type AdditionalApplicantDraft = {
  id: string
  legalName: string
  eik: string
  vatNo: string
  address: AddressDraft
}

export const emptyApplicant = (): AdditionalApplicantDraft => ({
  id: nextId('applicant'),
  legalName: '',
  eik: '',
  vatNo: '',
  address: emptyAddress(),
})

export function ApplicantPartyFields({
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

export function YesNoField({
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

export const NO_HOLDING_GROUP = '__none__'

export function ClientSearchPicker({
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
          {selectedClient ? clientDisplayName(selectedClient) : value}
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
