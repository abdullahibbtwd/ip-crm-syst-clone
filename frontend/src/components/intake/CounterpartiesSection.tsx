import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { CounterpartiesEditor } from '@/components/intake/CounterpartiesEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useAddCounterparty,
  useRemoveCounterparty,
} from '@/features/intake/hooks/useIntake'
import { counterpartySchema, type CounterpartyFormValues } from '@/features/intake/schemas'
import type { Counterparty, IntakeStatus } from '@/features/intake/types'
import { COUNTERPARTY_RELATIONSHIP_LABELS } from '@/features/intake/utils'
import { getApiErrorMessage } from '@/lib/api-client'

type CounterpartiesSectionProps = {
  intakeId: string
  status: IntakeStatus
  counterparties: Counterparty[]
}

export function CounterpartiesSection({
  intakeId,
  status,
  counterparties,
}: CounterpartiesSectionProps) {
  const editable = status !== 'converted' && status !== 'rejected'
  const addCounterparty = useAddCounterparty(intakeId)
  const removeCounterparty = useRemoveCounterparty(intakeId)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<CounterpartyFormValues[]>([
    { name: '', company: '', relationship: 'adverse_party', notes: '' },
  ])
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    setError(null)
    const parsed = counterpartySchema.safeParse(draft[0])
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid counterparty')
      return
    }
    try {
      await addCounterparty.mutateAsync(parsed.data)
      setShowForm(false)
      setDraft([{ name: '', company: '', relationship: 'adverse_party', notes: '' }])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to add counterparty'))
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Adverse parties / competitors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Who is on the other side of this matter? These names are included in the conflict check.
        </p>

        {counterparties.length > 0 && (
          <ul className="space-y-2">
            {counterparties.map((cp) => (
              <li key={cp.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {[cp.name, cp.company].filter(Boolean).join(' / ') || 'Unnamed party'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {COUNTERPARTY_RELATIONSHIP_LABELS[cp.relationship]}
                  </p>
                  {cp.notes && <p className="mt-1 text-muted-foreground">{cp.notes}</p>}
                </div>
                {editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={removeCounterparty.isPending}
                    onClick={() => removeCounterparty.mutate(cp.id)}
                    aria-label="Remove counterparty"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable && !showForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
            Add party
          </Button>
        )}

        {editable && showForm && (
          <div className="space-y-3 border-t pt-4">
            <CounterpartiesEditor value={draft} onChange={setDraft} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleAdd}
                disabled={addCounterparty.isPending}
              >
                {addCounterparty.isPending ? 'Saving…' : 'Save party'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
