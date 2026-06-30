import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card — the surface container behind experience listings. Soft tonal shadow,
 * `xl` radius, hairline outline. Composed from sub-parts so listing cards
 * (image + body + meta + action) can be assembled without bespoke markup.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "transition-subtle group flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-tonal hover:shadow-tonal-lg",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

/** Fixed 4:5 media well matching the Stitch experience cards. */
const CardMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative aspect-[4/5] w-full overflow-hidden bg-surface-container",
      className,
    )}
    {...props}
  />
));
CardMedia.displayName = "CardMedia";

const CardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-2 p-5", className)}
    {...props}
  />
));
CardBody.displayName = "CardBody";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-headline-sm text-headline-sm leading-tight text-primary",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardMeta = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-2 font-caption text-caption uppercase tracking-wide text-on-surface-variant",
      className,
    )}
    {...props}
  />
));
CardMeta.displayName = "CardMeta";

export { Card, CardMedia, CardBody, CardTitle, CardMeta };
