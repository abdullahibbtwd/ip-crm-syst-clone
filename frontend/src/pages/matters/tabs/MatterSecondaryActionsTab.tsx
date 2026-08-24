import { useOutletContext } from 'react-router-dom'
import { SecondaryActionsTable } from '@/components/matters/SecondaryActionsTable'
import { usePermission } from '@/hooks/usePermission'
import type { MatterTabContext } from '../MatterLayout'

export function MatterSecondaryActionsTab() {
  const { matter } = useOutletContext<MatterTabContext>()
  const canUpdate = usePermission('matter', 'update')
  const canCreateDocument = usePermission('document', 'create')

  return (
    <SecondaryActionsTable
      matter={matter}
      canUpload={canUpdate && canCreateDocument && !matter.isArchived}
    />
  )
}
