import type { TaskPriority, TaskStatus } from "./types";

export function formatStatus(status: TaskStatus) {
  return status.replace(/_/g, " ");
}

export function formatPriority(priority: TaskPriority) {
  return priority;
}

export function statusVariant(status: TaskStatus) {
  switch (status) {
    case "done":
      return "success" as const;
    case "in_progress":
      return "accent" as const;
    case "review":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

export function priorityVariant(priority: TaskPriority) {
  switch (priority) {
    case "urgent":
      return "danger" as const;
    case "high":
      return "warning" as const;
    case "medium":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}