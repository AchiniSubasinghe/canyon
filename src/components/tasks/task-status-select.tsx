"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";
import { formatStatus } from "@/lib/format";

const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export function TaskStatusSelect({
  task,
  onUpdated,
}: {
  task: Task;
  onUpdated: (task: Task) => void;
}) {
  async function handleChange(status: TaskStatus) {
    const updated = await apiFetch<Task>(`/tasks/${task.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    onUpdated(updated);
  }

  return (
    <Select value={task.status} onValueChange={(v) => handleChange(v as TaskStatus)}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {formatStatus(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}