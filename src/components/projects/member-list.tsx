"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api";
import type { MemberRole, ProjectMember } from "@/lib/types";

export function MemberList({
  projectId,
  members,
  canManage,
  onUpdated,
}: {
  projectId: number;
  members: ProjectMember[];
  canManage: boolean;
  onUpdated: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleRemove(userId: number) {
    if (!confirm("Remove this member from the project?")) return;
    setBusyId(userId);
    try {
      await apiFetch(`/projects/${projectId}/members/${userId}`, { method: "DELETE" });
      toast.success("Member removed");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove member");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(userId: number, memberRole: MemberRole) {
    setBusyId(userId);
    try {
      await apiFetch(`/projects/${projectId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ memberRole }),
      });
      toast.success("Member role updated");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members assigned yet.</p>;
  }

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center justify-between gap-2 rounded-sm border border-border bg-secondary px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">{member.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{member.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <Select
                value={member.memberRole}
                disabled={busyId === member.userId}
                onValueChange={(v) => handleRoleChange(member.userId, v as MemberRole)}
              >
                <SelectTrigger className="h-8 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">manager</SelectItem>
                  <SelectItem value="member">member</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary">{member.memberRole}</Badge>
            )}
            {canManage ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === member.userId}
                onClick={() => handleRemove(member.userId)}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}