"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TaskFormFields } from "@/components/tasks/task-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/api";
import type { AssignableUser, Task } from "@/lib/types";

export function TaskEditDialog({
  task,
  assignees,
  onUpdated,
}: {
  task: Task;
  assignees: AssignableUser[];
  onUpdated: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assignedTo ? String(task.assignedTo) : "none");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await apiFetch<Task>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate: dueDate || null,
          assignedTo: assigneeId === "none" ? null : Number(assigneeId),
        }),
      });
      toast.success("Task updated");
      onUpdated(updated);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <TaskFormFields
          title={title}
          description={description}
          priority={priority}
          dueDate={dueDate}
          assigneeId={assigneeId}
          assignees={assignees}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onPriorityChange={setPriority}
          onDueDateChange={setDueDate}
          onAssigneeChange={setAssigneeId}
        />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}