import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppAlert } from '@/components/feedback/AppAlertProvider'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import {
  BILLING_INCOMPLETE_CODE,
  SUPPORTED_INVOICE_CURRENCIES,
  type BillingMissingField,
} from '@/features/crm/billingProfile'
import { useClient, useUpdateClient } from '@/features/crm/hooks/useClients'
import { getApiErrorMessage } from '@/lib/api-client'

type ClientBillingProfileCardProps = {
  clientId: string
}

export function ClientBillingProfileCard({ clientId }: ClientBillingProfileCardProps) {
  const { t } = useTranslation('crm')
  const { showError } = useAppAlert()
  const { data: client, isLoading } = useClient(clientId)
  const updateClient = useUpdateClient(clientId)

  const [billingName, setBillingName] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [vatNo, setVatNo] = useState('')
  const [preferredCurrency, setPreferredCurrency] = useState('EUR')
  const [paymentTermsDays, setPaymentTermsDays] = useState('30')
  const [billingAddressLine1, setBillingAddressLine1] = useState('')
  const [billingAddressLine2, setBillingAddressLine2] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingRegion, setBillingRegion] = useState('')
  const [billingPostalCode, setBillingPostalCode] = useState('')
  const [billingCountry, setBillingCountry] = useState('')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return
    setBillingName(client.billingName ?? '')
    setBillingEmail(client.billingEmail ?? '')
    setVatNo(client.vatNo ?? '')
    setPreferredCurrency(client.preferredCurrency ?? 'EUR')
    setPaymentTermsDays(String(client.paymentTermsDays ?? 30))
    setBillingAddressLine1(client.billingAddressLine1 ?? '')
    setBillingAddressLine2(client.billingAddressLine2 ?? '')
    setBillingCity(client.billingCity ?? '')
    setBillingRegion(client.billingRegion ?? '')
    setBillingPostalCode(client.billingPostalCode ?? '')
    setBillingCountry(client.billingCountry ?? '')
  }, [client])

  if (isLoading || !client) {
    return <p className="text-sm text-muted-foreground">{t('billing.loading')}</p>
  }

  const readiness = client.billingReadiness
  const missingLabels =
    readiness?.missingFields.map((f: BillingMissingField) =>
      t(`billing.profile.fields.${f}`),
    ) ?? []

  const handleSave = async () => {
    setSavedMsg(null)
    const terms = Number(paymentTermsDays)
    try {
      await updateClient.mutateAsync({
        billingName: billingName.trim() || null,
        billingEmail: billingEmail.trim() || null,
        vatNo: vatNo.trim() || null,
        preferredCurrency,
        paymentTermsDays: Number.isFinite(terms) && terms > 0 ? terms : 30,
        billingAddressLine1: billingAddressLine1.trim() || null,
        billingAddressLine2: billingAddressLine2.trim() || null,
        billingCity: billingCity.trim() || null,
        billingRegion: billingRegion.trim() || null,
        billingPostalCode: billingPostalCode.trim() || null,
        billingCountry: billingCountry.trim() || null,
      })
      setSavedMsg(t('billing.profile.saved'))
    } catch (err) {
      showError(err, t('billing.profile.saveFailed'))
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{t('billing.profile.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('billing.profile.subtitle')}
          </p>
        </div>
        {readiness ? (
          <Badge variant={readiness.ready ? 'success' : 'warning'}>
            {readiness.ready
              ? t('billing.profile.ready')
              : t('billing.profile.incomplete')}
          </Badge>
        ) : null}
      </div>

      {readiness && !readiness.ready ? (
        <p className="text-sm text-amber-700">
          {t('billing.profile.missing', { fields: missingLabels.join(', ') })}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('billing.profile.billingName')}</Label>
          <Input value={billingName} onChange={(e) => setBillingName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('billing.profile.billingEmail')}</Label>
          <Input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('billing.profile.vatNo')}</Label>
          <Input value={vatNo} onChange={(e) => setVatNo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('billing.profile.currency')}</Label>
          <Select
            value={preferredCurrency}
            onValueChange={(v) => setPreferredCurrency(v ?? 'EUR')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_INVOICE_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t('billing.profile.paymentTerms')}</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={paymentTermsDays}
            onChange={(e) => setPaymentTermsDays(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t('billing.profile.addressLine1')}</Label>
          <Input
            value={billingAddressLine1}
            onChange={(e) => setBillingAddressLine1(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{t('billing.profile.addressLine2')}</Label>
          <Input
            value={billingAddressLine2}
            onChange={(e) => setBillingAddressLine2(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('billing.profile.city')}</Label>
          <Input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t('billing.profile.postalCode')}</Label>
          <Input
            value={billingPostalCode}
            onChange={(e) => setBillingPostalCode(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('billing.profile.region')}</Label>
          <Input
            value={billingRegion}
            onChange={(e) => setBillingRegion(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('billing.profile.country')}</Label>
          <Input
            value={billingCountry}
            onChange={(e) => setBillingCountry(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PermissionGate resource="client" action="update">
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={updateClient.isPending}
          >
            {t('billing.profile.save')}
          </Button>
        </PermissionGate>
        {savedMsg ? (
          <p className="text-sm text-muted-foreground">{savedMsg}</p>
        ) : null}
      </div>

      {/* Keep export for issue-error deep links */}
      <span className="sr-only" data-billing-code={BILLING_INCOMPLETE_CODE}>
        <Link to={`/clients/${clientId}/billing`}>billing</Link>
      </span>
    </section>
  )
}

export function getBillingIncompleteClientId(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('response' in error)) return null
  const data = (
    error as {
      response?: {
        data?: { code?: string; clientId?: string; message?: unknown }
      }
    }
  ).response?.data
  if (!data) return null
  if (data.code === BILLING_INCOMPLETE_CODE && data.clientId) return data.clientId
  // Nest may nest message object
  const msg = data.message
  if (msg && typeof msg === 'object' && msg !== null && 'code' in msg) {
    const nested = msg as { code?: string; clientId?: string }
    if (nested.code === BILLING_INCOMPLETE_CODE && nested.clientId) {
      return nested.clientId
    }
  }
  return null
}

export function billingIncompleteMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, fallback)
}
