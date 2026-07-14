"use client";

import { Button } from "@/components/ui/button";

export function ConfirmActions({
  onYes,
  onNo,
  disabled,
}: {
  onYes: () => void;
  onNo: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 rounded-sm border border-border bg-background/80 px-3 py-2.5">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Confirm action
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="rounded-sm px-4" onClick={onYes} disabled={disabled}>
          Yes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-sm px-4"
          onClick={onNo}
          disabled={disabled}
        >
          No
        </Button>
      </div>
    </div>
  );
}

/** Detect confirmation marker and soft confirmation phrasing. */
export function needsConfirmation(content: string): boolean {
  if (!content.trim()) return false;
  if (/(?:^|\n)\s*\[\[confirm\]\]\s*$/i.test(content.trim())) return true;

  const lower = content.toLowerCase();
  const soft =
    /shall i proceed|do you want me to|confirm (this|that|before)|should i (create|delete|update|proceed|deactivate|add|remove)/i.test(
      lower
    );
  return soft && /\?\s*$/.test(content.trim());
}

/** Strip [[confirm]] marker for display. */
export function stripConfirmMarker(content: string): string {
  return content.replace(/(?:\n|^)\s*\[\[confirm\]\]\s*$/i, "").trimEnd();
}

/** Remove emoji / pictographs so agent text matches Canyon's mono UI. */
export function stripEmoji(content: string): string {
  return content
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

export function prepareAssistantDisplay(content: string): string {
  return stripEmoji(stripConfirmMarker(content));
}
