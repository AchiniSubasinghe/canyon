"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPriority, formatStatus, priorityVariant, statusVariant } from "@/lib/format";
import type { Task } from "@/lib/types";

export function TaskTable({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <p className="font-display text-lg font-medium">No tasks yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Create a task for this project to start tracking work.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Due</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <Link
                href={`/tasks/${task.id}`}
                className="flex items-center gap-3 font-medium hover:text-accent"
              >
                <span
                  className="h-8 w-1 rounded-full"
                  style={{
                    background:
                      task.status === "done"
                        ? "#34d399"
                        : task.status === "in_progress"
                          ? "#22d3ee"
                          : "#3b82f6",
                  }}
                />
                <span>
                  <span className="block">{task.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">#{task.id}</span>
                </span>
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(task.status)}>{formatStatus(task.status)}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={priorityVariant(task.priority)}>
                {formatPriority(task.priority)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {task.assigneeName ?? "Unassigned"}
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {task.dueDate ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}