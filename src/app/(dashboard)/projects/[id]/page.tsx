"use client";

import { Plus, UserPlus } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import type { Project, Task, User } from "@/lib/types";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { isAdmin, isProjectManager } = useAuth();
  const canManage = isAdmin || isProjectManager;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [taskOpen, setTaskOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [memberUserId, setMemberUserId] = useState<string>("");

  const load = useCallback(async () => {
    const [projectData, taskData] = await Promise.all([
      apiFetch<Project>(`/projects/${projectId}`),
      apiFetch<Task[]>(`/tasks/project/${projectId}`),
    ]);
    setProject(projectData);
    setTasks(taskData);
  }, [projectId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (canManage) {
      if (isAdmin) {
        apiFetch<User[]>("/users").then(setUsers).catch(() => {});
      } else if (project?.members) {
        setUsers(
          project.members.map((m) => ({
            id: m.userId,
            email: m.email,
            name: m.name,
            roles: [],
          }))
        );
      }
    }
  }, [canManage, isAdmin, project?.members]);

  async function handleCreateTask() {
    if (!taskTitle.trim()) return;
    try {
      await apiFetch<Task>(`/tasks/project/${projectId}`, {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          assignedTo: assigneeId ? Number(assigneeId) : null,
        }),
      });
      toast.success("Task created");
      setTaskOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setAssigneeId("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create task");
    }
  }

  async function handleAssignMember() {
    if (!memberUserId) return;
    try {
      await apiFetch(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: Number(memberUserId), memberRole: "member" }),
      });
      toast.success("Member assigned");
      setMemberOpen(false);
      setMemberUserId("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to assign member");
    }
  }

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!project) {
    return <p className="text-muted-foreground">Project not found.</p>;
  }

  return (
    <div className="space-y-8 animate-panel-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Project</p>
          <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {project.description || "No description provided."}
          </p>
          <Badge className="mt-3" variant="default">
            {project.status}
          </Badge>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <UserPlus className="h-4 w-4" />
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
                        {users.map((user) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
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
                  <Plus className="h-4 w-4" />
                  Create task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskTitle">Title</Label>
                    <Input
                      id="taskTitle"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskDescription">Description</Label>
                    <Textarea
                      id="taskDescription"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                    />
                  </div>
                  {users.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Assignee</Label>
                      <Select value={assigneeId} onValueChange={setAssigneeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <Button onClick={handleCreateTask}>Create task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(project.members ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No members assigned yet.</p>
            ) : (
              project.members?.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-sm border border-border bg-secondary px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="secondary">{member.memberRole}</Badge>
                </div>
              ))
            )}
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