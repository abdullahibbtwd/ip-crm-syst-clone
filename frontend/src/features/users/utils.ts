import type { AttorneyAssignee } from "./api";

const ROLE_LABELS: Record<string, string> = {
  ip_attorney: "IP Attorney",
  trademark_attorney: "Trademark Attorney",
  managing_partner: "Managing Partner",
};

export function assigneeRoleLabel(roles: string[]) {
  if (roles.includes("trademark_attorney"))
    return ROLE_LABELS.trademark_attorney;
  if (roles.includes("ip_attorney")) return ROLE_LABELS.ip_attorney;
  if (roles.includes("managing_partner")) return ROLE_LABELS.managing_partner;
  return roles[0] ?? "Attorney";
}

export function formatAssigneeOption(assignee: AttorneyAssignee) {
  return `${assignee.fullName} - ${assigneeRoleLabel(assignee.roles)}`;
}
