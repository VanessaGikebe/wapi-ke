import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Small, consistent "back" affordance used across pages. Renders an explicit
 * destination link (predictable) rather than relying on browser history.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "transition-subtle inline-flex items-center gap-1 rounded font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
