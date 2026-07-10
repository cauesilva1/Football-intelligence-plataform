"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  value: number;
  onValueChange: (value: number) => void;
  /** Disparado ao soltar o slider (mouse/touch). */
  onValueCommit?: (value: number) => void;
  formatValue?: (value: number) => string;
}

export function Slider({
  className,
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  onValueCommit,
  formatValue,
  ...props
}: SliderProps) {
  const display = formatValue ? formatValue(value) : String(value);

  const commit = React.useCallback(
    (event: React.SyntheticEvent<HTMLInputElement>) => {
      onValueCommit?.(Number(event.currentTarget.value));
    },
    [onValueCommit]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span className="font-medium text-foreground">{display}</span>
        <span>{max}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onValueChange(Number(event.target.value))}
        onPointerUp={commit}
        onMouseUp={commit}
        onTouchEnd={commit}
        onKeyUp={(event) => {
          if (event.key === "Enter" || event.key === " ") commit(event);
        }}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        {...props}
      />
    </div>
  );
}
