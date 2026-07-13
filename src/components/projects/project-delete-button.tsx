"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";

export function ProjectDeleteButton({ projectId }: { projectId: number }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this project and all its tasks?")) return;
    setDeleting(true);
    try {
      await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
      toast.success("Project deleted");
      router.push("/projects");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button variant="ghost" onClick={handleDelete} disabled={deleting}>
      {deleting ? "Deleting..." : "Delete project"}
    </Button>
  );
}