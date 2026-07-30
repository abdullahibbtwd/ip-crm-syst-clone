import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateDeadlineRule,
  useDeadlineRules,
  useUpdateDeadlineRule,
} from '@/features/deadline-rules/hooks/useDeadlineRules'
import type {
  DeadlineEventType,
  DeadlineRule,
  DeadlineRuleTriggerType,
} from '@/features/deadline-rules/types'
import {
  EVENT_TYPES,
  TRIGGER_TYPES,
  eventTypeLabel,
  formatDaysOffset,
  triggerTypeLabel,
} from '@/features/deadline-rules/utils'
import { MATTER_TYPE_LABELS } from '@/features/matters/utils'
import type { MatterType } from '@/features/matters/types'
import { getApiErrorMessage } from '@/lib/api-client'
import { useQueryClient } from '@tanstack/react-query'
import { jurisdictionsKeys } from '@/features/jurisdictions/queryKeys'

const MATTER_TYPES = Object.keys(MATTER_TYPE_LABELS) as MatterType[]

function DeadlineRuleDrawer({
  open,
  onClose,
  rule,
  lockedJurisdiction,
}: {
  open: boolean
  onClose: () => void
  rule: DeadlineRule | null
  lockedJurisdiction: string
}) {
  const { t } = useTranslation('settings')
  const isEdit = Boolean(rule)
  const createRule = useCreateDeadlineRule()
  const updateRule = useUpdateDeadlineRule()
  const qc = useQueryClient()

  const [matterType, setMatterType] = useState<MatterType>('trademark')
  const [eventType, setEventType] = useState<DeadlineEventType>('examination_response')
  const [triggerType, setTriggerType] = useState<DeadlineRuleTriggerType>('matter_created')
  const [daysOffset, setDaysOffset] = useState('90')
  const [isBusinessDays, setIsBusinessDays] = useState(true)
  const [gracePeriodDays, setGracePeriodDays] = useState('0')
  const [priority, setPriority] = useState('2')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (rule) {
      setMatterType(rule.matterType)
      setEventType(rule.eventType)
      setTriggerType(rule.triggerType)
      setDaysOffset(String(rule.daysOffset))
      setIsBusinessDays(rule.isBusinessDays)
      setGracePeriodDays(String(rule.gracePeriodDays))
      setPriority(String(rule.priority))
      setDescription(rule.description ?? '')
      setIsActive(rule.isActive)
    } else {
      setMatterType('trademark')
      setEventType('examination_response')
      setTriggerType('matter_created')
      setDaysOffset('90')
      setIsBusinessDays(true)
      setGracePeriodDays('0')
      setPriority('2')
      setDescription('')
      setIsActive(true)
    }
    setError(null)
  }, [open, rule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const offset = Number(daysOffset)
    const grace = Number(gracePeriodDays)
    const prio = Number(priority)
    if (Number.isNaN(offset)) {
      setError(t('deadlineRules.errors.daysOffset'))
      return
    }
    if (Number.isNaN(grace) || grace < 0) {
      setError(t('deadlineRules.errors.grace'))
      return
    }
    if (Number.isNaN(prio) || prio < 1 || prio > 10) {
      setError(t('deadlineRules.errors.priority'))
      return
    }

    try {
      if (isEdit && rule) {
        await updateRule.mutateAsync({
          id: rule.id,
          data: {
            daysOffset: offset,
            isBusinessDays,
            gracePeriodDays: grace,
            priority: prio,
            description: description.trim() || null,
            isActive,
          },
        })
      } else {
        await createRule.mutateAsync({
          jurisdiction: lockedJurisdiction,
          matterType,
          eventType,
          triggerType,
          daysOffset: offset,
          isBusinessDays,
          gracePeriodDays: grace,
          priority: prio,
          description: description.trim() || undefined,
        })
      }
      void qc.invalidateQueries({ queryKey: jurisdictionsKeys.all })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('deadlineRules.errors.saveFailed')))
    }
  }

  const pending = createRule.isPending || updateRule.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? t('deadlineRules.drawer.editTitle') : t('deadlineRules.drawer.createTitle')}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {!isEdit && (
          <>
            <div className="space-y-2">
              <Label>{t('deadlineRules.drawer.matterType')}</Label>
              <Select
                value={matterType}
                onValueChange={(v) => setMatterType((v as MatterType) ?? 'trademark')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATTER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {MATTER_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('deadlineRules.drawer.eventType')}</Label>
              <Select
                value={eventType}
                onValueChange={(v) =>
                  setEventType((v as DeadlineEventType) ?? 'examination_response')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {eventTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('deadlineRules.drawer.triggerType')}</Label>
              <Select
                value={triggerType}
                onValueChange={(v) =>
                  setTriggerType((v as DeadlineRuleTriggerType) ?? 'matter_created')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {triggerTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {isEdit && rule && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {MATTER_TYPE_LABELS[rule.matterType]} · {eventTypeLabel(rule.eventType)} ·{' '}
            {triggerTypeLabel(rule.triggerType)}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="days-offset">{t('deadlineRules.drawer.daysOffset')}</Label>
          <Input
            id="days-offset"
            type="number"
            value={daysOffset}
            onChange={(e) => setDaysOffset(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('deadlineRules.drawer.dayCounting')}</Label>
          <Select
            value={isBusinessDays ? 'business' : 'calendar'}
            onValueChange={(v) => setIsBusinessDays(v === 'business')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="business">{t('deadlineRules.drawer.businessDays')}</SelectItem>
              <SelectItem value="calendar">{t('deadlineRules.drawer.calendarDays')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="grace-days">{t('deadlineRules.drawer.gracePeriod')}</Label>
          <Input
            id="grace-days"
            type="number"
            min="0"
            value={gracePeriodDays}
            onChange={(e) => setGracePeriodDays(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">{t('deadlineRules.drawer.priority')}</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            max="10"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('deadlineRules.drawer.description')}</Label>
          <Textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {isEdit && (
          <div className="space-y-2">
            <Label>{t('deadlineRules.drawer.status')}</Label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(v) => setIsActive(v === 'active')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('deadlineRules.status.active')}</SelectItem>
                <SelectItem value="inactive">{t('deadlineRules.status.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('deadlineRules.drawer.cancel')}
          </Button>
          <Button type="submit" disabled={pending}>
            {isEdit ? t('deadlineRules.drawer.save') : t('deadlineRules.drawer.create')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

type DeadlineRulesPanelProps = {
  jurisdictionCode: string
}

export function DeadlineRulesPanel({ jurisdictionCode }: DeadlineRulesPanelProps) {
  const { t } = useTranslation('settings')
  const [matterType, setMatterType] = useState<string>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<DeadlineRule | null>(null)

  const { data: rules, isLoading, isError } = useDeadlineRules({
    jurisdiction: jurisdictionCode,
    matterType: matterType === 'all' ? undefined : (matterType as MatterType),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={matterType} onValueChange={(v) => setMatterType(v ?? 'all')}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t('deadlineRules.filters.matterType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('deadlineRules.allMatterTypes')}</SelectItem>
            {MATTER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {MATTER_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <PermissionGate resource="deadline" action="create">
          <Button
            type="button"
            onClick={() => {
              setEditingRule(null)
              setDrawerOpen(true)
            }}
          >
            <Plus className="mr-1 size-4" />
            {t('deadlineRules.newRule')}
          </Button>
        </PermissionGate>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('deadlineRules.loading')}</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">{t('deadlineRules.loadError')}</p>
      )}

      {rules && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('deadlineRules.columns.matterType')}</TableHead>
              <TableHead>{t('deadlineRules.columns.event')}</TableHead>
              <TableHead>{t('deadlineRules.columns.trigger')}</TableHead>
              <TableHead>{t('deadlineRules.columns.offset')}</TableHead>
              <TableHead>{t('deadlineRules.columns.grace')}</TableHead>
              <TableHead>{t('deadlineRules.columns.priority')}</TableHead>
              <TableHead>{t('deadlineRules.columns.status')}</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t('jurisdictions.hub.noRules')}
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="text-muted-foreground">
                    {MATTER_TYPE_LABELS[rule.matterType] ?? rule.matterType}
                  </TableCell>
                  <TableCell>{eventTypeLabel(rule.eventType)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {triggerTypeLabel(rule.triggerType)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDaysOffset(rule.daysOffset, rule.isBusinessDays)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {rule.gracePeriodDays}d
                  </TableCell>
                  <TableCell>{rule.priority}</TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? 'info' : 'secondary'}>
                      {rule.isActive
                        ? t('deadlineRules.status.active')
                        : t('deadlineRules.status.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PermissionGate resource="deadline" action="update">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingRule(rule)
                          setDrawerOpen(true)
                        }}
                        aria-label={t('deadlineRules.editAria')}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <DeadlineRuleDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingRule(null)
        }}
        rule={editingRule}
        lockedJurisdiction={jurisdictionCode}
      />
    </div>
  )
}
