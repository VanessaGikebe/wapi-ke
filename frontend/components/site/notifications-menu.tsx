"use client";

import { Dropdown } from "./dropdown";

// Mock notifications — booking confirmations, reminders, recommendations.
const NOTIFICATIONS = [
  {
    icon: "check_circle",
    title: "Booking confirmed",
    body: "Your booking at Altitude Lounge has been confirmed.",
    time: "2h ago",
  },
  {
    icon: "event_upcoming",
    title: "Upcoming experience",
    body: "Reminder: Mara Horseback Safari is this weekend.",
    time: "1d ago",
  },
  {
    icon: "auto_awesome",
    title: "New recommendations",
    body: "We found 3 new hidden cafés near you.",
    time: "3d ago",
  },
];

export function NotificationsMenu() {
  return (
    <Dropdown
      label="Notifications"
      triggerClassName="relative h-10 w-10 justify-center text-primary hover:bg-surface-container-high"
      trigger={
        <>
          <span aria-hidden className="material-symbols-outlined text-[22px]">
            notifications
          </span>
          <span
            aria-hidden
            className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-secondary ring-2 ring-surface"
          />
        </>
      }
    >
      {() => (
        <div>
          <div className="border-b border-surface-variant px-4 py-3">
            <p className="font-label-md text-label-md uppercase tracking-wider text-primary">
              Notifications
            </p>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {NOTIFICATIONS.map((n) => (
              <li
                key={n.title}
                className="flex gap-3 border-b border-surface-variant px-4 py-3 last:border-b-0"
              >
                <span
                  aria-hidden
                  className="material-symbols-outlined mt-0.5 text-[20px] text-secondary"
                >
                  {n.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-label-md text-label-md text-primary">
                    {n.title}
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {n.body}
                  </p>
                  <p className="mt-1 font-caption text-caption text-on-surface-variant">
                    {n.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dropdown>
  );
}
