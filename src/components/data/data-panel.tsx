import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Section wrapper for dense data views (tables, charts, lists). */
export function DataPanel({
  title,
  description,
  action,
  children,
  className,
  style,
  density = "default",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  density?: "default" | "dense";
}) {
  return (
    <Card density={density} className={className} style={style}>
      <CardHeader density={density} className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent density={density}>{children}</CardContent>
    </Card>
  );
}

export function DataPanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}
