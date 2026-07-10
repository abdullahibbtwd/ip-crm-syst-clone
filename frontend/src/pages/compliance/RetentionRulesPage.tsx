import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { FlaskConical, Pencil, Plus } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
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
  useCreateRetentionRule,
  useRetentionDryRun,
  useRetentionRules,
  useUpdateRetentionRule,
} from '@/features/retention-rules/hooks/useRetentionRules'
import type {
  IntakeConditionPreset,
  RetentionAction,
  RetentionEntityType,
  RetentionRule,
} from '@/features/retention-rules/types'
import {
  ACTION_LABELS,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPES,
  conditionJsonFromPreset,
  conditionPresetFromJson,
  describeCondition,
  formatRetentionDuration,
} from '@/features/retention-rules/utils'
import { getApiErrorMessage } from '@/lib/api-client'
import { hasAnyRole, type SystemRole } from '@/lib/rbac'

type LayoutContext = { activeRole: SystemRole }

function RetentionRuleDrawer({
  open,
  onClose,
  rule,
}: {
  open: boolean
  onClose: () => void
  rule: RetentionRule | null
}) {
  const isEdit = Boolean(rule)
  const createRule = useCreateRetentionRule()
  const updateRule = useUpdateRetentionRule()

  const [entityType, setEntityType] = useState<RetentionEntityType>('intake_leads')
  const [conditionPreset, setConditionPreset] = useState<IntakeConditionPreset>('rejected')
  const [retentionDays, setRetentionDays] = useState('730')
  const [action, setAction] = useState<RetentionAction>('anonymize')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (rule) {
      const et = (ENTITY_TYPES.includes(rule.entityType as RetentionEntityType)
        ? rule.entityType
        : 'intake_leads') as RetentionEntityType
      setEntityType(et)
      setConditionPreset(conditionPresetFromJson(rule.entityType, rule.conditionJson))
      setRetentionDays(String(rule.retentionDays))
      setAction(rule.action)
      setDescription(rule.description ?? '')
      setIsActive(rule.isActive)
    } else {
      setEntityType('intake_leads')
      setConditionPreset('rejected')
      setRetentionDays('730')
      setAction('anonymize')
      setDescription('')
      setIsActive(true)
    }
    setError(null)
  }, [open, rule])

  useEffect(() => {
    if (entityType === 'audit_logs') {
      setAction('delete')
      setConditionPreset('none')
    }
  }, [entityType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const days = Number(retentionDays)
    if (!days || days < 1) {
      setError('Enter a valid retention period in days')
      return
    }

    const confirmed = window.confirm(
      'Retention rules run on the nightly scan job (default 3:00 AM). Continue saving?',
    )
    if (!confirmed) return

    const conditionJson = conditionJsonFromPreset(entityType, conditionPreset)

    try {
      if (isEdit && rule) {
        await updateRule.mutateAsync({
          id: rule.id,
          data: {
            conditionJson,
            retentionDays: days,
            action,
            description: description.trim() || null,
            isActive,
          },
        })
      } else {
        await createRule.mutateAsync({
          entityType,
          conditionJson,
          retentionDays: days,
          action,
          description: description.trim() || undefined,
        })
      }
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save retention rule'))
    }
  }

  const pending = createRule.isPending || updateRule.isPending

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit retention rule' : 'New retention rule'}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {!isEdit && (
          <div className="space-y-2">
            <Label>Entity type</Label>
            <Select
              value={entityType}
              onValueChange={(v) => setEntityType((v as RetentionEntityType) ?? 'intake_leads')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ENTITY_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isEdit && rule && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {ENTITY_TYPE_LABELS[rule.entityType as RetentionEntityType] ?? rule.entityType}
          </div>
        )}

        {entityType === 'intake_leads' && (
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select
              value={conditionPreset}
              onValueChange={(v) =>
                setConditionPreset((v as IntakeConditionPreset) ?? 'rejected')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rejected">Status = rejected</SelectItem>
                <SelectItem value="not_converted">Not converted (excl. rejected)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {entityType === 'audit_logs' && (
          <p className="text-xs text-muted-foreground">
            Audit log rules apply to all records older than the retention period. Action is always
            delete.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="retention-days">Retention (days)</Label>
          <Input
            id="retention-days"
            type="number"
            min="1"
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
          />
          {Number(retentionDays) > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatRetentionDuration(Number(retentionDays))}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Action</Label>
          <Select
            value={action}
            onValueChange={(v) => setAction((v as RetentionAction) ?? 'anonymize')}
            disabled={entityType === 'audit_logs'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anonymize">Anonymize</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="retention-description">Description</Label>
          <Textarea
            id="retention-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {isEdit && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(v) => setIsActive(v === 'active')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {isEdit ? 'Save changes' : 'Create rule'}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export function RetentionRulesPage() {
  const { activeRole } = useOutletContext<LayoutContext>()
  const canManage = hasAnyRole([activeRole], ['managing_partner', 'dpo_compliance'])
  const { data: rules, isLoading, isError } = useRetentionRules()
  const dryRun = useRetentionDryRun()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RetentionRule | null>(null)
  const [dryRunMessage, setDryRunMessage] = useState<string | null>(null)

  const handleDryRun = async (id: string) => {
    setDryRunMessage(null)
    try {
      const result = await dryRun.mutateAsync(id)
      setDryRunMessage(
        `Dry run: would affect ${result.wouldAffect} record${result.wouldAffect === 1 ? '' : 's'} (cutoff ${new Date(result.cutoff).toLocaleDateString()}).`,
      )
    } catch (err) {
      setDryRunMessage(getApiErrorMessage(err, 'Dry run failed'))
    }
  }

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to manage retention rules.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">Retention rules</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            GDPR retention policies enforced by the nightly scan job (default 3:00 AM). Use dry-run
            to preview how many records would be affected.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingRule(null)
            setDrawerOpen(true)
          }}
        >
          <Plus className="mr-1 size-4" />
          New rule
        </Button>
      </div>

      {dryRunMessage && (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{dryRunMessage}</p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading retention rules…</p>}
      {isError && <p className="text-sm text-destructive">Failed to load retention rules.</p>}

      {rules && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Retention</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No retention rules yet.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    {ENTITY_TYPE_LABELS[rule.entityType as RetentionEntityType] ?? rule.entityType}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {describeCondition(rule.entityType, rule.conditionJson)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatRetentionDuration(rule.retentionDays)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.action === 'delete' ? 'destructive' : 'secondary'}>
                      {ACTION_LABELS[rule.action] ?? rule.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? 'info' : 'secondary'}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                    {rule.description ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={dryRun.isPending}
                        onClick={() => handleDryRun(rule.id)}
                        aria-label="Dry-run retention rule"
                        title="Dry run"
                      >
                        <FlaskConical className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingRule(rule)
                          setDrawerOpen(true)
                        }}
                        aria-label="Edit retention rule"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <p className="text-sm text-muted-foreground">
        View purge history in the{' '}
        <Link to="/compliance/audit-trail" className="text-primary hover:underline">
          audit trail
        </Link>{' '}
        (filter action: <code className="rounded bg-muted px-1">retention_rule_executed</code>).
      </p>

      <RetentionRuleDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingRule(null)
        }}
        rule={editingRule}
      />
    </div>
  )
}
