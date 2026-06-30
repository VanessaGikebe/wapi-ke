import * as React from "react";

import { cn } from "@/lib/utils";

export interface RangeSliderProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  /** Optional field label rendered above the track. */
  label?: React.ReactNode;
  /** When true, shows the current value on the right of the label row. */
  showValue?: boolean;
  /** Formats the displayed value (defaults to the raw number). */
  formatValue?: (value: number) => React.ReactNode;
}

/**
 * RangeSlider — labelled wrapper around a native range input, skinned via the
 * `.wapike-range` rules in globals.css (primary thumb on a tonal track). Used
 * for price / distance / duration filters.
 */
const RangeSlider = React.forwardRef<HTMLInputElement, RangeSliderProps>(
  (
    {
      className,
      label,
      showValue = false,
      formatValue,
      value,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const current = value ?? defaultValue;
    const display =
      current != null
        ? formatValue
          ? formatValue(Number(current))
          : current
        : null;

    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {(label != null || showValue) && (
          <div className="flex items-center justify-between">
            {label != null && (
              <span className="font-label-md text-label-md uppercase text-on-surface-variant">
                {label}
              </span>
            )}
            {showValue && display != null && (
              <span className="font-label-md text-label-md text-primary">
                {display}
              </span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          value={value}
          defaultValue={defaultValue}
          className="wapike-range"
          {...props}
        />
      </div>
    );
  },
);
RangeSlider.displayName = "RangeSlider";

export { RangeSlider };
