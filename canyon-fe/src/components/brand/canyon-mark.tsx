import { cn } from "@/lib/utils";

export function CanyonMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground",
        sizeClass,
        className
      )}
      aria-hidden
    >
      C
    </div>
  );
}
