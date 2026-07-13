export type RoleName = "administrator" | "project_manager" | "team_member";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type MemberRole = "manager" | "member";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface ProjectListParams extends PaginationParams {
  status?: ProjectStatus;
  search?: string;
}

export interface TaskListParams extends PaginationParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: number;
}

export interface UserListParams extends PaginationParams {
  search?: string;
  isActive?: boolean;
}

export interface User {
  id: number;
  email: string;
  name: string;
  roles: RoleName[];
  isActive?: boolean;
  createdAt?: string;
}

export interface AssignableUser {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdBy: number;
  createdAt: string;
  totalTasks?: number;
  completedTasks?: number;
  members?: ProjectMember[];
}

export interface ProjectMember {
  userId: number;
  name: string;
  email: string;
  memberRole: MemberRole;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: number | null;
  assigneeName: string | null;
  createdBy: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: number | null;
  dueDate?: string | null;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  name?: string;
  isActive?: boolean;
  roles?: RoleName[];
}

export interface UpdateMemberRolePayload {
  memberRole: MemberRole;
}