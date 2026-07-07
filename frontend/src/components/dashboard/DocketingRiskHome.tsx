import type { RoleView } from '@/config/role-views'
import { StaffRiskDashboardHome } from './StaffRiskDashboardHome'

type DocketingRiskHomeProps = {
  view: RoleView
  userName: string
}

export function DocketingRiskHome(props: DocketingRiskHomeProps) {
  return <StaffRiskDashboardHome {...props} />
}
