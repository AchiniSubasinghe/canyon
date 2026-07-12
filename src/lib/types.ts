export type RoleName = "administrator" | "project_manager" | "team_member";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface User {
  id: number;
  email: string;
  name: string;
  roles: RoleName[];
  isActive?: boolean;
  createdAt?: string;
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
  memberRole: "manager" | "member";
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