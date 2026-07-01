import { Link, useNavigate } from 'react-router-dom'
import { CreateIntakeForm } from '@/components/intake/CreateIntakeForm'
import { buttonVariants } from '@/components/ui/button'
import { useCreateIntake } from '@/features/intake/hooks/useIntake'
import { cn } from '@/lib/utils'

export function CreateIntakePage() {
  const navigate = useNavigate()
  const createIntake = useCreateIntake()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/intake"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
      >
        ← Back to intake
      </Link>

      <div>
        <h1 className="font-serif text-2xl text-foreground">New enquiry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log a new lead before conflict check and client conversion.
        </p>
      </div>

      <CreateIntakeForm
        isSubmitting={createIntake.isPending}
        onSubmit={async (data) => {
          const lead = await createIntake.mutateAsync(data)
          navigate(`/intake/${lead.id}`, { replace: true })
        }}
      />
    </div>
  )
}
