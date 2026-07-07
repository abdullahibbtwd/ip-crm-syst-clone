import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DueTodayAlertProps = {
  count: number
  linkTo?: string
  label?: string
  className?: string
}

export function DueTodayAlert({
  count,
  linkTo = '/deadlines/my',
  label,
  className,
}: DueTodayAlertProps) {
  const { t } = useTranslation('deadlines')

  if (count <= 0) return null

  const message = label ?? t('dueTodayAlert.personal', { count })

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent px-4 py-3',
        className,
      )}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-600">
          <AlertCircle className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{t('dueTodayAlert.title')}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      <Link to={linkTo} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        {t('dueTodayAlert.view')}
      </Link>
    </div>
  )
}
