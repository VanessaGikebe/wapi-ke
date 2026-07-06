"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  submitApplication,
  type ApplicationPayload,
  type BusinessType,
  type DocumentType,
} from "@/lib/api/applications";
import { uploadBusinessDocument, validateDocFile } from "@/lib/business-docs";
import { useCategories } from "@/lib/queries/categories";
import { cn } from "@/lib/utils";

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "limited_company", label: "Limited Company" },
  { value: "ngo", label: "NGO" },
  { value: "cbo", label: "CBO" },
  { value: "cooperative", label: "Cooperative" },
  { value: "other", label: "Other" },
];

const STEPS = [
  "Business",
  "Owner",
  "Location",
  "Category",
  "Documents",
  "Review",
] as const;

interface DocSlot {
  docType: DocumentType;
  label: string;
  required: boolean;
  imagesOnly: boolean;
}

const DOC_SLOTS: DocSlot[] = [
  {
    docType: "registration_certificate",
    label: "Business Registration Certificate",
    required: true,
    imagesOnly: false,
  },
  { docType: "national_id", label: "Owner National ID / Passport", required: true, imagesOnly: false },
  { docType: "business_permit", label: "Business Permit (optional)", required: false, imagesOnly: false },
  { docType: "tourism_licence", label: "Tourism Licence (optional)", required: false, imagesOnly: false },
  { docType: "business_logo", label: "Business Logo (optional)", required: false, imagesOnly: true },
  { docType: "cover_image", label: "Cover Image (optional)", required: false, imagesOnly: true },
];

type Form = Omit<ApplicationPayload, "year_established"> & {
  year_established: string;
};

const EMPTY: Form = {
  business_email: "",
  business_name: "",
  business_type: "limited_company",
  registration_number: "",
  kra_pin: "",
  year_established: "",
  owner_full_name: "",
  owner_national_id: "",
  owner_phone: "",
  owner_email: "",
  county: "",
  town: "",
  physical_address: "",
  primary_category_slug: "",
  secondary_category_slug: "",
};

export function ApplicationWizard() {
  const categories = useCategories();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<Form>(EMPTY);
  const [files, setFiles] = React.useState<Record<string, File | null>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitProgress, setSubmitProgress] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<{ id: string } | null>(null);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  if (done) return <Received applicationId={done.id} />;

  const validateStep = (): string | null => {
    switch (step) {
      case 0:
        if (form.business_name.trim().length < 2) return "Enter your business name.";
        return null;
      case 1:
        if (form.owner_full_name.trim().length < 2) return "Enter the owner's full name.";
        if (form.owner_national_id.trim().length < 3) return "Enter the owner's ID number.";
        if (form.owner_phone.trim().length < 7) return "Enter a valid phone number.";
        if (!form.owner_email.includes("@")) return "Enter the owner's email.";
        return null;
      case 3:
        if (!form.primary_category_slug) return "Choose your primary category.";
        return null;
      case 4:
        if (!form.business_email.includes("@")) return "Enter the business account email.";
        for (const slot of DOC_SLOTS) {
          const file = files[slot.docType];
          if (slot.required && !file) return `${slot.label} is required.`;
          if (file) {
            const err = validateDocFile(file, slot.imagesOnly);
            if (err) return `${slot.label}: ${err}`;
          }
        }
        return null;
      default:
        return null;
    }
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      setSubmitProgress("Submitting application…");
      const payload: ApplicationPayload = {
        ...form,
        registration_number: form.registration_number || undefined,
        kra_pin: form.kra_pin || undefined,
        year_established: form.year_established
          ? Number(form.year_established)
          : undefined,
        county: form.county || undefined,
        town: form.town || undefined,
        physical_address: form.physical_address || undefined,
        secondary_category_slug: form.secondary_category_slug || undefined,
      };
      const res = await submitApplication(payload);

      const slots = DOC_SLOTS.filter((s) => files[s.docType]);
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        setSubmitProgress(`Uploading documents (${i + 1}/${slots.length})…`);
        await uploadBusinessDocument(res.id, slot.docType, files[slot.docType]!);
      }
      setDone({ id: res.id });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong submitting your application.",
      );
    } finally {
      setSubmitting(false);
      setSubmitProgress(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Stepper current={step} />

      <div className="mt-8 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-tonal md:p-8">
        {step === 0 && (
          <Section title="Business details" subtitle="Tell us about your business.">
            <Field label="Business name" required>
              <Input value={form.business_name} onChange={(e) => set({ business_name: e.target.value })} placeholder="e.g. Harvest Table Kitchen" />
            </Field>
            <Field label="Business type" required>
              <Select value={form.business_type} onChange={(v) => set({ business_type: v as BusinessType })}>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Registration number">
              <Input value={form.registration_number} onChange={(e) => set({ registration_number: e.target.value })} placeholder="e.g. PVT-2020-12345" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="KRA PIN (optional)">
                <Input value={form.kra_pin} onChange={(e) => set({ kra_pin: e.target.value })} placeholder="A000000000X" />
              </Field>
              <Field label="Year established (optional)">
                <Input type="number" value={form.year_established} onChange={(e) => set({ year_established: e.target.value })} placeholder="2018" />
              </Field>
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="Owner details" subtitle="The person responsible for this business account.">
            <Field label="Full name" required>
              <Input value={form.owner_full_name} onChange={(e) => set({ owner_full_name: e.target.value })} placeholder="e.g. Amina Otieno" />
            </Field>
            <Field label="National ID number" required>
              <Input value={form.owner_national_id} onChange={(e) => set({ owner_national_id: e.target.value })} placeholder="12345678" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone number" required>
                <Input value={form.owner_phone} onChange={(e) => set({ owner_phone: e.target.value })} placeholder="+254 7…" />
              </Field>
              <Field label="Email address" required>
                <Input type="email" value={form.owner_email} onChange={(e) => set({ owner_email: e.target.value })} placeholder="owner@example.com" />
              </Field>
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="Location" subtitle="Where can travellers find you?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="County">
                <Input value={form.county} onChange={(e) => set({ county: e.target.value })} placeholder="Nairobi" />
              </Field>
              <Field label="Town">
                <Input value={form.town} onChange={(e) => set({ town: e.target.value })} placeholder="Karen" />
              </Field>
            </div>
            <Field label="Physical address">
              <Input value={form.physical_address} onChange={(e) => set({ physical_address: e.target.value })} placeholder="Street, building, area" />
            </Field>
          </Section>
        )}

        {step === 3 && (
          <Section title="Category" subtitle="How should we classify your business?">
            <Field label="Primary category" required>
              <Select value={form.primary_category_slug} onChange={(v) => set({ primary_category_slug: v })}>
                <option value="">Choose a category…</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Secondary category (optional)">
              <Select value={form.secondary_category_slug ?? ""} onChange={(v) => set({ secondary_category_slug: v })}>
                <option value="">None</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </Select>
            </Field>
          </Section>
        )}

        {step === 4 && (
          <Section title="Account & documents" subtitle="Your login email and the documents our team will verify.">
            <Field label="Business account email" required>
              <Input type="email" value={form.business_email} onChange={(e) => set({ business_email: e.target.value })} placeholder="business@example.com" />
            </Field>
            <p className="font-caption text-caption text-on-surface-variant">
              This becomes your Business Account login once approved. No account
              is created until an administrator verifies your business.
            </p>
            <div className="mt-2 flex flex-col gap-3">
              {DOC_SLOTS.map((slot) => (
                <FileRow
                  key={slot.docType}
                  slot={slot}
                  file={files[slot.docType] ?? null}
                  onPick={(file) => setFiles((f) => ({ ...f, [slot.docType]: file }))}
                />
              ))}
            </div>
          </Section>
        )}

        {step === 5 && (
          <Section title="Review & submit" subtitle="Confirm your details before submitting for verification.">
            <ReviewGrid form={form} files={files} />
          </Section>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-error-container px-4 py-2.5 font-body-md text-body-md text-on-error-container">
            {error}
          </p>
        )}
        {submitProgress && (
          <p role="status" className="mt-4 font-body-md text-body-md text-on-surface-variant">
            {submitProgress}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={back} disabled={submitting}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for verification"}
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
            <span
              className={cn(
                "font-label-md text-label-md",
                state === "current" ? "text-primary" : "text-on-surface-variant",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className="mx-1 hidden h-px w-6 bg-outline-variant sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function FileRow({
  slot,
  file,
  onPick,
}: {
  slot: DocSlot;
  file: File | null;
  onPick: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="font-label-md text-label-md text-on-surface">
          {slot.label}
          {slot.required && <span className="text-error"> *</span>}
        </p>
        {file && (
          <p className="truncate font-caption text-caption text-on-surface-variant">
            {file.name}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={slot.imagesOnly ? "image/png,image/jpeg,image/webp" : "image/png,image/jpeg,image/webp,application/pdf"}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <Button variant={file ? "subtle" : "outline"} size="sm" onClick={() => inputRef.current?.click()}>
        {file ? "Change" : "Upload"}
      </Button>
    </div>
  );
}

function ReviewGrid({ form, files }: { form: Form; files: Record<string, File | null> }) {
  const rows: [string, string][] = [
    ["Business", form.business_name],
    ["Type", form.business_type.replace(/_/g, " ")],
    ["Registration no.", form.registration_number || "—"],
    ["Owner", form.owner_full_name],
    ["Owner phone", form.owner_phone],
    ["Location", [form.town, form.county].filter(Boolean).join(", ") || "—"],
    ["Category", form.primary_category_slug || "—"],
    ["Account email", form.business_email],
  ];
  const docCount = DOC_SLOTS.filter((s) => files[s.docType]).length;
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">{k}</dt>
          <dd className="font-body-md text-body-md text-on-surface">{v}</dd>
        </div>
      ))}
      <div>
        <dt className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">Documents</dt>
        <dd className="font-body-md text-body-md text-on-surface">{docCount} attached</dd>
      </div>
    </dl>
  );
}

function Received({ applicationId }: { applicationId: string }) {
  return (
    <div className="mx-auto mt-4 flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center shadow-tonal">
      <span aria-hidden className="material-symbols-outlined text-[44px] text-primary">
        task_alt
      </span>
      <h1 className="font-headline-md text-headline-md text-primary">
        Application received
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Thank you. Our team will verify your business and documents. Once
        approved, we&apos;ll email an activation link to set up your Business
        Account.
      </p>
      <p className="font-caption text-caption text-on-surface-variant">
        Reference: <span className="font-mono">{applicationId}</span>
      </p>
      <Link href="/" className="font-label-md text-label-md text-primary underline-offset-2 hover:underline">
        Back to WapiKE
      </Link>
    </div>
  );
}

// --- small shared bits ------------------------------------------------------

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full rounded-lg border border-outline-variant bg-surface px-4 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
    >
      {children}
    </select>
  );
}
