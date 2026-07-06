"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  fetchAdminApplication,
  fetchAdminApplications,
  fetchDocumentUrl,
  reviewApplication,
  type ApplicationStatus,
  type ReviewResponse,
} from "@/lib/api/applications";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-primary text-on-primary",
  pending_verification: "bg-secondary-container text-on-secondary-container",
  more_info_requested: "bg-tertiary-container text-on-tertiary-container",
  rejected: "bg-error-container text-on-error-container",
};

const FILTERS: (ApplicationStatus | undefined)[] = [
  undefined,
  "pending_verification",
  "more_info_requested",
  "approved",
  "rejected",
];

export function ApplicationsTab() {
  const [status, setStatus] = React.useState<ApplicationStatus | undefined>();
  const [selected, setSelected] = React.useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "applications", status],
    queryFn: () => fetchAdminApplications(status),
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
        <Empty>No applications.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {(query.data ?? []).map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
            >
              <div className="min-w-0">
                <p className="font-headline-sm text-headline-sm text-primary">
                  {a.business_name}
                </p>
                <p className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
                  {a.business_type.replace(/_/g, " ")} · {a.owner_full_name}
                  {a.town ? ` · ${a.town}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(selected === a.id ? null : a.id)}
                >
                  {selected === a.id ? "Close" : "Review"}
                </Button>
              </div>
              {selected === a.id && (
                <div className="w-full">
                  <ApplicationDetail
                    id={a.id}
                    onDone={() => setSelected(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ApplicationDetail({ id, onDone }: { id: string; onDone: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin", "application", id],
    queryFn: () => fetchAdminApplication(id),
  });
  const [notes, setNotes] = React.useState("");
  const [approved, setApproved] = React.useState<ReviewResponse | null>(null);

  const mutate = useMutation({
    mutationFn: (action: "approve" | "reject" | "request_info") =>
      reviewApplication(id, { action, notes: notes || undefined }),
    onSuccess: (res, action) => {
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      if (action === "approve") setApproved(res);
      else onDone();
    },
  });

  if (detail.isLoading) return <Loading />;
  const app = detail.data;
  if (!app) return null;

  if (approved) {
    return (
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary bg-surface-container-low p-4">
        <p className="font-headline-sm text-headline-sm text-primary">
          Approved ✓
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant">
          A Business Account was created for {app.business_email}. Share this
          one-time activation link (email delivery arrives in a later release):
        </p>
        {approved.activation_link && (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={approved.activation_link}
              className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 font-caption text-caption text-on-surface"
            />
            <Button
              size="sm"
              onClick={() =>
                navigator.clipboard?.writeText(approved.activation_link!)
              }
            >
              Copy
            </Button>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Detail k="Business email" v={app.business_email} />
        <Detail k="Registration no." v={app.registration_number ?? "—"} />
        <Detail k="KRA PIN" v={app.kra_pin ?? "—"} />
        <Detail k="Year established" v={app.year_established?.toString() ?? "—"} />
        <Detail k="Owner" v={app.owner_full_name} />
        <Detail k="Owner ID" v={app.owner_national_id} />
        <Detail k="Owner phone" v={app.owner_phone} />
        <Detail
          k="Location"
          v={[app.physical_address, app.town, app.county].filter(Boolean).join(", ") || "—"}
        />
      </div>

      <div>
        <p className="mb-2 font-label-md text-label-md uppercase text-on-surface-variant">
          Documents
        </p>
        {app.documents.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            No documents uploaded.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {app.documents.map((d) => (
              <li key={d.id}>
                <DocumentLink applicationId={id} documentId={d.id} label={d.doc_type.replace(/_/g, " ")} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-label-md text-label-md uppercase text-on-surface-variant">
          Review notes (shared with the applicant on reject / request info)
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
          Approve & create account
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

function DocumentLink({
  applicationId,
  documentId,
  label,
}: {
  applicationId: string;
  documentId: string;
  label: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const open = async () => {
    setLoading(true);
    try {
      const { url } = await fetchDocumentUrl(applicationId, documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // ignore — button just does nothing on failure
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="subtle" size="sm" disabled={loading} onClick={open}>
      <span aria-hidden className="material-symbols-outlined text-[16px]">
        description
      </span>
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
