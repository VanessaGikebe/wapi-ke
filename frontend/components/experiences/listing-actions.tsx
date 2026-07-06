"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { reportExperience } from "@/lib/api/roles";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Report (any signed-in user) + a link into the Business portal to claim this
 * listing. Claiming is a verification-gated flow (`/business/claim`), not a
 * self-service account action.
 */
export function ListingActions({
  experienceId,
  redirectPath,
}: {
  experienceId: string;
  redirectPath: string;
}) {
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated);

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

  return (
    <div className="mt-4 flex flex-col gap-2 border-t border-surface-variant pt-4">
      <Link
        href="/business/claim"
        className="rounded text-left font-caption text-caption text-primary underline-offset-2 hover:underline"
      >
        Own this business? Claim it →
      </Link>

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
