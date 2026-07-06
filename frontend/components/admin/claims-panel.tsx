"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  fetchAdminClaim,
  fetchAdminClaims,
  fetchClaimDocumentUrl,
  reviewClaim,
  type ClaimReviewResponse,
  type ClaimStatus,
} from "@/lib/api/claims";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-primary text-on-primary",
  pending: "bg-secondary-container text-on-secondary-container",
  more_info_requested: "bg-tertiary-container text-on-tertiary-container",
  rejected: "bg-error-container text-on-error-container",
};

const FILTERS: (ClaimStatus | undefined)[] = [
  undefined,
  "pending",
  "more_info_requested",
  "approved",
  "rejected",
];

export function ClaimsTab() {
  const [status, setStatus] = React.useState<ClaimStatus | undefined>();
  const [selected, setSelected] = React.useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "claims", status],
    queryFn: () => fetchAdminClaims(status),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Chip key={f ?? "all"} active={status === f} onClick={() => setStatus(f)}>
            {f ? f.replace(/_/g, " ") : "All"}
          </Chip>
        ))}
      </div>

      {query.isLoading ? (
        <Loading />
      ) : (query.data ?? []).length === 0 ? (
        <Empty>No claims.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {(query.data ?? []).map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
            >
              <div className="min-w-0">
                <p className="font-headline-sm text-headline-sm text-primary">
                  {c.listing_title ?? "Listing"}
                </p>
                <p className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
                  claimed by {c.claimant_name} · {c.claimant_email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(selected === c.id ? null : c.id)}
                >
                  {selected === c.id ? "Close" : "Review"}
                </Button>
              </div>
              {selected === c.id && (
                <div className="w-full">
                  <ClaimDetail id={c.id} onDone={() => setSelected(null)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClaimDetail({ id, onDone }: { id: string; onDone: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin", "claim", id],
    queryFn: () => fetchAdminClaim(id),
  });
  const [notes, setNotes] = React.useState("");
  const [approved, setApproved] = React.useState<ClaimReviewResponse | null>(null);

  const mutate = useMutation({
    mutationFn: (action: "approve" | "reject" | "request_info") =>
      reviewClaim(id, { action, notes: notes || undefined }),
    onSuccess: (res, action) => {
      qc.invalidateQueries({ queryKey: ["admin", "claims"] });
      if (action === "approve") setApproved(res);
      else onDone();
    },
  });

  if (detail.isLoading) return <Loading />;
  const claim = detail.data;
  if (!claim) return null;

  if (approved) {
    return (
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary bg-surface-container-low p-4">
        <p className="font-headline-sm text-headline-sm text-primary">Approved ✓</p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Ownership assigned to {claim.claimant_email}. Share this one-time
          activation link (email delivery arrives in a later release):
        </p>
        {approved.activation_link && (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={approved.activation_link}
              className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 font-caption text-caption text-on-surface"
            />
            <Button size="sm" onClick={() => navigator.clipboard?.writeText(approved.activation_link!)}>
              Copy
            </Button>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onDone}>Done</Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Detail k="Listing" v={claim.listing_title ?? "—"} />
        <Detail k="Location" v={claim.listing_location ?? "—"} />
        <Detail k="Claimant" v={claim.claimant_name} />
        <Detail k="Email" v={claim.claimant_email} />
        <Detail k="Phone" v={claim.claimant_phone ?? "—"} />
        <Detail k="National ID" v={claim.claimant_national_id ?? "—"} />
      </div>
      {claim.message && (
        <p className="font-body-md text-body-md text-on-surface-variant">“{claim.message}”</p>
      )}

      <div>
        <p className="mb-2 font-label-md text-label-md uppercase text-on-surface-variant">Documents</p>
        {claim.documents.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">No documents uploaded.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {claim.documents.map((d) => (
              <li key={d.id}>
                <DocumentLink claimId={id} documentId={d.id} label={d.doc_type.replace(/_/g, " ")} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-label-md text-label-md uppercase text-on-surface-variant">
          Review notes (shared with the claimant on reject / request info)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional notes…"
          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={mutate.isPending} onClick={() => mutate.mutate("approve")}>
          Approve & assign ownership
        </Button>
        <Button variant="outline" size="sm" disabled={mutate.isPending} onClick={() => mutate.mutate("request_info")}>
          Request more info
        </Button>
        <Button variant="ghost" size="sm" disabled={mutate.isPending} onClick={() => mutate.mutate("reject")}>
          Reject
        </Button>
      </div>
    </div>
  );
}

function DocumentLink({ claimId, documentId, label }: { claimId: string; documentId: string; label: string }) {
  const [loading, setLoading] = React.useState(false);
  const open = async () => {
    setLoading(true);
    try {
      const { url } = await fetchClaimDocumentUrl(claimId, documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="subtle" size="sm" disabled={loading} onClick={open}>
      <span aria-hidden className="material-symbols-outlined text-[16px]">description</span>
      {label}
    </Button>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">{k}</dt>
      <dd className="font-body-md text-body-md text-on-surface">{v}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 font-caption text-caption uppercase tracking-wide",
        STATUS_STYLES[status] ?? "bg-surface-container-high text-on-surface",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "transition-subtle rounded-full border px-3 py-1.5 font-caption text-caption capitalize",
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Loading() {
  return <div className="h-40 animate-pulse rounded-xl bg-surface-container" />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant px-6 py-16 text-center font-body-md text-body-md text-on-surface-variant">
      {children}
    </div>
  );
}
