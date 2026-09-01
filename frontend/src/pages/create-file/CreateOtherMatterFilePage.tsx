import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, FilePlus2 } from 'lucide-react'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { MatterAttributeFields } from '@/components/matters/MatterAttributeFields'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useClient, useCreateClient } from '@/features/crm/hooks/useClients'
import { clientDisplayName } from '@/features/crm/utils'
import {
  ClientSearchPicker,
  Field,
  SectionCard,
} from '@/features/create-file/create-file-form'
import {
  buildOtherMatterTitle,
  otherMatterDetailFieldKeys,
  otherMatterSpineFieldKeys,
} from '@/features/matters/other-matter-fields'
import { resolveOtherMatterType } from '@/features/create-file/other-matter-routes'
import { useCreateMatter } from '@/features/matters/hooks/useMatters'
import type { MatterType } from '@/features/matters/types'
import { matterTypeLabel } from '@/features/matters/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

function buildDefaultTitle(
  matterType: MatterType,
  attributes: Record<string, unknown>,
  fallback: string,
): string {
  return buildOtherMatterTitle(matterType, attributes, fallback)
}

export function CreateOtherMatterFilePage() {
  const { t } = useTranslation('matters')
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const matterType = resolveOtherMatterType(slug)

  const createMatter = useCreateMatter()
  const createClient = useCreateClient()

  const [clientId, setClientId] = useState<string | undefined>()
  const [legalName, setLegalName] = useState('')
  const [country, setCountry] = useState('BG')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attributes, setAttributes] = useState<Record<string, unknown>>({})
  const [error, setError] = useState<string | null>(null)

  const { data: selectedClient } = useClient(clientId ?? '')

  useEffect(() => {
    if (!selectedClient) return
    setLegalName(clientDisplayName(selectedClient))
    setCountry(selectedClient.country ?? 'BG')
  }, [selectedClient])

  if (!matterType) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-16">
        <p className="text-sm text-destructive">{t('createFile.errors.otherType')}</p>
        <Link to="/files/new/other" className={buttonVariants({ variant: 'outline' })}>
          {t('createFile.otherFilesTitle')}
        </Link>
      </div>
    )
  }

  const typeLabel = matterTypeLabel(matterType)
  const spineKeys = otherMatterSpineFieldKeys()
  const detailKeys = otherMatterDetailFieldKeys(matterType)

  const handleAttributeChange = (key: string, value: unknown) => {
    setAttributes((current) => ({ ...current, [key]: value }))
  }

  const handleSaveDraft = async () => {
    setError(null)
    if (!clientId && !legalName.trim()) {
      setError(t('createFile.errors.clientOrDetails'))
      return
    }

    const cleanedAttributes = Object.fromEntries(
      Object.entries(attributes).filter(([, value]) => {
        if (value == null) return false
        if (typeof value === 'string') return value.trim().length > 0
        return true
      }),
    )

    try {
      let resolvedClientId = clientId
      if (!resolvedClientId) {
        const created = await createClient.mutateAsync({
          type: 'company',
          companyName: legalName.trim(),
          country: country || undefined,
          gdprConsent: true,
          billingName: legalName.trim(),
          billingCountry: country || undefined,
          registeredLegalAddress: {
            country: country || undefined,
          },
        })
        resolvedClientId = created.id
      }

      const resolvedTitle =
        title.trim() ||
        buildDefaultTitle(
          matterType,
          cleanedAttributes,
          legalName.trim() || typeLabel,
        )

      const matter = await createMatter.mutateAsync({
        clientId: resolvedClientId,
        matterType,
        title: resolvedTitle,
        status: 'draft',
        description:
          description.trim() ||
          t('createFile.draftDescription', { procedure: typeLabel }),
        jurisdictions: country ? [{ countryCode: country }] : [],
        attributes: {
          ...cleanedAttributes,
          clientLegalName: legalName.trim() || undefined,
        },
      })

      navigate(`/matters/${matter.id}/overview`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('createFile.errors.saveFailed')))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/files/new/other"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-2 px-0')}
          >
            <ArrowLeft className="mr-1 size-4" />
            {t('createFile.otherFilesTitle')}
          </Link>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <FilePlus2 className="size-6" />
            </div>
            <div>
              <h1 className="font-serif text-3xl tracking-tight text-foreground">
                {t('createFile.otherFileFormTitle', { type: typeLabel })}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
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
            <>
              <p className="text-xs text-muted-foreground">
                {t('createFile.clientOptionalHint')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`${t('createFile.fields.legalName')} *`}>
                  <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
                </Field>
                <Field label={t('createFile.fields.country')}>
                  <CountrySelect value={country} onValueChange={setCountry} />
                </Field>
              </div>
            </>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title={t('createFile.sections.fileDetails')}>
        <div className="grid gap-4">
          <Field label={t('createFile.fields.fileTitleOptional')}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={typeLabel}
            />
          </Field>
          <Field label={t('createFile.fields.fileDescriptionOptional')}>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title={t('otherMatterSpine.sectionTitle')}>
        <MatterAttributeFields
          matterType={matterType}
          values={attributes}
          onChange={handleAttributeChange}
          excludeKeys={detailKeys}
        />
      </SectionCard>

      <SectionCard title={t('otherMatterView.detailsTitle', { type: typeLabel })}>
        <MatterAttributeFields
          matterType={matterType}
          values={attributes}
          onChange={handleAttributeChange}
          excludeKeys={spineKeys}
        />
      </SectionCard>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
        <Link to="/files/new/other">
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
