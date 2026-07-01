import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CounterpartyFormValues } from '@/features/intake/schemas'
import { COUNTERPARTY_RELATIONSHIP_LABELS } from '@/features/intake/utils'

const emptyRow = (): CounterpartyFormValues => ({
  name: '',
  company: '',
  relationship: 'adverse_party',
  notes: '',
})

type CounterpartiesEditorProps = {
  value: CounterpartyFormValues[]
  onChange: (rows: CounterpartyFormValues[]) => void
  disabled?: boolean
}

export function CounterpartiesEditor({ value, onChange, disabled }: CounterpartiesEditorProps) {
  const updateRow = (index: number, patch: Partial<CounterpartyFormValues>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No adverse parties or competitors recorded yet.
        </p>
      )}

      {value.map((row, index) => (
        <div key={index} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Party {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={() => removeRow(index)}
              aria-label="Remove party"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={row.name ?? ''}
                disabled={disabled}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                placeholder="Person or entity name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={row.company ?? ''}
                disabled={disabled}
                onChange={(e) => updateRow(index, { company: e.target.value })}
                placeholder="Company on the other side"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Relationship *</Label>
              <Select
                value={row.relationship}
                disabled={disabled}
                onValueChange={(v) =>
                  updateRow(index, { relationship: v as CounterpartyFormValues['relationship'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COUNTERPARTY_RELATIONSHIP_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={row.notes ?? ''}
                disabled={disabled}
                onChange={(e) => updateRow(index, { notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => onChange([...value, emptyRow()])}
      >
        <Plus className="size-4" />
        Add adverse party / competitor
      </Button>
    </div>
  )
}
