"use client";

import * as React from "react";
import Link from "next/link";

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBusinessApplication, type DocumentInput } from "@/lib/api/portals";

const categories = [
  "Restaurants",
  "Cafes",
  "Nightlife",
  "Outdoor Activities",
  "Family Activities",
  "Staycations",
  "Cultural Experiences",
  "Events",
];

export default function BusinessSignupPage() {
  const [step, setStep] = React.useState(0);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    business_name: "",
    business_email: "",
    business_phone: "",
    category: categories[0],
    county: "",
    city: "",
    address: "",
    owner_name: "",
    owner_email: "",
    owner_phone: "",
    notes: "",
  });
  const [files, setFiles] = React.useState<File[]>([]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    const documents: DocumentInput[] = files.map((file, index) => ({
      document_type: index === 0 ? "registration" : "other",
      file_name: file.name,
      storage_path: `business-applications/pending/${Date.now()}-${file.name}`,
      mime_type: file.type || null,
    }));
    try {
      await createBusinessApplication({ ...form, documents });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
    } finally {
      setSubmitting(false);
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
          List a New Business
        </h1>

        {submitted ? (
          <Card className="mt-8 p-6">
            <h2 className="font-headline-sm text-headline-sm text-primary">
              Application submitted
            </h2>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              Your application is pending manual verification. We will create
              the business account only after approval.
            </p>
          </Card>
        ) : (
          <Card className="mt-8 p-6">
            <div className="mb-6 flex gap-2">
              {["Business", "Owner", "Location", "Documents"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`rounded-full px-3 py-1 font-label-md text-label-md ${
                    step === index
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {step === 0 && (
                <>
                  <Field label="Business name"><Input required value={form.business_name} onChange={update("business_name")} /></Field>
                  <Field label="Business email"><Input type="email" required value={form.business_email} onChange={update("business_email")} /></Field>
                  <Field label="Business phone"><Input value={form.business_phone} onChange={update("business_phone")} /></Field>
                  <Field label="Tourism category">
                    <select value={form.category} onChange={update("category")} className="h-12 rounded-lg border border-outline-variant bg-surface px-4">
                      {categories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </Field>
                </>
              )}
              {step === 1 && (
                <>
                  <Field label="Owner name"><Input required value={form.owner_name} onChange={update("owner_name")} /></Field>
                  <Field label="Owner email"><Input type="email" required value={form.owner_email} onChange={update("owner_email")} /></Field>
                  <Field label="Owner phone"><Input value={form.owner_phone} onChange={update("owner_phone")} /></Field>
                </>
              )}
              {step === 2 && (
                <>
                  <Field label="County"><Input required value={form.county} onChange={update("county")} /></Field>
                  <Field label="City"><Input value={form.city} onChange={update("city")} /></Field>
                  <Field label="Address"><Input value={form.address} onChange={update("address")} /></Field>
                </>
              )}
              {step === 3 && (
                <>
                  <Field label="Supporting documents">
                    <Input
                      type="file"
                      multiple
                      onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                    />
                  </Field>
                  <Field label="Notes">
                    <textarea value={form.notes} onChange={update("notes")} className="min-h-28 rounded-lg border border-outline-variant bg-surface px-4 py-3" />
                  </Field>
                </>
              )}
            </div>

            {error && <p className="mt-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container">{error}</p>}
            <div className="mt-6 flex justify-between gap-3">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
              {step < 3 ? (
                <Button onClick={() => setStep((s) => Math.min(3, s + 1))}>Next</Button>
              ) : (
                <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting..." : "Submit application"}</Button>
              )}
            </div>
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
