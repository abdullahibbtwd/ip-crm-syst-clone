import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, SectionCard } from '@/features/create-file/create-file-form'
import { useClient, useClients } from '@/features/crm/hooks/useClients'
import { useHoldingGroups } from '@/features/crm/hooks/useHoldingGroups'
import { clientDisplayName } from '@/features/crm/utils'
import { useGenerateDocument } from '@/features/documents/hooks/useDocuments'
import {
  compactPoaFields,
  formatPoaObjectLine,
  matterObjectNumber,
  poaDefaultsFromClient,
  poaDefaultsFromMatter,
} from '@/features/documents/poaFields'
import { useMatter, useMatters } from '@/features/matters/hooks/useMatters'
import { getApiErrorMessage } from '@/lib/api-client'

const NO_REPRESENTATIVE = '__none__'

export function GeneratePoaPage() {
  const { t } = useTranslation(['crm', 'common'])
  const navigate = useNavigate()
  const { data: clients } = useClients({ limit: 100, sortBy: 'name', sortOrder: 'asc' })
  const { data: holdingGroups } = useHoldingGroups({ limit: 100 })
  const [clientId, setClientId] = useState('')
  const [matterId, setMatterId] = useState('')
  const [representativeGroupId, setRepresentativeGroupId] = useState('')
  const [legalEntityName, setLegalEntityName] = useState('')
  const [mol, setMol] = useState('')
  const [legalEntityAddress, setLegalEntityAddress] = useState('')
  const [representativeName, setRepresentativeName] = useState('')
  const [representativeAddress, setRepresentativeAddress] = useState('')
  const [poaObject, setPoaObject] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: client } = useClient(clientId)
  const { data: matters } = useMatters(
    clientId ? { clientId, limit: 50 } : undefined,
    { enabled: Boolean(clientId) },
  )
  const { data: matter } = useMatter(matterId)
  const generate = useGenerateDocument(matterId)

  const selectedClient = (clients?.items ?? []).find((item) => item.id === clientId)
  const selectedGroup = (holdingGroups?.items ?? []).find(
    (group) => group.id === representativeGroupId,
  )
  const selectedMatter = (matters?.items ?? []).find((item) => item.id === matterId)
  const representativeLabel =
    selectedGroup?.name ||
    representativeName ||
    client?.holdingGroup?.name ||
    ''
  const companyLabel =
    selectedClient?.displayName ||
    (client?.id === clientId ? clientDisplayName(client) : '')
  const objectLabel = selectedMatter
    ? formatPoaObjectLine(
        selectedMatter.matterType,
        matterObjectNumber(selectedMatter),
        selectedMatter.title,
      )
    : matter?.id === matterId
      ? formatPoaObjectLine(
          matter.matterType,
          matterObjectNumber(matter),
          matter.title,
        )
      : poaObject

  useEffect(() => {
    setMatterId('')
    setMol('')
    setPoaObject('')
  }, [clientId])

  useEffect(() => {
    const defaults = poaDefaultsFromClient(client)
    setLegalEntityName(defaults.legalEntityName)
    setLegalEntityAddress(defaults.address)
    setRepresentativeGroupId(client?.holdingGroup?.id ?? '')
    setRepresentativeName(defaults.representativeName)
  }, [client])

  useEffect(() => {
    if (!matterId) return
    if (matter && (matter.id !== matterId || (clientId && matter.clientId !== clientId))) {
      return
    }
    const listItem = matters?.items.find((item) => item.id === matterId)
    const defaults = poaDefaultsFromMatter(matter, listItem)
    if (defaults.legalEntityName) setLegalEntityName(defaults.legalEntityName)
    if (defaults.address) setLegalEntityAddress(defaults.address)
    setMol(defaults.mol)
    setPoaObject(defaults.poaObject)
  }, [matter, matterId, matters, clientId])

  const handleRepresentativeChange = (value: string) => {
    const id = value === NO_REPRESENTATIVE ? '' : value
    setRepresentativeGroupId(id)
    const group = holdingGroups?.items.find((item) => item.id === id)
    setRepresentativeName(group?.name ?? '')
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!clientId || !matterId) {
      setError(t('generatePoa.selectRequired'))
      return
    }
    try {
      await generate.mutateAsync({
        format: 'pdf',
        fields: {
          legalEntityName,
          mol,
          clientAddress: legalEntityAddress,
          representativeName,
          poaObject,
          ...compactPoaFields({ representativeAddress }),
        },
      })
      navigate(`/matters/${matterId}/documents`)
    } catch (err) {
      setError(getApiErrorMessage(err, t('generatePoa.error')))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('generatePoa.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('generatePoa.description')}</p>
      </div>

      <PermissionGate
        resource="document"
        action="create"
        fallback={<p className="text-sm text-muted-foreground">{t('common:noPermission')}</p>}
      >
        <form onSubmit={handleGenerate} className="space-y-5">
          <SectionCard title={t('generatePoa.legalEntity')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('generatePoa.company')} className="sm:col-span-2">
                <Select value={clientId} onValueChange={(v) => setClientId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('generatePoa.selectCompany')}>
                      {clientId ? companyLabel || null : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(clients?.items ?? []).map((item) => (
                      <SelectItem key={item.id} value={item.id} label={item.displayName}>
                        {item.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t('generatePoa.legalNameAndType')} className="sm:col-span-2">
                <Input
                  value={legalEntityName}
                  onChange={(e) => setLegalEntityName(e.target.value)}
                />
              </Field>
              <Field label={t('generatePoa.mol')}>
                <Input value={mol} onChange={(e) => setMol(e.target.value)} />
              </Field>
              <Field label={t('generatePoa.address')} className="sm:col-span-2">
                <Textarea
                  value={legalEntityAddress}
                  onChange={(e) => setLegalEntityAddress(e.target.value)}
                  rows={2}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title={t('generatePoa.representative')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('generatePoa.representativeName')} className="sm:col-span-2">
                <Select
                  value={representativeGroupId || NO_REPRESENTATIVE}
                  onValueChange={(v) => handleRepresentativeChange(v ?? NO_REPRESENTATIVE)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('generatePoa.selectRepresentative')}>
                      {representativeGroupId
                        ? representativeLabel || null
                        : t('generatePoa.noRepresentative')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value={NO_REPRESENTATIVE}
                      label={t('generatePoa.noRepresentative')}
                    >
                      {t('generatePoa.noRepresentative')}
                    </SelectItem>
                    {(holdingGroups?.items ?? []).map((group) => (
                      <SelectItem key={group.id} value={group.id} label={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="mt-2"
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                />
              </Field>
              <Field label={t('generatePoa.address')} className="sm:col-span-2">
                <Textarea
                  value={representativeAddress}
                  onChange={(e) => setRepresentativeAddress(e.target.value)}
                  rows={2}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title={t('generatePoa.object')}>
            <div className="grid gap-4">
              <Field label={t('generatePoa.objectField')}>
                <Select
                  value={matterId}
                  onValueChange={(v) => setMatterId(v ?? '')}
                  disabled={!clientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('generatePoa.selectObject')}>
                      {matterId ? objectLabel || null : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(matters?.items ?? []).map((item) => {
                      const label = formatPoaObjectLine(
                        item.matterType,
                        matterObjectNumber(item),
                        item.title,
                      )
                      return (
                        <SelectItem key={item.id} value={item.id} label={label}>
                          {label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Textarea
                  className="mt-2"
                  value={poaObject}
                  onChange={(e) => setPoaObject(e.target.value)}
                  rows={2}
                />
              </Field>
            </div>
          </SectionCard>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={generate.isPending || !clientId || !matterId}>
            <FileText className="size-4" />
            {generate.isPending ? t('generatePoa.generating') : t('generatePoa.submit')}
          </Button>
        </form>
      </PermissionGate>
    </div>
  )
}
