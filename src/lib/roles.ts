export const ROLE_NAMES = [
  "administrator",
  "project_manager",
  "team_member",
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export function hasRole(roles: RoleName[], role: RoleName): boolean {
  return roles.includes(role);
}

export function hasAnyRole(roles: RoleName[], required: RoleName[]): boolean {
  return required.some((role) => roles.includes(role));
}

export function isAdmin(roles: RoleName[]): boolean {
  return hasRole(roles, "administrator");
}

export function isProjectManager(roles: RoleName[]): boolean {
  return hasRole(roles, "project_manager");
}