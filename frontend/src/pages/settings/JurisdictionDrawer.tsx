import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from '@/components/crm/Drawer'
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
import {
  useCreateJurisdiction,
  useUpdateJurisdiction,
} from '@/features/jurisdictions/hooks/useJurisdictions'
import type { Jurisdiction, JurisdictionType } from '@/features/jurisdictions/types'
import { getApiErrorMessage } from '@/lib/api-client'

export function JurisdictionDrawer({
  open,
  onClose,
  jurisdiction,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  jurisdiction: Jurisdiction | null
  /** Called after successful create with the new code (for navigate-to-hub). */
  onCreated?: (code: string) => void
}) {
  const { t } = useTranslation('settings')
  const isEdit = Boolean(jurisdiction)
  const createJurisdiction = useCreateJurisdiction()
  const updateJurisdiction = useUpdateJurisdiction()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [officeName, setOfficeName] = useState('')
  const [type, setType] = useState<JurisdictionType>('national')
  const [isPriority, setIsPriority] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('100')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (jurisdiction) {
      setCode(jurisdiction.code)
      setName(jurisdiction.name)
      setOfficeName(jurisdiction.officeName)
      setType(jurisdiction.type)
      setIsPriority(jurisdiction.isPriority)
      setIsActive(jurisdiction.isActive)
      setSortOrder(String(jurisdiction.sortOrder))
    } else {
      setCode('')
      setName('')
      setOfficeName('')
      setType('national')
      setIsPriority(false)
      setIsActive(true)
      setSortOrder('100')
    }
    setError(null)
  }, [open, jurisdiction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const order = Number(sortOrder)
    if (!name.trim() || !officeName.trim()) {
      setError(t('jurisdictions.errors.required'))
      return
    }
    if (!isEdit && !code.trim()) {
      setError(t('jurisdictions.errors.codeRequired'))
      return
    }
    if (Number.isNaN(order) || order < 0) {
      setError(t('jurisdictions.errors.sortOrder'))
      return
    }

    try {
      if (isEdit && jurisdiction) {
        await updateJurisdiction.mutateAsync({
          id: jurisdiction.id,
          data: {
            name: name.trim(),
            officeName: officeName.trim(),
            type,
            isPriority,
            isActive,
            sortOrder: order,
          },
        })
        onClose()
      } else {
        const created = await createJurisdiction.mutateAsync({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          officeName: officeName.trim(),
          type,
          isPriority,
          isActive,
          sortOrder: order,
        })
        onClose()
        onCreated?.(created.code)
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('jurisdictions.errors.saveFailed')))
    }
  }

  const pending = createJurisdiction.isPending || updateJurisdiction.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? t('jurisdictions.drawer.editTitle')
          : t('jurisdictions.drawer.createTitle')
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="jurisdiction-code">{t('jurisdictions.drawer.code')}</Label>
          <Input
            id="jurisdiction-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={isEdit}
            maxLength={4}
            placeholder="US"
          />
          <p className="text-xs text-muted-foreground">
            {t('jurisdictions.drawer.codeHint')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="jurisdiction-office">
            {t('jurisdictions.drawer.officeName')}
          </Label>
          <Input
            id="jurisdiction-office"
            value={officeName}
            onChange={(e) => setOfficeName(e.target.value)}
            placeholder="USPTO"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jurisdiction-name">{t('jurisdictions.drawer.name')}</Label>
          <Input
            id="jurisdiction-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="United States"
          />
        </div>

        <div className="space-y-2">
          <Label>{t('jurisdictions.drawer.type')}</Label>
          <Select
            value={type}
            onValueChange={(v) => setType((v as JurisdictionType) ?? 'national')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="national">
                {t('jurisdictions.type.national')}
              </SelectItem>
              <SelectItem value="regional">
                {t('jurisdictions.type.regional')}
              </SelectItem>
              <SelectItem value="international">
                {t('jurisdictions.type.international')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t('jurisdictions.drawer.priority')}</Label>
            <Select
              value={isPriority ? 'yes' : 'no'}
              onValueChange={(v) => setIsPriority(v === 'yes')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{t('jurisdictions.priority.yes')}</SelectItem>
                <SelectItem value="no">{t('jurisdictions.priority.no')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('jurisdictions.drawer.status')}</Label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(v) => setIsActive(v === 'active')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  {t('jurisdictions.status.active')}
                </SelectItem>
                <SelectItem value="inactive">
                  {t('jurisdictions.status.inactive')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="jurisdiction-sort">
            {t('jurisdictions.drawer.sortOrder')}
          </Label>
          <Input
            id="jurisdiction-sort"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('jurisdictions.drawer.cancel')}
          </Button>
          <Button type="submit" disabled={pending}>
            {isEdit
              ? t('jurisdictions.drawer.save')
              : t('jurisdictions.drawer.create')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
