import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ClientAddressFields } from '@/components/crm/ClientAddressFields'
import type { ClientAddressInput } from '@/features/crm/addressInput'
import { toClientAddressInput, clientAddressesEqual } from '@/features/crm/addressInput'
import { cn } from '@/lib/utils'

type ClientRegisteredCorrespondenceFieldsProps = {
  registered: ClientAddressInput
  correspondence: ClientAddressInput
  onRegisteredChange: (value: ClientAddressInput) => void
  onCorrespondenceChange: (value: ClientAddressInput) => void
  sameAsRegistered: boolean
  onSameAsRegisteredChange: (same: boolean) => void
  idPrefix: string
  variant?: 'default' | 'auth'
}

export function ClientRegisteredCorrespondenceFields({
  registered,
  correspondence,
  onRegisteredChange,
  onCorrespondenceChange,
  sameAsRegistered,
  onSameAsRegisteredChange,
  idPrefix,
  variant = 'default',
}: ClientRegisteredCorrespondenceFieldsProps) {
  const { t } = useTranslation('crm')
  const isAuth = variant === 'auth'

  const handleSameChange = (checked: boolean) => {
    onSameAsRegisteredChange(checked)
    if (checked) onCorrespondenceChange(toClientAddressInput(registered))
  }

  useEffect(() => {
    if (!sameAsRegistered) return
    if (clientAddressesEqual(correspondence, registered)) return
    onCorrespondenceChange(toClientAddressInput(registered))
  }, [sameAsRegistered, registered, correspondence, onCorrespondenceChange])

  return (
    <div className={cn(isAuth ? 'space-y-4' : 'grid gap-6 lg:grid-cols-2')}>
      <ClientAddressFields
        idPrefix={`${idPrefix}-registered`}
        title={t('offices.addresses.registeredLegal')}
        value={registered}
        onChange={onRegisteredChange}
        variant={variant}
      />
      <ClientAddressFields
        idPrefix={`${idPrefix}-correspondence`}
        title={t('offices.addresses.correspondence')}
        value={correspondence}
        onChange={onCorrespondenceChange}
        variant={variant}
        fieldsHidden={sameAsRegistered}
        header={
          <label
            className={cn(
              'flex items-start gap-2 text-sm',
              isAuth ? 'text-brand-green' : '',
            )}
          >
            <input
              type="checkbox"
              className={cn('mt-0.5', isAuth ? '' : 'size-4 rounded border')}
              checked={sameAsRegistered}
              onChange={(e) => handleSameChange(e.target.checked)}
            />
            <span>{t('offices.addresses.sameAsRegistered')}</span>
          </label>
        }
      />
    </div>
  )
}
