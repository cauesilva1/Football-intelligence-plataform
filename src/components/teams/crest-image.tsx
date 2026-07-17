"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TeamTheme } from "@/lib/team-theme";

export function CrestImage({
  src,
  alt,
  theme,
  fallbackLabel,
  sizeClass,
  imageClassName,
  fallbackClassName,
}: {
  src?: string | null;
  alt: string;
  theme: TeamTheme;
  fallbackLabel: string;
  sizeClass: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src) && !imageFailed;

  if (showImage && src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={80}
        height={80}
        sizes="80px"
        referrerPolicy="no-referrer"
        className={cn(
          "shrink-0 rounded-xl bg-card object-contain p-1 ring-1 ring-white/10",
          sizeClass,
          imageClassName
        )}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-display font-bold shadow-panel ring-1 ring-white/15",
        theme.gradientString,
        sizeClass,
        fallbackClassName
      )}
      style={{ color: theme.text }}
      aria-label={alt}
      role="img"
    >
      <span className="drop-shadow-sm">{fallbackLabel}</span>
    </div>
  );
}
