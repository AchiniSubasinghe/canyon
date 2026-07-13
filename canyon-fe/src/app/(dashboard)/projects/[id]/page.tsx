"use client";

import { Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { MemberList } from "@/components/projects/member-list";
import { ProjectDeleteButton } from "@/components/projects/project-delete-button";
import { ProjectSettingsDialog } from "@/components/projects/project-settings-dialog";
import { TaskFormFields } from "@/components/tasks/task-form-fields";
import { TaskTable } from "@/components/tasks/task-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, apiFetchPaginated, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/hooks/use-fetch";
import type { AssignableUser, MemberRole, Project, Task, TaskPriority } from "@/lib/types";

interface ProjectPageData {
  project: Project;
  tasks: Task[];
  assignees: AssignableUser[];
  candidateMembers: AssignableUser[];
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { isAdmin, isProjectManager } = useAuth();
  const canManage = isAdmin || isProjectManager;

  const fetchPage = useCallback(async (): Promise<ProjectPageData> => {
    const [project, taskData, assignees] = await Promise.all([
      apiFetch<Project>(`/projects/${projectId}`),
      apiFetchPaginated<Task>(`/tasks/project/${projectId}`, { limit: 100 }),
      apiFetch<AssignableUser[]>(`/projects/${projectId}/assignable-users`),
    ]);

    const candidateMembers = canManage
      ? await apiFetch<AssignableUser[]>(`/projects/${projectId}/candidate-members`)
      : [];

    return {
      project,
      tasks: taskData.data,
      assignees,
      candidateMembers,
    };
  }, [projectId, canManage]);

  const { data, loading, error, reload, setData } = useFetch(fetchPage, [projectId, canManage], {
    toastOnError: true,
  });

  const [taskOpen, setTaskOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("none");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<MemberRole>("member");

  async function handleCreateTask() {
    if (!taskTitle.trim()) return;
    try {
      await apiFetch<Task>(`/tasks/project/${projectId}`, {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
          dueDate: taskDueDate || null,
          assignedTo: assigneeId === "none" ? null : Number(assigneeId),
        }),
      });
      toast.success("Task created");
      setTaskOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("medium");
      setTaskDueDate("");
      setAssigneeId("none");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create task");
    }
  }

  async function handleAssignMember() {
    if (!memberUserId) return;
    try {
      await apiFetch(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: Number(memberUserId), memberRole }),
      });
      toast.success("Member assigned");
      setMemberOpen(false);
      setMemberUserId("");
      setMemberRole("member");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to assign member");
    }
  }

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4 animate-panel-in">
        <Link
          href="/projects"
          className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          Back to projects
        </Link>
        <div className="rounded-md border border-border bg-card px-6 py-12 text-center shadow-[var(--shadow-panel)]">
          <p className="text-lg font-medium tracking-tight">Project not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error ?? "This project may have been removed or you do not have access."}
          </p>
        </div>
      </div>
    );
  }

  const { project, tasks, assignees, candidateMembers } = data;

  return (
    <div className="space-y-8 animate-panel-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/projects"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            Back to projects
          </Link>
          <p className="page-kicker mt-3">Project</p>
          <h1 className="page-title">{project.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {project.description || "No description provided."}
          </p>
          <Badge className="mt-3 capitalize" variant="default">
            {project.status}
          </Badge>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <ProjectSettingsDialog
              project={project}
              onUpdated={(updated) =>
                setData((prev) => (prev ? { ...prev, project: { ...prev.project, ...updated } } : prev))
              }
            />
            {isAdmin ? <ProjectDeleteButton projectId={projectId} /> : null}

            <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                  Assign member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select value={memberUserId} onValueChange={setMemberUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidateMembers.map((user) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={memberRole} onValueChange={(v) => setMemberRole(v as MemberRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssignMember}>Assign member</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Create task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create task</DialogTitle>
                </DialogHeader>
                <TaskFormFields
                  title={taskTitle}
                  description={taskDescription}
                  priority={taskPriority}
                  dueDate={taskDueDate}
                  assigneeId={assigneeId}
                  assignees={assignees}
                  onTitleChange={setTaskTitle}
                  onDescriptionChange={setTaskDescription}
                  onPriorityChange={setTaskPriority}
                  onDueDateChange={setTaskDueDate}
                  onAssigneeChange={setAssigneeId}
                />
                <Button onClick={handleCreateTask}>Create task</Button>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            <MemberList
              projectId={projectId}
              members={project.members ?? []}
              canManage={canManage}
              onUpdated={reload}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskTable tasks={tasks} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}