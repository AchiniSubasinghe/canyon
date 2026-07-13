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
      return "solid" as const;
    case "in_progress":
      return "outline" as const;
    case "review":
      return "outline" as const;
    default:
      return "muted" as const;
  }
}

export function priorityVariant(priority: TaskPriority) {
  switch (priority) {
    case "urgent":
      return "solid" as const;
    case "high":
      return "outline" as const;
    case "medium":
      return "outline" as const;
    default:
      return "muted" as const;
  }
}

export function statusMarkerOpacity(status: TaskStatus) {
  switch (status) {
    case "done":
      return 1;
    case "in_progress":
      return 0.6;
    case "review":
      return 0.45;
    default:
      return 0.3;
  }
}