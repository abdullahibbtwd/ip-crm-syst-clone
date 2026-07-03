import { UsersListPanel } from './UsersListPanel'

export function TeamUsersTab() {
  return (
    <UsersListPanel
      segment="team"
      title="Team members"
      description="Internal staff with firm roles — attorneys, coordinators, finance, IT, and administration. Excludes portal client accounts."
    />
  )
}
