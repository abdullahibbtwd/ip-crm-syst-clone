import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ClientAddressInput } from '@/features/crm/addressInput'
import { cn } from '@/lib/utils'

type ClientAddressFieldsProps = {
  title: string
  value: ClientAddressInput
  onChange: (value: ClientAddressInput) => void
  idPrefix: string
  variant?: 'default' | 'auth'
  className?: string
  header?: ReactNode
  fieldsHidden?: boolean
}

export function ClientAddressFields({
  title,
  value,
  onChange,
  idPrefix,
  variant = 'default',
  className,
  header,
  fieldsHidden = false,
}: ClientAddressFieldsProps) {
  const { t } = useTranslation(['crm', 'common'])
  const isAuth = variant === 'auth'

  const setField = (field: keyof ClientAddressInput, next: string) => {
    onChange({ ...value, [field]: next })
  }

  return (
    <div className={cn('space-y-3', className)}>
      <p className={cn(isAuth ? 'auth-label' : 'text-sm font-medium')}>{title}</p>
      {header}
      {fieldsHidden ? null : (
        <>
      <Field
        id={`${idPrefix}-line1`}
        label={t('offices.addresses.addressLine1')}
        variant={variant}
      >
        {isAuth ? (
          <input
            id={`${idPrefix}-line1`}
            type="text"
            className="auth-input"
            value={value.addressLine1 ?? ''}
            onChange={(e) => setField('addressLine1', e.target.value)}
          />
        ) : (
          <Input
            id={`${idPrefix}-line1`}
            value={value.addressLine1 ?? ''}
            onChange={(e) => setField('addressLine1', e.target.value)}
          />
        )}
      </Field>

      <Field
        id={`${idPrefix}-line2`}
        label={t('offices.addresses.addressLine2')}
        variant={variant}
      >
        {isAuth ? (
          <input
            id={`${idPrefix}-line2`}
            type="text"
            className="auth-input"
            value={value.addressLine2 ?? ''}
            onChange={(e) => setField('addressLine2', e.target.value)}
          />
        ) : (
          <Input
            id={`${idPrefix}-line2`}
            value={value.addressLine2 ?? ''}
            onChange={(e) => setField('addressLine2', e.target.value)}
          />
        )}
      </Field>

      <div className={cn('grid gap-3', isAuth ? 'sm:grid-cols-2' : 'sm:grid-cols-2')}>
        <Field id={`${idPrefix}-city`} label={t('offices.city')} variant={variant}>
          {isAuth ? (
            <input
              id={`${idPrefix}-city`}
              type="text"
              className="auth-input"
              value={value.city ?? ''}
              onChange={(e) => setField('city', e.target.value)}
            />
          ) : (
            <Input
              id={`${idPrefix}-city`}
              value={value.city ?? ''}
              onChange={(e) => setField('city', e.target.value)}
            />
          )}
        </Field>

        <Field
          id={`${idPrefix}-region`}
          label={t('offices.addresses.region')}
          variant={variant}
        >
          {isAuth ? (
            <input
              id={`${idPrefix}-region`}
              type="text"
              className="auth-input"
              value={value.region ?? ''}
              onChange={(e) => setField('region', e.target.value)}
            />
          ) : (
            <Input
              id={`${idPrefix}-region`}
              value={value.region ?? ''}
              onChange={(e) => setField('region', e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id={`${idPrefix}-postal`}
          label={t('offices.addresses.postalCode')}
          variant={variant}
        >
          {isAuth ? (
            <input
              id={`${idPrefix}-postal`}
              type="text"
              className="auth-input"
              value={value.postalCode ?? ''}
              onChange={(e) => setField('postalCode', e.target.value)}
            />
          ) : (
            <Input
              id={`${idPrefix}-postal`}
              value={value.postalCode ?? ''}
              onChange={(e) => setField('postalCode', e.target.value)}
            />
          )}
        </Field>

        <Field id={`${idPrefix}-country`} label={t('overview.country')} variant={variant}>
          {isAuth ? (
            <CountrySelect
              value={value.country ?? ''}
              onValueChange={(code) => setField('country', code)}
              className="auth-input"
            />
          ) : (
            <CountrySelect
              value={value.country ?? ''}
              onValueChange={(code) => setField('country', code)}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${idPrefix}-phone`} label={t('offices.addresses.phone')} variant={variant}>
          {isAuth ? (
            <input
              id={`${idPrefix}-phone`}
              type="tel"
              className="auth-input"
              value={value.phone ?? ''}
              onChange={(e) => setField('phone', e.target.value)}
            />
          ) : (
            <Input
              id={`${idPrefix}-phone`}
              type="tel"
              value={value.phone ?? ''}
              onChange={(e) => setField('phone', e.target.value)}
            />
          )}
        </Field>

        <Field id={`${idPrefix}-fax`} label={t('offices.addresses.fax')} variant={variant}>
          {isAuth ? (
            <input
              id={`${idPrefix}-fax`}
              type="text"
              className="auth-input"
              value={value.fax ?? ''}
              onChange={(e) => setField('fax', e.target.value)}
            />
          ) : (
            <Input
              id={`${idPrefix}-fax`}
              value={value.fax ?? ''}
              onChange={(e) => setField('fax', e.target.value)}
            />
          )}
        </Field>
      </div>
        </>
      )}
    </div>
  )
}

function Field({
  id,
  label,
  variant,
  children,
}: {
  id: string
  label: string
  variant: 'default' | 'auth'
  children: React.ReactNode
}) {
  if (variant === 'auth') {
    return (
      <div>
        <label htmlFor={id} className="auth-label">{label}</label>
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}
