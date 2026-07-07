"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  businessAction,
  fetchBusinessDocumentUrl,
  fetchBusinessDocuments,
  fetchBusinesses,
  fetchOwnershipHistory,
  type AdminBusiness,
  type BusinessStatus,
} from "@/lib/api/admin-businesses";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-primary text-on-primary",
  suspended: "bg-error-container text-on-error-container",
  archived: "bg-surface-container-highest text-on-surface-variant",
};

const FILTERS: (BusinessStatus | undefined)[] = [
  undefined,
  "approved",
  "suspended",
  "archived",
];

export function BusinessesPanel() {
  const [status, setStatus] = React.useState<BusinessStatus | undefined>();
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [open, setOpen] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const query = useQuery({
    queryKey: ["admin", "businesses", status, debounced],
    queryFn: () => fetchBusinesses(status, debounced || undefined),
  });

  const rows = query.data ?? [];
  // The endpoint caps a page at 100 rows (no offset pagination), so make a full
  // page visibly a partial view rather than silently truncating the list.
  const truncated = rows.length >= 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Chip key={f ?? "all"} active={status === f} onClick={() => setStatus(f)}>
            {f ?? "All"}
          </Chip>
        ))}
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search businesses…"
          className="ml-auto max-w-xs"
        />
      </div>

      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : rows.length === 0 ? (
        <Empty>
          {status || debounced
            ? "No businesses match this filter."
            : "No businesses on the platform yet."}
        </Empty>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-outline-variant md:block">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container text-left">
                  {["Business", "Owner", "Status", "Verified", "Listings", "Contact", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 font-caption text-caption uppercase tracking-wide text-on-surface-variant">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <Row key={b.id} b={b} onView={() => setOpen(b.id)} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {rows.map((b) => (
              <li key={b.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-headline-sm text-headline-sm text-primary">{b.name}</p>
                  <StatusBadge status={b.status} />
                </div>
                <p className="font-caption text-caption text-on-surface-variant">
                  {b.owner_name ?? "—"} · {b.listing_count} listings
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(b.id)}>
                  View
                </Button>
              </li>
            ))}
          </ul>

          <p className="font-caption text-caption text-on-surface-variant">
            {truncated
              ? "Showing the first 100 businesses — refine with search or a status filter to narrow the list."
              : `Showing ${rows.length} ${rows.length === 1 ? "business" : "businesses"}.`}
          </p>
        </>
      )}

      {open && <BusinessDrawer id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Row({ b, onView }: { b: AdminBusiness; onView: () => void }) {
  return (
    <tr className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low">
      <td className="px-4 py-3">
        <span className="font-label-md text-label-md text-on-surface">{b.name}</span>
        <span className="block font-caption text-caption uppercase tracking-wide text-on-surface-variant">
          {b.business_type.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-4 py-3 font-body-md text-body-md text-on-surface">{b.owner_name ?? "—"}</td>
      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
      <td className="px-4 py-3 font-body-md text-body-md text-on-surface-variant">
        {new Date(b.verified_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 font-body-md text-body-md text-on-surface">{b.listing_count}</td>
      <td className="px-4 py-3 font-caption text-caption text-on-surface-variant">
        {b.owner_email ?? "—"}
        {b.owner_phone ? <span className="block">{b.owner_phone}</span> : null}
      </td>
      <td className="px-4 py-3">
        <Button variant="outline" size="sm" onClick={onView}>View</Button>
      </td>
    </tr>
  );
}

function BusinessDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const docs = useQuery({
    queryKey: ["admin", "business-docs", id],
    queryFn: () => fetchBusinessDocuments(id),
  });
  const history = useQuery({
    queryKey: ["admin", "business-history", id],
    queryFn: () => fetchOwnershipHistory(id),
  });
  // The list is cached under keys that also carry the active filter + search
  // (["admin","businesses",status,q]), so match by prefix across all of them
  // rather than an exact key that would never hit.
  const lists = qc.getQueriesData<AdminBusiness[]>({
    queryKey: ["admin", "businesses"],
  });
  const current = lists
    .flatMap(([, data]) => data ?? [])
    .find((b) => b.id === id);

  const mutate = useMutation({
    mutationFn: (action: "suspend" | "archive" | "reopen") =>
      businessAction(id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "businesses"] });
    },
  });

  const openDoc = async (docId: string) => {
    try {
      const { url } = await fetchBusinessDocumentUrl(id, docId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-scrim/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-tonal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headline-md text-headline-md text-primary">Business</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="material-symbols-outlined text-on-surface-variant">
            close
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={mutate.isPending} onClick={() => mutate.mutate("suspend")}>
            Suspend
          </Button>
          <Button size="sm" variant="outline" disabled={mutate.isPending} onClick={() => mutate.mutate("archive")}>
            Archive
          </Button>
          <Button size="sm" disabled={mutate.isPending} onClick={() => mutate.mutate("reopen")}>
            Reopen
          </Button>
        </div>
        {current && (
          <p className="mb-6 font-body-md text-body-md text-on-surface-variant">
            Current status: <StatusBadge status={current.status} />
          </p>
        )}

        <Section title="Documents">
          {docs.isLoading ? (
            <Muted>Loading…</Muted>
          ) : (docs.data?.documents.length ?? 0) === 0 ? (
            <Muted>No documents on record.</Muted>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {docs.data!.documents.map((d) => (
                <li key={d.id}>
                  <Button variant="subtle" size="sm" onClick={() => openDoc(d.id)}>
                    <span aria-hidden className="material-symbols-outlined text-[16px]">description</span>
                    {d.doc_type.replace(/_/g, " ")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Ownership history">
          {history.isLoading ? (
            <Muted>Loading…</Muted>
          ) : (history.data?.length ?? 0) === 0 ? (
            <Muted>No ownership records.</Muted>
          ) : (
            <ul className="flex flex-col divide-y divide-surface-variant">
              {history.data!.map((h, i) => (
                <li key={i} className="py-2">
                  <p className="font-label-md text-label-md text-on-surface">
                    {h.user_name ?? h.user_email} · {h.role}
                  </p>
                  <p className="font-caption text-caption text-on-surface-variant">
                    since {new Date(h.since).toLocaleDateString()} · via {h.source}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2 font-label-md text-label-md uppercase text-on-surface-variant">{title}</p>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="font-body-md text-body-md text-on-surface-variant">{children}</p>;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-1 font-caption text-caption uppercase tracking-wide", STATUS_STYLES[status] ?? "bg-surface-container-high text-on-surface")}>
      {status}
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
        active ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Loading() {
  return <div className="h-40 animate-pulse rounded-xl bg-surface-container" />;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-outline-variant px-6 py-16 text-center">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Couldn&apos;t load businesses. Check your connection and try again.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-outline-variant px-6 py-16 text-center font-body-md text-body-md text-on-surface-variant">
      {children}
    </div>
  );
}
