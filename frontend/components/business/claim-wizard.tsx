"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  searchBusinesses,
  submitClaim,
  type BusinessSearchItem,
} from "@/lib/api/claims";
import { uploadClaimDocument, validateDocFile } from "@/lib/business-docs";
import type { DocumentType } from "@/lib/api/applications";
import { cn } from "@/lib/utils";

const STEPS = ["Find", "Your details", "Proof", "Review"] as const;

interface Details {
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string;
  claimant_national_id: string;
  message: string;
}

const EMPTY: Details = {
  claimant_name: "",
  claimant_email: "",
  claimant_phone: "",
  claimant_national_id: "",
  message: "",
};

const PROOF_SLOTS: { docType: DocumentType; label: string; required: boolean }[] = [
  { docType: "ownership_proof", label: "Proof of ownership (permit, utility bill, lease…)", required: true },
  { docType: "national_id", label: "Owner National ID / Passport (optional)", required: false },
];

export function ClaimWizard() {
  const [step, setStep] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<BusinessSearchItem[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<BusinessSearchItem | null>(null);
  const [form, setForm] = React.useState<Details>(EMPTY);
  const [files, setFiles] = React.useState<Record<string, File | null>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ id: string } | null>(null);

  const set = (patch: Partial<Details>) => setForm((f) => ({ ...f, ...patch }));

  // Debounced catalog search.
  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const id = setTimeout(() => {
      searchBusinesses(query.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  if (done) return <Received claimId={done.id} title={selected?.title ?? ""} />;

  const validate = (): string | null => {
    if (step === 0 && !selected) return "Search and select your business.";
    if (step === 1) {
      if (form.claimant_name.trim().length < 2) return "Enter your full name.";
      if (!form.claimant_email.includes("@")) return "Enter a valid email.";
    }
    if (step === 2) {
      for (const slot of PROOF_SLOTS) {
        const file = files[slot.docType];
        if (slot.required && !file) return `${slot.label} is required.`;
        if (file) {
          const err = validateDocFile(file);
          if (err) return `${slot.label}: ${err}`;
        }
      }
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) return setError(err);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      setProgress("Submitting claim…");
      const res = await submitClaim({
        experience_id: selected.id,
        claimant_name: form.claimant_name,
        claimant_email: form.claimant_email,
        claimant_phone: form.claimant_phone || undefined,
        claimant_national_id: form.claimant_national_id || undefined,
        message: form.message || undefined,
      });
      const slots = PROOF_SLOTS.filter((s) => files[s.docType]);
      for (let i = 0; i < slots.length; i++) {
        setProgress(`Uploading documents (${i + 1}/${slots.length})…`);
        await uploadClaimDocument(res.id, slots[i].docType, files[slots[i].docType]!);
      }
      setDone({ id: res.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the claim.");
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Stepper current={step} />

      <div className="mt-8 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-tonal md:p-8">
        {step === 0 && (
          <Section title="Find your business" subtitle="Search WapiKE for the listing you want to claim.">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by business name…"
            />
            {searching && (
              <p className="font-caption text-caption text-on-surface-variant">Searching…</p>
            )}
            <ul className="flex flex-col gap-2">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-subtle",
                      selected?.id === r.id
                        ? "border-primary bg-surface-container-high"
                        : "border-outline-variant hover:border-primary",
                    )}
                  >
                    {r.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image_url} alt="" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-label-md text-label-md text-on-surface">{r.title}</span>
                      <span className="block truncate font-caption text-caption uppercase tracking-wide text-on-surface-variant">
                        {r.category_slug} · {r.location ?? "—"}
                      </span>
                    </span>
                    {selected?.id === r.id && (
                      <span aria-hidden className="material-symbols-outlined ml-auto text-primary">check_circle</span>
                    )}
                  </button>
                </li>
              ))}
              {query.trim().length >= 2 && !searching && results.length === 0 && (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  No matches. If your business isn&apos;t listed,{" "}
                  <Link href="/business/signup" className="text-primary underline">
                    apply to list it
                  </Link>
                  .
                </p>
              )}
            </ul>
          </Section>
        )}

        {step === 1 && (
          <Section title="Your details" subtitle="How we reach you about this claim.">
            <Field label="Full name" required>
              <Input value={form.claimant_name} onChange={(e) => set({ claimant_name: e.target.value })} placeholder="e.g. Peter Kamau" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" required>
                <Input type="email" value={form.claimant_email} onChange={(e) => set({ claimant_email: e.target.value })} placeholder="you@example.com" />
              </Field>
              <Field label="Phone">
                <Input value={form.claimant_phone} onChange={(e) => set({ claimant_phone: e.target.value })} placeholder="+254 7…" />
              </Field>
            </div>
            <Field label="National ID number">
              <Input value={form.claimant_national_id} onChange={(e) => set({ claimant_national_id: e.target.value })} placeholder="12345678" />
            </Field>
            <Field label="Message (optional)">
              <textarea
                value={form.message}
                onChange={(e) => set({ message: e.target.value })}
                rows={3}
                placeholder="Tell us about your connection to this business."
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </Field>
          </Section>
        )}

        {step === 2 && (
          <Section title="Proof of ownership" subtitle="Upload a document that proves you own or manage this business.">
            <div className="flex flex-col gap-3">
              {PROOF_SLOTS.map((slot) => (
                <FileRow
                  key={slot.docType}
                  label={slot.label}
                  required={slot.required}
                  file={files[slot.docType] ?? null}
                  onPick={(file) => setFiles((f) => ({ ...f, [slot.docType]: file }))}
                />
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Review & submit" subtitle="Confirm before submitting for admin review.">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row k="Business" v={selected?.title ?? "—"} />
              <Row k="Location" v={selected?.location ?? "—"} />
              <Row k="Your name" v={form.claimant_name} />
              <Row k="Email" v={form.claimant_email} />
              <Row k="Documents" v={`${PROOF_SLOTS.filter((s) => files[s.docType]).length} attached`} />
            </dl>
          </Section>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-error-container px-4 py-2.5 font-body-md text-body-md text-on-error-container">
            {error}
          </p>
        )}
        {progress && (
          <p role="status" className="mt-4 font-body-md text-body-md text-on-surface-variant">{progress}</p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={back} disabled={submitting}>Back</Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit claim"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full font-label-md text-label-md",
                state === "done" && "bg-primary text-on-primary",
                state === "current" && "border-2 border-primary text-primary",
                state === "todo" && "border border-outline-variant text-on-surface-variant",
              )}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span className={cn("font-label-md text-label-md", state === "current" ? "text-primary" : "text-on-surface-variant")}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden className="mx-1 hidden h-px w-6 bg-outline-variant sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}

function FileRow({
  label,
  required,
  file,
  onPick,
}: {
  label: string;
  required: boolean;
  file: File | null;
  onPick: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="font-label-md text-label-md text-on-surface">
          {label}
          {required && <span className="text-error"> *</span>}
        </p>
        {file && <p className="truncate font-caption text-caption text-on-surface-variant">{file.name}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <Button variant={file ? "subtle" : "outline"} size="sm" onClick={() => inputRef.current?.click()}>
        {file ? "Change" : "Upload"}
      </Button>
    </div>
  );
}

function Received({ claimId, title }: { claimId: string; title: string }) {
  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-tonal">
      <span aria-hidden className="material-symbols-outlined text-[44px] text-primary">task_alt</span>
      <h1 className="font-headline-md text-headline-md text-primary">Claim submitted</h1>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Thanks. Our team will review your claim{title ? ` for ${title}` : ""} and
        the documents you uploaded. Once approved, we&apos;ll email an activation
        link so you can manage your business.
      </p>
      <p className="font-caption text-caption text-on-surface-variant">
        Reference: <span className="font-mono">{claimId}</span>
      </p>
      <Link href="/" className="font-label-md text-label-md text-primary underline-offset-2 hover:underline">
        Back to WapiKE
      </Link>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">{k}</dt>
      <dd className="font-body-md text-body-md text-on-surface">{v}</dd>
    </div>
  );
}
