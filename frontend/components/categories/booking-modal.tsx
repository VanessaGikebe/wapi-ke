"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useCreateBooking } from "@/lib/queries/account";

interface BookingModalProps {
  experience: {
    id: string;
    title: string;
    location: string;
    priceTier: number;
  };
  open: boolean;
  onClose: () => void;
}

/** Confirmation modal that creates a `requested` booking (no payment yet). */
export function BookingModal({ experience, open, onClose }: BookingModalProps) {
  const [date, setDate] = React.useState("");
  const dateId = React.useId();
  const mutation = useCreateBooking();

  const handleClose = () => {
    mutation.reset();
    setDate("");
    onClose();
  };

  const succeeded = mutation.isSuccess;
  const title = succeeded ? "Booking requested" : "Request a booking";

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {succeeded ? (
        <div className="flex flex-col gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="h-6 w-6"
            >
              <path
                d="M5 12.5l4 4 10-10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            We&apos;ve noted your request for{" "}
            <span className="text-primary">{experience.title}</span>. We&apos;ll
            be in touch to confirm — no payment needed yet.
          </p>
          <Button onClick={handleClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="font-body-md text-body-md text-on-surface-variant">
            <span className="text-primary">{experience.title}</span>
            {experience.location ? ` · ${experience.location}` : ""} ·{" "}
            {"$".repeat(experience.priceTier)}
          </p>

          <div className="flex flex-col gap-2">
            <label
              htmlFor={dateId}
              className="font-label-md text-label-md uppercase text-on-surface-variant"
            >
              Preferred date (optional)
            </label>
            <Input
              id={dateId}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          {mutation.isError && (
            <p
              role="alert"
              className="rounded-lg bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container"
            >
              Couldn&apos;t create the booking. Please try again.
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({
                  experienceId: experience.id,
                  requestedDate: date || null,
                })
              }
            >
              {mutation.isPending ? "Requesting…" : "Confirm booking"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
