import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { AttorneyAssigneeSelect } from '@/components/users/AttorneyAssigneeSelect'
import { MatterAttributeFields } from '@/components/matters/MatterAttributeFields'
import { MatterPartyLink } from '@/components/matters/MatterPartyLink'
import { Badge } from '@/components/ui/badge'
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
import { useCreateMatter } from '@/features/matters/hooks/useMatters'
import type { MatterType } from '@/features/matters/types'
import { ALL_MATTER_TYPES, matterTypeLabel } from '@/features/matters/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { getCountryLabel } from '@/lib/countries'
import { useTranslation } from 'react-i18next'

const MATTER_TYPES = ALL_MATTER_TYPES

type CreateMatterDrawerProps = {
  clientId: string
  open: boolean
  onClose: () => void
}

export function CreateMatterDrawer({ clientId, open, onClose }: CreateMatterDrawerProps) {
  const { t } = useTranslation('matters')
  const navigate = useNavigate()
  const createMatter = useCreateMatter()

  const [matterType, setMatterType] = useState<MatterType>('trademark')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [jurisdictionCodes, setJurisdictionCodes] = useState<string[]>(['BG'])
  const [jurisdictionPicker, setJurisdictionPicker] = useState('')
  const [assignedToId, setAssignedToId] = useState<string | undefined>()
  const [applicantClientId, setApplicantClientId] = useState<string | undefined>()
  const [intermediaryClientId, setIntermediaryClientId] = useState<string | undefined>()
  const [attributes, setAttributes] = useState<Record<string, unknown>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setMatterType('trademark')
      setTitle('')
      setDescription('')
      setJurisdictionCodes(['BG'])
      setJurisdictionPicker('')
      setAssignedToId(undefined)
      setApplicantClientId(undefined)
      setIntermediaryClientId(undefined)
      setAttributes({})
      setError(null)
    }
  }, [open])

  useEffect(() => {
    setAttributes({})
  }, [matterType])

  const addJurisdiction = (code: string) => {
    if (!code || jurisdictionCodes.includes(code)) return
    setJurisdictionCodes((prev) => [...prev, code])
    setJurisdictionPicker('')
  }

  const removeJurisdiction = (code: string) => {
    setJurisdictionCodes((prev) => prev.filter((c) => c !== code))
  }

  const handleAttributeChange = (key: string, value: unknown) => {
    setAttributes((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Enter a matter title')
      return
    }
    if (jurisdictionCodes.length === 0) {
      setError('Select at least one jurisdiction')
      return
    }

    try {
      const matter = await createMatter.mutateAsync({
        clientId,
        applicantClientId,
        intermediaryClientId,
        matterType,
        title: title.trim(),
        description: description.trim() || undefined,
        status: 'active',
        assignedToId,
        jurisdictions: jurisdictionCodes.map((countryCode) => ({ countryCode })),
        attributes,
      })
      onClose()
      navigate(`/matters/${matter.id}`)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create matter'))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('createDrawer.title')} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">{t('createDrawer.matterType')}</label>
          <Select value={matterType} onValueChange={(v) => setMatterType(v as MatterType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATTER_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {matterTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Acme Dron trademark - EU"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief scope of the legal work"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Responsible attorney</label>
          <AttorneyAssigneeSelect value={assignedToId} onValueChange={setAssignedToId} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('parties.title')}</p>
          <p className="text-xs text-muted-foreground">{t('parties.hint')}</p>
          <MatterPartyLink
            label={t('parties.applicant')}
            hint={t('parties.applicantHint')}
            excludeClientId={clientId}
            value={applicantClientId}
            onChange={setApplicantClientId}
          />
          <MatterPartyLink
            label={t('parties.intermediary')}
            hint={t('parties.intermediaryHint')}
            excludeClientId={clientId}
            value={intermediaryClientId}
            onChange={setIntermediaryClientId}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Jurisdictions</label>
          <div className="flex gap-2">
            <CountrySelect
              value={jurisdictionPicker}
              onValueChange={addJurisdiction}
              placeholder="Add country…"
              className="flex-1"
            />
          </div>
          {jurisdictionCodes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {jurisdictionCodes.map((code) => (
                <Badge key={code} variant="secondary" className="gap-1 pr-1">
                  {getCountryLabel(code)} ({code})
                  <button
                    type="button"
                    onClick={() => removeJurisdiction(code)}
                    className="rounded-sm p-0.5 hover:bg-muted"
                    aria-label={`Remove ${getCountryLabel(code)}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Select at least one country.</p>
          )}
        </div>

        <MatterAttributeFields
          matterType={matterType}
          values={attributes}
          onChange={handleAttributeChange}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMatter.isPending}>
            {createMatter.isPending ? 'Creating…' : 'Open matter'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
