import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Skeleton — soft pulsing placeholder on the tonal surface scale. Compose for
 * loading states (e.g. experience card skeletons) before data resolves.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-container-high",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
