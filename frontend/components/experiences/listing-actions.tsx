"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { submitClaim } from "@/lib/api/business";
import { reportExperience } from "@/lib/api/roles";
import { useAuthStore } from "@/lib/stores/auth-store";

/** Report (any signed-in user) + Claim (business managers) actions. */
export function ListingActions({
  experienceId,
  redirectPath,
}: {
  experienceId: string;
  redirectPath: string;
}) {
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const canClaim = role === "business_manager" || role === "administrator";

  const [reporting, setReporting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const requireAuth = () =>
    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);

  const sendReport = async () => {
    if (reason.trim().length < 3) {
      setMsg("Please add a short reason.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await reportExperience(experienceId, reason.trim());
      setReporting(false);
      setReason("");
      setMsg("Thanks — reported for review.");
    } catch {
      setMsg("Couldn't submit the report.");
    } finally {
      setBusy(false);
    }
  };

  const claim = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await submitClaim(experienceId);
      setMsg("Claim submitted — an admin will review it.");
    } catch (err) {
      setMsg(
        err instanceof Error && err.message.includes("pending")
          ? "You already have a pending claim on this."
          : "Couldn't submit the claim.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-surface-variant pt-4">
      {canClaim && (
        <Button variant="outline" size="sm" disabled={busy} onClick={claim}>
          Claim this business
        </Button>
      )}

      {!reporting ? (
        <button
          type="button"
          onClick={() => (isAuth ? setReporting(true) : requireAuth())}
          className="rounded text-left font-caption text-caption text-on-surface-variant underline-offset-2 hover:text-error hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          Report this listing as fake or suspicious
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="What's wrong with this listing?"
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={sendReport}>
              Submit report
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setReporting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {msg && (
        <p className="font-caption text-caption text-on-surface-variant">{msg}</p>
      )}
    </div>
  );
}
