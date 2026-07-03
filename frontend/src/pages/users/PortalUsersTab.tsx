import { UsersListPanel } from './UsersListPanel'

export function PortalUsersTab() {
  return (
    <UsersListPanel
      segment="portal"
      title="Portal users"
      description="Client portal accounts created via self-registration or SSO signup. Each user is linked to a client record."
    />
  )
}
