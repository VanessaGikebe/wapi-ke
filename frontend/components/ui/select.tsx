import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Select — restyled native `<select>`. The native control is reset
 * (appearance-none) and re-skinned to match {@link Input}, with a custom
 * chevron overlaid. Native keeps keyboard + screen-reader behaviour for free.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "transition-subtle h-12 w-full appearance-none rounded-lg border border-outline-variant bg-surface pl-4 pr-10 font-body-md text-body-md text-on-surface",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
Select.displayName = "Select";

export { Select };
