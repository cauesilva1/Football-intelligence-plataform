"use client";

import { useState, type ReactNode } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Re-export glossary copy so existing imports from this module keep working.
export { METRIC_GLOSSARY, POSITION_GLOSSARY } from "@/components/common/glossary-copy";

type Placement = "top" | "bottom";

/**
 * Glossary hover hint. Uses Radix Popover (portaled) so the bubble is not clipped
 * by overflow scroll containers such as sticky table headers.
 */
export function GlossaryTooltip({
  label,
  description,
  className,
  placement = "bottom",
}: {
  label: ReactNode;
  description: string;
  className?: string;
  placement?: Placement;
}) {
  const [open, setOpen] = useState(false);

  if (!description) return <>{label}</>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div
          className={cn("inline-flex cursor-help items-center gap-1", className)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocusCapture={() => setOpen(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setOpen(false);
            }
          }}
        >
          {label}
        </div>
      </PopoverPrimitive.Anchor>
      <PopoverContent
        side={placement}
        align="center"
        sideOffset={6}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="z-[100] w-56 whitespace-normal break-words p-2.5 text-2xs font-normal normal-case leading-snug tracking-normal text-muted-foreground"
      >
        {description}
      </PopoverContent>
    </Popover>
  );
}
