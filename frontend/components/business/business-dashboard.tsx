"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createListing,
  editListing,
  fetchMyListings,
  type ListingCreatePayload,
  type ManagerListing,
} from "@/lib/api/business";
import { priceLabel } from "@/lib/experience-presentation";
import { useCategories } from "@/lib/queries/categories";
import { cn } from "@/lib/utils";

const TABS = ["My Listings", "New Listing"] as const;
type Tab = (typeof TABS)[number];

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-primary text-on-primary",
  pending: "bg-secondary-container text-on-secondary-container",
  flagged: "bg-error-container text-on-error-container",
  removed: "bg-surface-container-highest text-on-surface-variant",
};

export function BusinessDashboard() {
  const [tab, setTab] = React.useState<Tab>("My Listings");
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
      {tab === "My Listings" && <MyListings />}
      {tab === "New Listing" && <NewListing onDone={() => setTab("My Listings")} />}
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
      {status}
    </span>
  );
}

function MyListings() {
  const query = useQuery({ queryKey: ["business", "listings"], queryFn: fetchMyListings });
  const [editing, setEditing] = React.useState<string | null>(null);

  if (query.isLoading) return <Loading />;
  const listings = query.data ?? [];
  if (listings.length === 0)
    return <Empty>You don&apos;t manage any listings yet. Create one, or claim an existing business from its page.</Empty>;

  return (
    <ul className="flex flex-col gap-3">
      {listings.map((l) =>
        editing === l.id ? (
          <EditRow key={l.id} listing={l} onClose={() => setEditing(null)} />
        ) : (
          <li
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
          >
            <div className="min-w-0">
              <Link href={`/experiences/${l.id}`} className="font-headline-sm text-headline-sm text-primary hover:text-secondary">
                {l.title}
              </Link>
              <p className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
                {l.category_slug} · {l.location ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={l.status} />
              <Button variant="outline" size="sm" onClick={() => setEditing(l.id)}>
                Edit
              </Button>
            </div>
          </li>
        ),
      )}
    </ul>
  );
}

function EditRow({ listing, onClose }: { listing: ManagerListing; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState(listing.title);
  const [location, setLocation] = React.useState(listing.location ?? "");
  const [priceTier, setPriceTier] = React.useState(listing.price_tier);
  const mutate = useMutation({
    mutationFn: () =>
      editListing(listing.id, {
        title,
        location: location || undefined,
        price_tier: priceTier,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business", "listings"] });
      onClose();
    },
  });
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-primary bg-surface-container-lowest p-4">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
      <PriceSelect value={priceTier} onChange={setPriceTier} />
      <div className="flex gap-2">
        <Button size="sm" disabled={mutate.isPending} onClick={() => mutate.mutate()}>
          {mutate.isPending ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </li>
  );
}

function NewListing({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const categories = useCategories();
  const [form, setForm] = React.useState<ListingCreatePayload>({
    title: "",
    category_slug: "",
    location: "",
    price_tier: 2,
    description: "",
    image_url: "",
  });
  const [banner, setBanner] = React.useState<string | null>(null);
  const set = (patch: Partial<ListingCreatePayload>) =>
    setForm((f) => ({ ...f, ...patch }));

  const mutate = useMutation({
    mutationFn: () =>
      createListing({
        ...form,
        location: form.location || undefined,
        description: form.description || undefined,
        image_url: form.image_url || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business", "listings"] });
      setBanner("Listing submitted — it's pending admin approval.");
      setForm({ title: "", category_slug: "", location: "", price_tier: 2, description: "", image_url: "" });
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.category_slug) return;
    setBanner(null);
    mutate.mutate();
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <Field label="Business name">
        <Input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Harvest Table" required />
      </Field>
      <Field label="Category">
        <select
          value={form.category_slug}
          onChange={(e) => set({ category_slug: e.target.value })}
          required
          className="h-12 w-full rounded-lg border border-outline-variant bg-surface px-4 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        >
          <option value="">Choose a category…</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Location">
        <Input value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Area, town" />
      </Field>
      <Field label="Price">
        <PriceSelect value={form.price_tier ?? 2} onChange={(v) => set({ price_tier: v })} />
      </Field>
      <Field label="Cover image URL (optional)">
        <Input type="url" value={form.image_url} onChange={(e) => set({ image_url: e.target.value })} placeholder="https://…" />
      </Field>
      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </Field>
      {banner && (
        <p role="status" className="rounded-lg bg-secondary-container px-4 py-3 font-body-md text-body-md text-on-secondary-container">
          {banner}{" "}
          <button type="button" onClick={onDone} className="font-medium underline">
            View my listings
          </button>
        </p>
      )}
      <div>
        <Button type="submit" size="lg" disabled={mutate.isPending}>
          {mutate.isPending ? "Submitting…" : "Submit for approval"}
        </Button>
      </div>
    </form>
  );
}

function PriceSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-12 w-full rounded-lg border border-outline-variant bg-surface px-4 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
    >
      {[1, 2, 3, 4].map((n) => (
        <option key={n} value={n}>
          {priceLabel(n)}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-md text-label-md uppercase text-on-surface-variant">{label}</label>
      {children}
    </div>
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
