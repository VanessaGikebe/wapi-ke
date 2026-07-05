"use client";

import Image from "next/image";
import Link from "next/link";

import { BackLink } from "@/components/site/back-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEventDateLong, formatEventPrice } from "@/lib/api/events";
import { useEvent } from "@/lib/queries/events";
import { cn } from "@/lib/utils";

export function EventDetail({ slug }: { slug: string }) {
  const { data: event, isLoading, isError } = useEvent(slug);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !event) return <NotFound />;

  const startsLong = formatEventDateLong(event.startDatetime);
  const time = new Date(event.startDatetime).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const endTime = event.endDatetime
    ? new Date(event.endDatetime).toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;
  const mapsQuery =
    event.latitude != null && event.longitude != null
      ? `${event.latitude},${event.longitude}`
      : encodeURIComponent(
          [event.venue, event.city, event.county, "Kenya"]
            .filter(Boolean)
            .join(", "),
        );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-8 md:px-margin-desktop md:py-12">
      <BackLink href="/events" label="Back to Events" className="mb-6" />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {event.category && <Badge variant="subtle">{event.category}</Badge>}
        {event.featured && <Badge variant="accent">Featured</Badge>}
      </div>

      <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary md:text-[40px] md:leading-[48px]">
        {event.title}
      </h1>
      <p className="mt-3 flex flex-wrap items-center gap-2 font-body-md text-body-md text-on-surface-variant">
        <CalendarIcon className="h-4 w-4 text-secondary" />
        <span>{startsLong}</span>
        <span aria-hidden>•</span>
        <span>
          {time}
          {endTime ? ` – ${endTime}` : ""}
        </span>
        {event.county && (
          <>
            <span aria-hidden>•</span>
            <span>{event.county}</span>
          </>
        )}
      </p>

      {/* Hero */}
      <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface-container">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            priority
            referrerPolicy="no-referrer"
            sizes="(max-width: 1024px) 100vw, 1280px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-tr from-primary via-primary-container to-secondary/40"
          />
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        {/* Main */}
        <div className="flex flex-col gap-10">
          {event.description && (
            <section>
              <h2 className="mb-3 font-headline-sm text-headline-sm text-primary">
                About this event
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                {event.description}
              </p>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-headline-sm text-headline-sm text-primary">
              Where
            </h2>
            <div className="overflow-hidden rounded-xl border border-outline-variant">
              <div
                aria-hidden
                className="flex h-40 items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-container"
              >
                <span className="material-symbols-outlined text-[40px] text-primary">
                  location_on
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-body-md text-body-md text-on-surface">
                    {event.venue ?? event.address ?? "Venue TBA"}
                  </p>
                  <p className="font-caption text-caption text-on-surface-variant">
                    {[event.city, event.county].filter(Boolean).join(", ") ||
                      "Kenya"}
                  </p>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Open in Maps
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-tonal">
            <div>
              <p className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
                Tickets
              </p>
              <p className="font-headline-md text-headline-md text-primary">
                {formatEventPrice(event)}
              </p>
            </div>

            {event.ticketUrl ? (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(buttonVariants({ size: "lg" }), "w-full")}
              >
                Get Tickets
              </a>
            ) : (
              <span
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full cursor-default",
                )}
              >
                Tickets at the gate
              </span>
            )}

            <dl className="flex flex-col gap-3 border-t border-surface-variant pt-4">
              <Row label="Date" value={startsLong} />
              <Row
                label="Time"
                value={`${time}${endTime ? ` – ${endTime}` : ""}`}
              />
              {event.venue && <Row label="Venue" value={event.venue} />}
              {event.organizer && (
                <Row label="Organizer" value={event.organizer} />
              )}
              {event.contact && <Row label="Contact" value={event.contact} />}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </dt>
      <dd className="text-right font-body-md text-body-md text-on-surface">
        {value}
      </dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-12 md:px-margin-desktop">
      <Skeleton className="mb-6 h-5 w-40" />
      <Skeleton className="mb-3 h-10 w-2/3" />
      <Skeleton className="mb-8 h-5 w-1/2" />
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-container-max flex-col items-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
      <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary">
        Event not found
      </h1>
      <p className="max-w-md font-body-lg text-body-lg text-on-surface-variant">
        This event may have ended or been removed.
      </p>
      <Link href="/events" className={cn(buttonVariants({ variant: "outline" }))}>
        Browse Events
      </Link>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3 9h18M8 2v4M16 2v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
