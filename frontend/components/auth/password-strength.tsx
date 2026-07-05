"use client";

import { assessPassword } from "@/lib/password";
import { cn } from "@/lib/utils";

// score (0–4) → bar colour + label colour.
const SEGMENT_COLOR = [
  "bg-error",
  "bg-error",
  "bg-secondary",
  "bg-primary",
  "bg-primary",
];
const LABEL_COLOR = [
  "text-error",
  "text-error",
  "text-secondary",
  "text-primary",
  "text-primary",
];

/** Live strength meter + real-time requirement checklist. */
export function PasswordStrength({
  password,
  showChecklist = true,
}: {
  password: string;
  showChecklist?: boolean;
}) {
  const { checks, score, strength } = assessPassword(password);
  const filled = password.length === 0 ? 0 : score + 1;

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < filled ? SEGMENT_COLOR[score] : "bg-surface-variant",
              )}
            />
          ))}
        </div>
        {password.length > 0 && (
          <span
            className={cn(
              "w-24 shrink-0 text-right font-caption text-caption",
              LABEL_COLOR[score],
            )}
          >
            {strength}
          </span>
        )}
      </div>

      {showChecklist && (
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {checks.map((check) => (
            <li
              key={check.key}
              className={cn(
                "flex items-center gap-1.5 font-caption text-caption transition-colors",
                check.met ? "text-primary" : "text-on-surface-variant",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]",
                  check.met
                    ? "bg-primary text-on-primary"
                    : "border border-outline-variant",
                )}
              >
                {check.met ? "✓" : ""}
              </span>
              {check.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
