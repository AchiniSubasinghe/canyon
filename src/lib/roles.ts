import type { RoleName } from "./types";

export function hasRole(roles: RoleName[], role: RoleName) {
  return roles.includes(role);
}

export function isAdmin(roles: RoleName[]) {
  return hasRole(roles, "administrator");
}

export function isProjectManager(roles: RoleName[]) {
  return hasRole(roles, "project_manager");
}

export function isTeamMember(roles: RoleName[]) {
  return hasRole(roles, "team_member");
}