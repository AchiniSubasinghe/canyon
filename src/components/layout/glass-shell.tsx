import type { ReactNode } from "react";
import { AmbientBackground } from "./ambient-background";

export function GlassShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      {children}
    </div>
  );
}