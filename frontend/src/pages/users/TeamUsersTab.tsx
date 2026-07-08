import { useTranslation } from 'react-i18next'
import { UsersListPanel } from './UsersListPanel'

export function TeamUsersTab() {
  const { t } = useTranslation('users')
  return (
    <UsersListPanel
      segment="team"
      title={t('team.title')}
      description={t('team.description')}
    />
  )
}
