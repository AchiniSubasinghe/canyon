"use client";

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
  statusVariant,
} from "@/lib/format";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type AgentTableColumnKind = "id" | "status" | "priority" | "mono" | "text";

export type AgentTableColumn = {
  key: string;
  label: string;
  kind?: AgentTableColumnKind;
};

export type AgentTableData = {
  title?: string;
  columns: AgentTableColumn[];
  rows: Record<string, string | number | null>[];
};

const TASK_STATUSES = new Set(["todo", "in_progress", "review", "done"]);
const TASK_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

function normalizeKey(value: string | number | null): string {
  if (value == null) return "";
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function renderCell(column: AgentTableColumn, value: string | number | null) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  const kind = column.kind ?? "text";
  const text = String(value);

  if (kind === "id") {
    return <span className="font-mono text-xs tabular text-muted-foreground">#{text}</span>;
  }

  if (kind === "mono") {
    return <span className="font-mono text-xs tabular text-muted-foreground">{text}</span>;
  }

  if (kind === "status") {
    const key = normalizeKey(text);
    if (TASK_STATUSES.has(key)) {
      const status = key as TaskStatus;
      return <Badge variant={statusVariant(status)}>{formatStatus(status)}</Badge>;
    }
    return (
      <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        {text}
      </span>
    );
  }

  if (kind === "priority") {
    const key = normalizeKey(text);
    if (TASK_PRIORITIES.has(key)) {
      const priority = key as TaskPriority;
      return <Badge variant={priorityVariant(priority)}>{formatPriority(priority)}</Badge>;
    }
    return <span className="text-sm">{text}</span>;
  }

  return <span className="text-sm">{text}</span>;
}

export function AgentDataTable({ table }: { table: AgentTableData }) {
  if (!table.rows.length || !table.columns.length) return null;

  return (
    <div className="my-2 overflow-hidden rounded-sm border border-border bg-card">
      {table.title && (
        <div className="border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {table.title}
          <span className="ml-2 tabular text-muted-foreground/70">{table.rows.length}</span>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {table.columns.map((col) => (
              <TableHead
                key={col.key}
                className="h-9 px-3 text-[10px] font-mono uppercase tracking-wider"
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row, i) => (
            <TableRow key={i} className="hover:bg-secondary/40">
              {table.columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn("px-3 py-2 align-middle", col.kind === "text" && "max-w-[14rem]")}
                >
                  <div className={cn(col.kind === "text" && "truncate")}>
                    {renderCell(col, row[col.key] ?? null)}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
