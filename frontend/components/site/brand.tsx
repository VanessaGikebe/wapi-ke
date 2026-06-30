import { cn } from "@/lib/utils";

/** "wapiKE" wordmark. */
export function Brand({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span
        className={cn(
          "font-display-lg leading-none text-primary",
          wordmarkClassName,
        )}
      >
        wapi<span className="text-secondary">KE</span>
      </span>
    </span>
  );
}
