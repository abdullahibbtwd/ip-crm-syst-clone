import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MatterFileArchiveSection } from '@/components/matters/MatterFileArchiveSection'
import { OPPOSITION_ARCHIVE_TAG } from '@/features/matters/opposition-matter'
import { usePermission } from '@/hooks/usePermission'
import type { MatterTabContext } from '../MatterLayout'

export function OppositionArchiveTab() {
  const { t } = useTranslation('matters')
  const { matter } = useOutletContext<MatterTabContext>()
  const canUpdate = usePermission('matter', 'update')

  return (
    <div className="mx-auto max-w-3xl">
      <MatterFileArchiveSection
        matterId={matter.id}
        title={t('oppositionView.archiveTitle')}
        canUpload={canUpdate}
        uploadTag={OPPOSITION_ARCHIVE_TAG}
      />
    </div>
  )
}
