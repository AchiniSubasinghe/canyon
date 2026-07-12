"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/require-auth";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api";
import type { RoleName, User } from "@/lib/types";

const allRoles: RoleName[] = ["administrator", "project_manager", "team_member"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleName>("team_member");

  async function loadUsers() {
    const data = await apiFetch<User[]>("/users");
    setUsers(data);
  }

  useEffect(() => {
    loadUsers().finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, roles: [role] }),
      });
      toast.success("User created");
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("team_member");
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create user");
    }
  }

  async function handleDeactivate(userId: number) {
    try {
      await apiFetch(`/users/${userId}`, { method: "DELETE" });
      toast.success("User deactivated");
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to deactivate user");
    }
  }

  return (
    <RequireAuth roles={["administrator"]}>
      <div className="space-y-8 animate-panel-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">Administration</p>
            <h1 className="mt-2 font-display text-3xl font-bold">Users</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Create user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create user</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as RoleName)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate}>Create user</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="font-mono text-xs">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r) => (
                            <Badge key={r} variant="secondary">
                              {r.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive === false ? "danger" : "success"}>
                          {user.isActive === false ? "inactive" : "active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isActive !== false ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(user.id)}
                          >
                            Deactivate
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}