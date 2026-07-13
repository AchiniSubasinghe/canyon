"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";

export function TaskDeleteButton({
  taskId,
  projectId,
}: {
  taskId: number;
  projectId: number;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    setDeleting(true);
    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      toast.success("Task deleted");
      router.push(`/projects/${projectId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete task");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button variant="ghost" onClick={handleDelete} disabled={deleting}>
      {deleting ? "Deleting..." : "Delete task"}
    </Button>
  );
}