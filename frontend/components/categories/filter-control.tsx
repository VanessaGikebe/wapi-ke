"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RangeSlider } from "@/components/ui/range-slider";
import { Switch } from "@/components/ui/switch";
import type { FilterValue } from "@/lib/filtering";
import type { EnumOptions, FilterDefinition, RangeOptions } from "@/lib/types";
import { priceTierCap } from "@/lib/experience-presentation";

/**
 * Renders ONE filter from its schema definition — the generic core of the
 * filter system. Switches purely on `filter.type`, never on `filter.key`, so a
 * new category's filters render with zero code changes:
 *   - enum    -> a group of checkboxes (multi-select, OR within the group)
 *   - range   -> a RangeSlider acting as a "max" threshold
 *   - boolean -> a Switch toggle
 */
export function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: FilterDefinition;
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}) {
  if (filter.type === "enum") {
    const options = (filter.options as EnumOptions).values;
    const selected = Array.isArray(value) ? value : [];
    const toggle = (option: string) =>
      onChange(
        selected.includes(option)
          ? selected.filter((s) => s !== option)
          : [...selected, option],
      );

    return (
      <fieldset>
        <legend className="mb-3 font-label-md text-label-md uppercase text-on-surface-variant">
          {filter.label}
        </legend>
        <div className="flex flex-col gap-3">
          {options.map((option) => (
            <Checkbox
              key={option}
              label={option}
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  if (filter.type === "range") {
    const options = filter.options as RangeOptions;
    const current = typeof value === "number" ? value : options.max;
    const format = (n: number) =>
      options.format === "currency"
        ? priceTierCap(n)
        : `${n}${options.unit ? ` ${options.unit}` : ""}`;

    return (
      <RangeSlider
        label={filter.label}
        showValue
        min={options.min}
        max={options.max}
        step={options.step ?? 1}
        value={current}
        formatValue={(n) => `≤ ${format(n)}`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }

  // boolean
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-body-md text-body-md text-on-surface">
        {filter.label}
      </span>
      <Switch
        checked={value === true}
        onCheckedChange={(checked) => onChange(checked)}
        aria-label={filter.label}
      />
    </div>
  );
}
