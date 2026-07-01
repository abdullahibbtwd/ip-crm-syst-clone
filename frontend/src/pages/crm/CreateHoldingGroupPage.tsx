import { Link, useNavigate } from 'react-router-dom'
import { CreateHoldingGroupForm } from '@/components/crm/CreateHoldingGroupForm'
import { buttonVariants } from '@/components/ui/button'
import { useCreateHoldingGroup } from '@/features/crm/hooks/useHoldingGroups'
import { cn } from '@/lib/utils'

export function CreateHoldingGroupPage() {
  const navigate = useNavigate()
  const createHoldingGroup = useCreateHoldingGroup()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/holding-groups"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
      >
        ← Back to holding groups
      </Link>

      <div>
        <h1 className="font-serif text-2xl text-foreground">New holding group</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a parent umbrella for related client entities.
        </p>
      </div>

      <CreateHoldingGroupForm
        isSubmitting={createHoldingGroup.isPending}
        onSubmit={async (data) => {
          const group = await createHoldingGroup.mutateAsync(data)
          navigate(`/holding-groups/${group.id}`, { replace: true })
        }}
      />
    </div>
  )
}
