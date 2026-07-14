import type { ToolResult } from "./types.js";

export interface AgentTableColumn {
  key: string;
  label: string;
  /** Hint for FE formatting: id | status | priority | mono | text */
  kind?: "id" | "status" | "priority" | "mono" | "text";
}

export interface AgentTable {
  title?: string;
  columns: AgentTableColumn[];
  rows: Record<string, string | number | null>[];
}

function labelEnum(value: unknown): string {
  if (value == null) return "—";
  return String(value).replace(/_/g, " ");
}

function asListRows(data: unknown): unknown[] | null {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "data" in data) {
    const inner = (data as { data: unknown }).data;
    if (Array.isArray(inner)) return inner;
  }
  return null;
}

function projectsTable(rows: unknown[]): AgentTable {
  return {
    title: "Projects",
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "name", label: "Name", kind: "text" },
      { key: "status", label: "Status", kind: "status" },
      { key: "tasks", label: "Tasks", kind: "mono" },
    ],
    rows: rows.map((raw) => {
      const p = raw as {
        id?: number;
        name?: string;
        status?: string;
        totalTasks?: number;
        completedTasks?: number;
      };
      const total = p.totalTasks ?? 0;
      const done = p.completedTasks ?? 0;
      return {
        id: p.id ?? null,
        name: p.name ?? "—",
        status: labelEnum(p.status),
        tasks: `${done}/${total}`,
      };
    }),
  };
}

function tasksTable(rows: unknown[]): AgentTable {
  return {
    title: "Tasks",
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "title", label: "Title", kind: "text" },
      { key: "status", label: "Status", kind: "status" },
      { key: "priority", label: "Priority", kind: "priority" },
      { key: "projectId", label: "Project", kind: "mono" },
      { key: "assignee", label: "Assignee", kind: "text" },
      { key: "dueDate", label: "Due", kind: "mono" },
    ],
    rows: rows.map((raw) => {
      const t = raw as {
        id?: number;
        title?: string;
        status?: string;
        priority?: string;
        projectId?: number;
        assigneeName?: string | null;
        dueDate?: string | Date | null;
      };
      let due: string | null = null;
      if (t.dueDate instanceof Date) {
        due = t.dueDate.toISOString().slice(0, 10);
      } else if (t.dueDate) {
        due = String(t.dueDate).slice(0, 10);
      }
      return {
        id: t.id ?? null,
        title: t.title ?? "—",
        status: labelEnum(t.status),
        priority: labelEnum(t.priority),
        projectId: t.projectId ?? null,
        assignee: t.assigneeName ?? "Unassigned",
        dueDate: due,
      };
    }),
  };
}

function usersTable(rows: unknown[]): AgentTable {
  return {
    title: "Users",
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "name", label: "Name", kind: "text" },
      { key: "email", label: "Email", kind: "mono" },
      { key: "roles", label: "Roles", kind: "text" },
      { key: "active", label: "Active", kind: "mono" },
    ],
    rows: rows.map((raw) => {
      const u = raw as {
        id?: number;
        name?: string;
        email?: string;
        roles?: string[];
        isActive?: boolean;
      };
      return {
        id: u.id ?? null,
        name: u.name ?? "—",
        email: u.email ?? "—",
        roles: Array.isArray(u.roles) ? u.roles.map(labelEnum).join(", ") : "—",
        active: u.isActive === false ? "no" : "yes",
      };
    }),
  };
}

function membersTable(rows: unknown[]): AgentTable {
  return {
    title: "Members",
    columns: [
      { key: "userId", label: "ID", kind: "id" },
      { key: "name", label: "Name", kind: "text" },
      { key: "email", label: "Email", kind: "mono" },
      { key: "memberRole", label: "Role", kind: "status" },
    ],
    rows: rows.map((raw) => {
      const m = raw as {
        userId?: number;
        id?: number;
        name?: string;
        email?: string;
        memberRole?: string;
      };
      return {
        userId: m.userId ?? m.id ?? null,
        name: m.name ?? "—",
        email: m.email ?? "—",
        memberRole: labelEnum(m.memberRole),
      };
    }),
  };
}

function peopleTable(rows: unknown[], title: string): AgentTable {
  return {
    title,
    columns: [
      { key: "id", label: "ID", kind: "id" },
      { key: "name", label: "Name", kind: "text" },
      { key: "email", label: "Email", kind: "mono" },
    ],
    rows: rows.map((raw) => {
      const u = raw as { id?: number; name?: string; email?: string };
      return {
        id: u.id ?? null,
        name: u.name ?? "—",
        email: u.email ?? "—",
      };
    }),
  };
}

/**
 * Build a UI table payload from a successful tool result.
 * Returns undefined when the result is not tabular.
 */
export function toAgentTable(toolName: string, result: ToolResult): AgentTable | undefined {
  if (!result.ok) return undefined;

  const data = result.data;

  switch (toolName) {
    case "list_projects": {
      const rows = asListRows(data);
      if (!rows?.length) return undefined;
      return projectsTable(rows);
    }
    case "list_tasks":
    case "list_project_tasks": {
      const rows = asListRows(data);
      if (!rows?.length) return undefined;
      return tasksTable(rows);
    }
    case "list_users": {
      const rows = asListRows(data);
      if (!rows?.length) return undefined;
      return usersTable(rows);
    }
    case "list_project_members": {
      if (!Array.isArray(data) || data.length === 0) return undefined;
      return membersTable(data);
    }
    case "list_candidate_members":
      if (!Array.isArray(data) || data.length === 0) return undefined;
      return peopleTable(data, "Candidates");
    case "list_assignable_users":
      if (!Array.isArray(data) || data.length === 0) return undefined;
      return peopleTable(data, "Assignable");
    case "get_project": {
      // Optional: members of a single project as a table
      if (data && typeof data === "object" && "members" in data) {
        const members = (data as { members?: unknown }).members;
        if (Array.isArray(members) && members.length > 0) {
          return membersTable(members);
        }
      }
      return undefined;
    }
    default:
      return undefined;
  }
}
