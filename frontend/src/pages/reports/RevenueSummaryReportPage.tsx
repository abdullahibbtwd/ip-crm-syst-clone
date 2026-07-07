import { Link } from 'react-router-dom'
import { ArrowLeft, PieChart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RevenueSummaryReport } from '@/components/reports/RevenueSummaryReport'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function RevenueSummaryReportPage() {
  const { t } = useTranslation(['reports', 'common'])

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-brand-green/12 bg-gradient-to-br from-brand-green via-brand-green to-[#12302a] px-6 py-7 text-white md:px-8 md:py-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <Link
            to="/dashboard"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'mb-4 -ml-2 text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            <ArrowLeft className="size-3.5" />
            {t('common:actions.backToDashboard')}
          </Link>
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-primary">
              <PieChart className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-widest text-white/60">
                {t('common:reports.eyebrow')}
              </p>
              <h1 className="mt-1 font-serif text-2xl text-white md:text-3xl">
                {t('revenueSummary.title')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
                {t('revenueSummary.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <RevenueSummaryReport />
    </div>
  )
}
