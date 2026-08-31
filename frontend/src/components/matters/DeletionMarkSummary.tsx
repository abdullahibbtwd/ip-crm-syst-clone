import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientDisplayName } from '@/features/crm/utils'
import {
  deletionMarkTypeLabel,
  readDeletionFields,
} from '@/features/matters/deletion-matter'
import { formatNiceClasses } from '@/features/matters/trademark-list-utils'
import type { MatterDetail } from '@/features/matters/types'

type DeletionMarkSummaryProps = {
  matter: MatterDetail
}

function SummaryField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[minmax(130px,170px)_1fr] sm:gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {href ? (
        <Link to={href} className="text-sm text-primary hover:underline">
          {value}
        </Link>
      ) : (
        <span className="text-sm text-foreground">{value || '—'}</span>
      )}
    </div>
  )
}

export function DeletionMarkSummary({ matter }: DeletionMarkSummaryProps) {
  const { t } = useTranslation('matters')
  const fields = readDeletionFields(matter)

  const applicantLabel = matter.applicantClient
    ? clientDisplayName(matter.applicantClient)
    : clientDisplayName(matter.client)

  const markTypeLabel = deletionMarkTypeLabel(fields.markType, fields.territory)
  const classesLabel = formatNiceClasses(fields.niceClasses)

  return (
    <div className="rounded-xl border border-border/80 bg-background px-4 py-4 sm:px-5">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <SummaryField label={t('deletionView.markName')} value={fields.markName} />
          <SummaryField
            label={t('deletionView.applicationNumber')}
            value={fields.applicationNumber || '—'}
          />
          <SummaryField
            label={t('deletionView.applicationDate')}
            value={fields.applicationDate || '—'}
          />
          <SummaryField label={t('deletionView.markType')} value={markTypeLabel} />
          <SummaryField label={t('deletionView.classes')} value={classesLabel} />
          <SummaryField label={t('deletionView.applicant')} value={applicantLabel} />
          <SummaryField
            label={t('deletionView.representative')}
            value={fields.representative || '—'}
          />
          <p className="pt-1 text-xs text-muted-foreground">{t('deletionView.noMarkImage')}</p>
        </div>
        <div className="space-y-2 lg:min-w-[200px] lg:text-right">
          <SummaryField
            label={t('deletionView.againstClasses')}
            value={fields.againstClasses || '—'}
          />
          <SummaryField label={t('deletionView.submittedBy')} value={fields.submittedBy || '—'} />
        </div>
      </div>
    </div>
  )
}

function DeletionStageDivider() {
  return <div className="border-t border-dashed border-border/80" />
}

export { DeletionStageDivider }
