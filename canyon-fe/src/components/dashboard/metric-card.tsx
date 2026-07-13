import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  hint,
  icon,
  featured = false,
  className,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  featured?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        featured && "border-primary/15 bg-card md:row-span-2",
        className
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between pb-2",
          featured && "pb-3"
        )}
      >
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div
            className={cn(
              "absolute -left-1 top-0 w-0.5 bg-primary",
              featured ? "h-full" : "h-full"
            )}
          />
          <p
            className={cn(
              "pl-3 font-mono font-semibold tracking-tight tabular",
              featured ? "text-5xl md:text-6xl" : "text-3xl"
            )}
          >
            {value}
          </p>
          {hint ? (
            <p
              className={cn(
                "mt-1 pl-3 text-muted-foreground",
                featured ? "text-sm" : "text-xs"
              )}
            >
              {hint}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
