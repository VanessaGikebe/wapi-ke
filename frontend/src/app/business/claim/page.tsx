"use client";

import * as React from "react";
import Link from "next/link";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createBusinessClaim,
  searchBusinesses,
  type BusinessAccount,
  type DocumentInput,
} from "@/lib/api/portals";

export default function BusinessClaimPage() {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<BusinessAccount[]>([]);
  const [selected, setSelected] = React.useState<BusinessAccount | null>(null);
  const [claimant, setClaimant] = React.useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [files, setFiles] = React.useState<File[]>([]);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      setResults(await searchBusinesses(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search businesses.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    const documents: DocumentInput[] = files.map((file) => ({
      document_type: "ownership",
      file_name: file.name,
      storage_path: `business-claims/pending/${Date.now()}-${file.name}`,
      mime_type: file.type || null,
    }));
    try {
      await createBusinessClaim({
        business_id: selected.id,
        claimant_name: claimant.name,
        claimant_email: claimant.email,
        claimant_phone: claimant.phone,
        message: claimant.message,
        documents,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit claim.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-margin-mobile py-12 md:px-margin-desktop">
        <Link href="/business" className="font-label-md text-label-md text-secondary">
          Back to Business Portal
        </Link>
        <h1 className="mt-6 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
          Claim an Existing Business
        </h1>

        {submitted ? (
          <Card className="mt-8 p-6">
            <h2 className="font-headline-sm text-headline-sm text-primary">Claim submitted</h2>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              Your ownership proof is pending admin review.
            </p>
          </Card>
        ) : (
          <Card className="mt-8 p-6">
            {!selected ? (
              <>
                <div className="flex gap-3">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by business name, city, or email"
                  />
                  <Button onClick={runSearch} disabled={loading}>
                    Search
                  </Button>
                </div>
                <div className="mt-5 grid gap-3">
                  {results.map((business) => (
                    <button
                      key={business.id}
                      type="button"
                      onClick={() => setSelected(business)}
                      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left hover:border-secondary"
                    >
                      <strong className="block text-primary">{business.name}</strong>
                      <span className="text-on-surface-variant">
                        {[business.category, business.city, business.county].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid gap-4">
                <div className="rounded-xl bg-surface-container p-4">
                  <p className="font-label-md text-label-md uppercase text-on-surface-variant">Selected business</p>
                  <p className="mt-1 font-headline-sm text-headline-sm text-primary">{selected.name}</p>
                </div>
                <Field label="Your name"><Input value={claimant.name} onChange={(e) => setClaimant((c) => ({ ...c, name: e.target.value }))} /></Field>
                <Field label="Your email"><Input type="email" value={claimant.email} onChange={(e) => setClaimant((c) => ({ ...c, email: e.target.value }))} /></Field>
                <Field label="Your phone"><Input value={claimant.phone} onChange={(e) => setClaimant((c) => ({ ...c, phone: e.target.value }))} /></Field>
                <Field label="Ownership proof"><Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></Field>
                <Field label="Message"><textarea value={claimant.message} onChange={(e) => setClaimant((c) => ({ ...c, message: e.target.value }))} className="min-h-28 rounded-lg border border-outline-variant bg-surface px-4 py-3" /></Field>
                <div className="flex justify-between gap-3">
                  <Button variant="outline" onClick={() => setSelected(null)}>Back to search</Button>
                  <Button onClick={submit} disabled={loading}>{loading ? "Submitting..." : "Submit claim"}</Button>
                </div>
              </div>
            )}
            {error && <p className="mt-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container">{error}</p>}
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 font-label-md text-label-md uppercase text-on-surface-variant">
      {label}
      {children}
    </label>
  );
}
