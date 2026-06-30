"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * Switch — accessible on/off toggle (`role="switch"`). Used for boolean
 * filters. Primary-filled track when on, tonal track when off.
 */
export function Switch({
  checked = false,
  onCheckedChange,
  disabled,
  className,
  ...aria
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "transition-subtle relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-surface-container-highest",
        className,
      )}
      {...aria}
    >
      <span
        className={cn(
          "transition-subtle inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
