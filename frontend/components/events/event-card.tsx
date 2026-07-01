"use client";

import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardBody,
  CardMedia,
  CardMeta,
  CardTitle,
} from "@/components/ui/card";
import {
  formatEventDate,
  formatEventPrice,
  type WapikeEvent,
} from "@/lib/api/events";

export function EventCard({ event }: { event: WapikeEvent }) {
  const { day, time } = formatEventDate(event.startDatetime);
  const href = `/events/${event.slug}`;
  const price = formatEventPrice(event);

  return (
    <Card className="h-full">
      <CardMedia className="aspect-[16/10]">
        <Link
          href={href}
          aria-label={event.title}
          className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
        >
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              referrerPolicy="no-referrer"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-tr from-primary via-primary-container to-secondary/40"
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent"
          />
        </Link>

        <div className="absolute left-4 top-4 z-10 flex flex-col items-center rounded-xl bg-surface-container-lowest/90 px-3 py-1.5 text-center shadow-tonal backdrop-blur-sm">
          <span className="font-label-md text-label-md uppercase leading-tight text-secondary">
            {day}
          </span>
          <span className="font-caption text-caption leading-tight text-on-surface-variant">
            {time}
          </span>
        </div>

        {event.category && (
          <Badge
            variant="glass"
            shape="chip"
            className="absolute right-4 top-4 z-10"
          >
            {event.category}
          </Badge>
        )}
      </CardMedia>

      <CardBody className="flex-1">
        <Link
          href={href}
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
        >
          <CardTitle className="line-clamp-1">{event.title}</CardTitle>
        </Link>

        {event.venue && (
          <CardMeta>
            <span className="normal-case tracking-normal">{event.venue}</span>
          </CardMeta>
        )}

        <div className="mt-1 flex items-center justify-between gap-3">
          {event.county && (
            <span className="flex items-center gap-1 font-body-md text-body-md text-on-surface-variant">
              <PinIcon className="h-4 w-4 shrink-0 text-secondary" />
              {event.county}
            </span>
          )}
          <span className="font-label-md text-label-md text-primary">
            {price}
          </span>
        </div>

        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-1 pt-1 font-label-md text-label-md uppercase tracking-wider text-primary transition-colors hover:text-secondary"
        >
          View event
          <span aria-hidden>→</span>
        </Link>
      </CardBody>
    </Card>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}
