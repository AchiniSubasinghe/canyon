"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api";
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
  const [saving, setSaving] = useState(false);

  async function handleChange(status: TaskStatus) {
    setSaving(true);
    try {
      const updated = await apiFetch<Task>(`/tasks/${task.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      onUpdated(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select
      value={task.status}
      disabled={saving}
      onValueChange={(v) => handleChange(v as TaskStatus)}
    >
      <SelectTrigger className="w-full sm:w-40">
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