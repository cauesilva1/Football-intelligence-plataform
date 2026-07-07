import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tableWrapperVariants = cva("w-full overflow-x-auto rounded-xl border border-border", {
  variants: {
    density: {
      default: "",
      dense: "text-xs",
    },
    stickyHeader: {
      true: "max-h-[70vh] overflow-y-auto",
      false: "",
    },
  },
  defaultVariants: { density: "default", stickyHeader: false },
});

export interface TableProps
  extends React.TableHTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableWrapperVariants> {}

export function Table({ className, density, stickyHeader, ...props }: TableProps) {
  return (
    <div className={cn(tableWrapperVariants({ density, stickyHeader }))}>
      <table className={cn("w-full caption-bottom", density === "dense" ? "text-xs" : "text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-surface-muted/60 [&_tr]:border-b", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-surface-muted/40", className)} {...props} />;
}

export function TableHead({ className, sticky, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { sticky?: boolean }) {
  return (
    <th
      className={cn(
        "h-10 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        sticky && "sticky top-0 z-10 bg-surface-muted backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 align-middle text-foreground", className)}
      {...props}
    />
  );
}
