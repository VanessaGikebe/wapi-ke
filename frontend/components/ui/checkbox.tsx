import * as React from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  /** Optional inline label rendered to the right of the box. */
  label?: React.ReactNode;
}

/**
 * Checkbox — accessible custom control. The native checkbox stays in the DOM
 * (screen-reader + keyboard friendly) but is visually replaced by a `peer`-
 * driven box that fills `primary` and reveals a tick when checked.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const generated = React.useId();
    const inputId = id ?? generated;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex cursor-pointer select-none items-center gap-3",
          props.disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span className="relative inline-flex h-5 w-5 shrink-0">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className="transition-subtle peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded border border-outline bg-surface checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed"
            {...props}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="transition-subtle pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 scale-75 text-on-primary opacity-0 peer-checked:scale-100 peer-checked:opacity-100"
          >
            <path
              d="M3.5 8.5l3 3 6-6.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {label != null && (
          <span className="font-body-md text-body-md text-on-surface">
            {label}
          </span>
        )}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
