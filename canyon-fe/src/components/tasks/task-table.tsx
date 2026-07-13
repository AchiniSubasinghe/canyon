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
import {
  formatPriority,
  formatStatus,
  priorityVariant,
  statusMarkerOpacity,
  statusVariant,
} from "@/lib/format";
import type { Task } from "@/lib/types";

export function TaskTable({
  tasks,
  emptyTitle = "No tasks yet",
  emptyDescription = "Create a task for this project to start tracking work.",
}: {
  tasks: Task[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-secondary/30 py-16 text-center">
        <p className="text-lg font-medium tracking-tight">{emptyTitle}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards reusing the notebook aesthetic (status bar, hairlines, mono ids, badges) */}
      <div className="space-y-3 md:hidden">
        {tasks.map((task) => {
          const opacity = statusMarkerOpacity(task.status);
          return (
            <div
              key={task.id}
              className="rounded-sm border border-border bg-card p-3 active:bg-secondary/60"
            >
              <Link
                href={`/tasks/${task.id}`}
                className="flex items-start gap-3 font-medium transition-colors duration-150 hover:text-foreground"
              >
                <span
                  className="mt-0.5 h-9 w-1 flex-shrink-0 rounded-full bg-primary"
                  style={{ opacity }}
                />
                <div className="min-w-0 flex-1">
                  <span className="block break-words pr-1">{task.title}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular">
                    #{task.id}
                  </span>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant={statusVariant(task.status)}>{formatStatus(task.status)}</Badge>
                    <Badge variant={priorityVariant(task.priority)}>
                      {formatPriority(task.priority)}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs tabular text-muted-foreground">
                    <span>{task.assigneeName ?? "Unassigned"}</span>
                    <span>{task.dueDate ?? "—"}</span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Desktop: original table view */}
      <div className="hidden md:block">
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
                    className="flex items-center gap-3 font-medium transition-colors duration-150 hover:text-foreground hover:underline hover:underline-offset-4"
                  >
                    <span
                      className="h-8 w-1 rounded-full bg-primary"
                      style={{ opacity: statusMarkerOpacity(task.status) }}
                    />
                    <span>
                      <span className="block">{task.title}</span>
                      <span className="font-mono text-xs text-muted-foreground tabular">
                        #{task.id}
                      </span>
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
                <TableCell className="font-mono text-xs tabular text-muted-foreground">
                  {task.dueDate ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
