"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCreateReview } from "@/lib/queries/reviews";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

/**
 * "Leave a review" form for an experience. Rating is required (1–5); the note
 * is optional. Submitting upserts the current user's review (backend enforces
 * one per user) and logs the `review` interaction signal server-side.
 */
export function ReviewForm({
  experienceId,
  redirectPath,
}: {
  experienceId: string;
  redirectPath: string;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mutation = useCreateReview(experienceId);
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [text, setText] = React.useState("");
  const textId = React.useId();

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <p className="font-body-md text-body-md text-on-surface-variant">
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
            className="text-secondary underline-offset-2 hover:underline"
          >
            Sign in
          </Link>{" "}
          to leave a review.
        </p>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <p className="font-body-md text-body-md text-on-surface">
          Thanks for your review — it&apos;s now live below.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => mutation.reset()}
        >
          Edit your review
        </Button>
      </div>
    );
  }

  const active = hover || rating;

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (rating < 1) return;
        mutation.mutate({ rating, text: text.trim() || null });
      }}
    >
      <div className="flex flex-col gap-2">
        <span className="font-label-md text-label-md uppercase text-on-surface-variant">
          Your rating
        </span>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <StarIcon
                className={cn(
                  "h-7 w-7 transition-subtle",
                  value <= active ? "text-secondary" : "text-outline-variant",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={textId}
          className="font-label-md text-label-md uppercase text-on-surface-variant"
        >
          Your review <span className="normal-case">(optional)</span>
        </label>
        <textarea
          id={textId}
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={2000}
          placeholder="Share what your experience was like…"
          className={cn(
            "transition-subtle w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 font-body-md text-body-md text-on-surface",
            "placeholder:text-on-surface-variant/70",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
          )}
        />
      </div>

      {mutation.isError && (
        <p
          role="alert"
          className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
        >
          Couldn&apos;t submit your review. Please try again.
        </p>
      )}

      <Button
        type="submit"
        className="w-fit"
        disabled={rating < 1 || mutation.isPending}
      >
        {mutation.isPending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2z" />
    </svg>
  );
}
