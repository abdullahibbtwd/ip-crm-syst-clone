import { Link } from 'react-router-dom'
import { ArrowLeft, FileOutput } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { FilingVolumesReport } from '@/components/reports/FilingVolumesReport'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FilingVolumesReportPage() {
  const { t } = useTranslation(['reports', 'common'])

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-brand-green/12 bg-gradient-to-br from-brand-green via-brand-green to-[#12302a] px-6 py-7 text-white md:px-8 md:py-8">
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
              <FileOutput className="size-6" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/60">
                {t('common:reports.eyebrow')}
              </p>
              <h1 className="mt-1 font-serif text-2xl text-white md:text-3xl">
                {t('filingVolumes.title')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
                {t('filingVolumes.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
      <FilingVolumesReport />
    </div>
  )
}
