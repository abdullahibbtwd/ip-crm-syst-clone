import { useState } from 'react'
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
import { JURISDICTION_OPTIONS } from '@/features/deadlines/utils'
import { useCreateWatchProfile } from '@/features/watch/hooks/useWatch'
import type { WatchFrequency } from '@/features/watch/types'
import { cn } from '@/lib/utils'

type CreateWatchProfileDrawerProps = {
  open: boolean
  onClose: () => void
  clientId: string
}

function parseNiceClasses(raw: string) {
  return raw
    .split(/[,;\s]+/)
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 45)
}

export function CreateWatchProfileDrawer({
  open,
  onClose,
  clientId,
}: CreateWatchProfileDrawerProps) {
  const { t } = useTranslation('watch')
  const create = useCreateWatchProfile(clientId)

  const [markText, setMarkText] = useState('')
  const [jurisdictions, setJurisdictions] = useState<string[]>([])
  const [niceClassesRaw, setNiceClassesRaw] = useState('')
  const [frequency, setFrequency] = useState<WatchFrequency>('weekly')

  const toggleJurisdiction = (code: string) => {
    setJurisdictions((prev) =>
      prev.includes(code) ? prev.filter((j) => j !== code) : [...prev, code],
    )
  }

  const reset = () => {
    setMarkText('')
    setJurisdictions([])
    setNiceClassesRaw('')
    setFrequency('weekly')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!markText.trim() || jurisdictions.length === 0) return

    await create.mutateAsync({
      markText: markText.trim(),
      jurisdictions,
      niceClasses: parseNiceClasses(niceClassesRaw),
      frequency,
    })

    reset()
    onClose()
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('drawer.title')} className="max-w-lg">
      <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
        <div className="space-y-2">
          <Label htmlFor="watch-mark">{t('drawer.markText')}</Label>
          <Input
            id="watch-mark"
            value={markText}
            onChange={(e) => setMarkText(e.target.value)}
            placeholder={t('drawer.markPlaceholder')}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>{t('drawer.jurisdictions')}</Label>
          <p className="text-xs text-muted-foreground">{t('drawer.jurisdictionsHint')}</p>
          <div className="flex flex-wrap gap-2">
            {JURISDICTION_OPTIONS.map((opt) => {
              const selected = jurisdictions.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleJurisdiction(opt.value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    selected
                      ? 'border-primary bg-primary/12 font-medium text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="watch-classes">{t('drawer.niceClasses')}</Label>
          <Input
            id="watch-classes"
            value={niceClassesRaw}
            onChange={(e) => setNiceClassesRaw(e.target.value)}
            placeholder={t('drawer.niceClassesPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('drawer.frequency')}</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as WatchFrequency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{t('frequency.daily')}</SelectItem>
              <SelectItem value="weekly">{t('frequency.weekly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={create.isPending || !markText.trim() || jurisdictions.length === 0}
          >
            {t('drawer.save')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
