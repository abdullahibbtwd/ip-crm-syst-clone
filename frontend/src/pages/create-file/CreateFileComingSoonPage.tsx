import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, FilePlus2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function kindLabelKey(kind: string | undefined, procedure: string | null): string {
  if (kind === 'patent' && procedure === 'registered') {
    return 'createFile.kinds.registeredPatent'
  }
  if (kind === 'patent') return 'createFile.kinds.newPatent'
  if (kind === 'design') return 'createFile.kinds.registeredDesign'
  if (kind === 'utility-model') return 'createFile.kinds.utilityModel'
  if (kind === 'gi') return 'createFile.kinds.registeredGi'
  if (kind === 'spc') return 'createFile.kinds.spc'
  if (kind === 'case') return 'createFile.kinds.case'
  return 'createFile.formTitle'
}

export function CreateFileComingSoonPage() {
  const { t } = useTranslation('matters')
  const { kind } = useParams<{ kind: string }>()
  const [searchParams] = useSearchParams()
  const label = t(kindLabelKey(kind, searchParams.get('procedure')))

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <div>
        <Link
          to="/matters"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-4 px-0')}
        >
          <ArrowLeft className="mr-1 size-4" />
          {t('createFile.backToFiles')}
        </Link>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <FilePlus2 className="size-6" />
          </div>
          <div>
            <h1 className="font-serif text-3xl tracking-tight text-foreground">
              {t('createFile.comingSoonTitle', { kind: label })}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {t('createFile.comingSoonBody')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
