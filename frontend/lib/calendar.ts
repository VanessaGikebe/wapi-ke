/**
 * Client-side calendar helpers for a booking confirmation. Bookings carry only
 * a date (no time yet), so events are all-day. No backend involved — everything
 * is generated from data already in the booking response.
 */

export interface CalendarEvent {
  title: string;
  location?: string | null;
  /** ISO date "YYYY-MM-DD". Required — callers gate on its presence. */
  date: string;
  details?: string;
}

/** "2026-07-07" -> "20260707" (all-day date form). */
function compactDate(isoDate: string): string {
  return isoDate.replaceAll("-", "");
}

/** All-day DTEND is exclusive, so the day after the start date. */
function nextCompactDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10).replaceAll("-", "");
}

/** Escape per RFC 5545 (commas, semicolons, backslashes, newlines). */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** A minimal, valid single-event VCALENDAR string. */
export function buildIcs(event: CalendarEvent): string {
  const start = compactDate(event.date);
  const end = nextCompactDate(event.date);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const uid = `${start}-${Math.abs(hash(event.title))}@wapike`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wapike//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
  if (event.details) lines.push(`DESCRIPTION:${escapeIcs(event.details)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

/** Downloadable data: URI for the .ics file. */
export function icsDataUri(event: CalendarEvent): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(event))}`;
}

/** "Add to Google Calendar" template link for an all-day event. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compactDate(event.date)}/${nextCompactDate(event.date)}`,
  });
  if (event.location) params.set("location", event.location);
  if (event.details) params.set("details", event.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) | 0;
  return h;
}
