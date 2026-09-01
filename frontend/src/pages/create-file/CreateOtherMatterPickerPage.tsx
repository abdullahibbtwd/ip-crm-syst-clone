import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight, FilePlus2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  OTHER_MATTER_TYPES,
  otherMatterCreatePath,
} from '@/features/create-file/other-matter-routes'
import { matterTypeLabel } from '@/features/matters/utils'
import { cn } from '@/lib/utils'

export function CreateOtherMatterPickerPage() {
  const { t } = useTranslation('matters')

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <div>
        <Link
          to="/matters?group=others"
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
              {t('createFile.otherFilesTitle')}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {t('createFile.otherFilesDescription')}
            </p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        {OTHER_MATTER_TYPES.map((type) => (
          <li key={type}>
            <Link
              to={otherMatterCreatePath(type)}
              className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
            >
              <span className="text-sm font-medium text-foreground">
                {matterTypeLabel(type)}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
