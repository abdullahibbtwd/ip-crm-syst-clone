import { IsIn } from 'class-validator';
import { SYSTEM_ROLES, type SystemRole } from '../../rbac/rbac.constants';

/** Staff roles only — portal_client is managed via portal invite / client link. */
export const TEAM_ASSIGNABLE_ROLES = [
  SYSTEM_ROLES.MANAGING_PARTNER,
  SYSTEM_ROLES.IP_ATTORNEY,
  SYSTEM_ROLES.TRADEMARK_ATTORNEY,
  SYSTEM_ROLES.COORDINATOR,
  SYSTEM_ROLES.DOCKETING_ADMIN,
  SYSTEM_ROLES.PARALEGAL,
  SYSTEM_ROLES.FINANCE,
  SYSTEM_ROLES.DPO_COMPLIANCE,
  SYSTEM_ROLES.IT_ADMIN,
] as const satisfies readonly SystemRole[];

export type TeamAssignableRole = (typeof TEAM_ASSIGNABLE_ROLES)[number];

export class UpdateUserRoleDto {
  @IsIn(TEAM_ASSIGNABLE_ROLES)
  role!: TeamAssignableRole;
}
