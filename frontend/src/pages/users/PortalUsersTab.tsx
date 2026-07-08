import { useTranslation } from 'react-i18next'
import { UsersListPanel } from './UsersListPanel'

export function PortalUsersTab() {
  const { t } = useTranslation('users')
  return (
    <UsersListPanel
      segment="portal"
      title={t('portal.title')}
      description={t('portal.description')}
    />
  )
}
