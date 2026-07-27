import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CreateHoldingGroupForm } from '@/components/crm/CreateHoldingGroupForm'
import { buttonVariants } from '@/components/ui/button'
import { useCreateHoldingGroup } from '@/features/crm/hooks/useHoldingGroups'
import { cn } from '@/lib/utils'

export function CreateHoldingGroupPage() {
  const { t } = useTranslation('crm')
  const navigate = useNavigate()
  const createHoldingGroup = useCreateHoldingGroup()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        to="/holding-groups"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-0')}
      >
        {t('holdingGroups.back')}
      </Link>

      <div>
        <h1 className="font-serif text-2xl text-foreground">{t('holdingGroups.new')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('holdingGroups.detailDescription')}
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
