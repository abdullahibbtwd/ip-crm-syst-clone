import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CreateIntakeForm } from '@/components/intake/CreateIntakeForm'
import { buttonVariants } from '@/components/ui/button'
import { useCreateIntake } from '@/features/intake/hooks/useIntake'
import { cn } from '@/lib/utils'

export function CreateIntakePage() {
  const { t } = useTranslation('intake')
  const navigate = useNavigate()
  const createIntake = useCreateIntake()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/intake"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
      >
        {t('create.back')}
      </Link>

      <div>
        <h1 className="font-serif text-2xl text-foreground">{t('create.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('create.description')}</p>
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
