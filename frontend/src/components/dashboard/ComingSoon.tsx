import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type ComingSoonProps = {
  title?: string
  description?: string
  className?: string
  compact?: boolean
}

export function ComingSoon({
  title,
  description,
  className,
  compact = false,
}: ComingSoonProps) {
  const { t } = useTranslation('dashboard')

  const resolvedTitle = title ?? t('comingSoon.title')
  const resolvedDescription = description ?? t('comingSoon.description')

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-dashed border-brand-green/20 bg-brand-green/[0.02] transition-colors hover:bg-brand-green/[0.04]',
        compact ? '' : 'shadow-xs',
        className,
      )}
    >
      <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 blur-2xl" aria-hidden />

      <div
        className={cn(
          'relative flex flex-col items-center text-center',
          compact ? 'px-6 py-10' : 'px-8 py-16 md:py-20',
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-green/[0.06] text-brand-green shadow-sm ring-1 ring-brand-green/10">
          <Construction className="size-6 opacity-80" aria-hidden />
        </div>
        <h2 className="mt-6 font-serif text-xl font-medium tracking-tight text-brand-green">{resolvedTitle}</h2>
        <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-muted-foreground/80">
          {resolvedDescription}
        </p>
        {!compact && (
          <div className="mt-8 h-1 w-12 rounded-full bg-primary/20" />
        )}
      </div>
    </div>
  )
}
