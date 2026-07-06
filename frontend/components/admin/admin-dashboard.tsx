"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApplicationsTab } from "@/components/admin/applications-panel";
import { ClaimsTab } from "@/components/admin/claims-panel";
import {
  fetchAdminListings,
  fetchAudit,
  fetchReports,
  updateListingStatus,
  updateReport,
  type ListingStatus,
} from "@/lib/api/admin";
import { cn } from "@/lib/utils";

const TABS = ["Applications", "Claims", "Listings", "Reports", "Audit"] as const;
type Tab = (typeof TABS)[number];

const STATUS_STYLES: Record<ListingStatus, string> = {
  approved: "bg-primary text-on-primary",
  pending: "bg-secondary-container text-on-secondary-container",
  flagged: "bg-error-container text-on-error-container",
  removed: "bg-surface-container-highest text-on-surface-variant",
};

export function AdminDashboard() {
  const [tab, setTab] = React.useState<Tab>("Applications");
  return (
    <div>
      <div role="tablist" className="mb-8 flex gap-1 overflow-x-auto border-b border-surface-variant">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "transition-subtle -mb-px shrink-0 border-b-2 px-4 pb-3 font-label-md text-label-md uppercase tracking-wider",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-primary",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Applications" && <ApplicationsTab />}
      {tab === "Claims" && <ClaimsTab />}
      {tab === "Listings" && <ListingsTab />}
      {tab === "Reports" && <ReportsTab />}
      {tab === "Audit" && <AuditTab />}
    </div>
  );
}

export function ListingsTab() {
  const qc = useQueryClient();
  const [status, setStatus] = React.useState<ListingStatus | undefined>();
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const query = useQuery({
    queryKey: ["admin", "listings", status, debounced],
    queryFn: () => fetchAdminListings(status, debounced || undefined),
  });
  const mutate = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ListingStatus }) =>
      updateListingStatus(id, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "listings"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });

  const filters: (ListingStatus | undefined)[] = [
    undefined,
    "pending",
    "approved",
    "flagged",
    "removed",
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Chip key={f ?? "all"} active={status === f} onClick={() => setStatus(f)}>
            {f ?? "All"}
          </Chip>
        ))}
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search listings…"
          className="ml-auto max-w-xs"
        />
      </div>

      {query.isLoading ? (
        <Loading />
      ) : (
        <ul className="flex flex-col gap-3">
          {(query.data ?? []).map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/experiences/${l.id}`}
                  className="font-headline-sm text-headline-sm text-primary hover:text-secondary"
                >
                  {l.title}
                </Link>
                <p className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
                  {l.category_slug} · {l.location ?? "—"}
                  {l.owner_id ? " · owned" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={l.status} />
                <StatusActions
                  current={l.status}
                  disabled={mutate.isPending}
                  onSet={(next) => mutate.mutate({ id: l.id, next })}
                />
              </div>
            </li>
          ))}
          {query.data?.length === 0 && <Empty>No listings.</Empty>}
        </ul>
      )}
    </div>
  );
}

function StatusActions({
  current,
  disabled,
  onSet,
}: {
  current: ListingStatus;
  disabled: boolean;
  onSet: (s: ListingStatus) => void;
}) {
  const actions: { label: string; status: ListingStatus }[] = [
    { label: "Approve", status: "approved" },
    { label: "Flag", status: "flagged" },
    { label: "Remove", status: "removed" },
    { label: "Pending", status: "pending" },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {actions
        .filter((a) => a.status !== current)
        .map((a) => (
          <Button
            key={a.status}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSet(a.status)}
          >
            {a.label}
          </Button>
        ))}
    </div>
  );
}

export function ReportsTab() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "reports"], queryFn: () => fetchReports() });
  const mutate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "reviewed" | "dismissed" }) =>
      updateReport(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reports"] }),
  });

  if (query.isLoading) return <Loading />;
  const reports = query.data ?? [];
  if (reports.length === 0) return <Empty>No reports.</Empty>;

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/experiences/${r.experience_id}`}
              className="font-headline-sm text-headline-sm text-primary hover:text-secondary"
            >
              {r.experience_title ?? "Listing"}
            </Link>
            <p className="mt-1 font-body-md text-body-md text-on-surface">“{r.reason}”</p>
            <p className="mt-1 font-caption text-caption text-on-surface-variant">
              by {r.reporter_email ?? "someone"} · {r.status}
            </p>
          </div>
          {r.status === "open" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={mutate.isPending} onClick={() => mutate.mutate({ id: r.id, status: "reviewed" })}>
                Reviewed
              </Button>
              <Button variant="ghost" size="sm" disabled={mutate.isPending} onClick={() => mutate.mutate({ id: r.id, status: "dismissed" })}>
                Dismiss
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AuditTab() {
  const query = useQuery({ queryKey: ["admin", "audit"], queryFn: () => fetchAudit() });
  if (query.isLoading) return <Loading />;
  const rows = query.data ?? [];
  if (rows.length === 0) return <Empty>No actions yet.</Empty>;
  return (
    <ul className="flex flex-col divide-y divide-surface-variant">
      {rows.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <span className="font-body-md text-body-md text-on-surface">
            <strong className="capitalize">{a.action.replace(/_/g, " ")}</strong>
            {a.experience_title ? ` · ${a.experience_title}` : ""}
            {a.note ? ` — ${a.note}` : ""}
          </span>
          <span className="font-caption text-caption text-on-surface-variant">
            {a.actor_email ?? "system"} · {new Date(a.created_at).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 font-caption text-caption uppercase tracking-wide",
        STATUS_STYLES[status],
      )}
    >
      {status}
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
