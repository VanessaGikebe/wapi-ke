"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestAdminMagicLink } from "@/lib/api/portals";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  };

  const sendMagic = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestAdminMagicLink(email);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-margin-mobile py-12">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-tonal-lg">
        <Brand wordmarkClassName="mb-6 text-[26px]" />
        <p className="mb-2 font-label-md text-label-md uppercase text-secondary">Administrator</p>
        <h1 className="font-headline-md text-headline-md text-primary">Admin sign in</h1>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          Administrator accounts are invitation-only.
        </p>
        <div className="mt-6 grid gap-4">
          <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          {error && <p className="rounded-lg bg-error-container px-4 py-3 text-on-error-container">{error}</p>}
          {message && <p className="rounded-lg bg-secondary-container px-4 py-3 text-on-secondary-container">{message}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          <Button type="button" variant="outline" disabled={loading || !email} onClick={sendMagic}>Email admin link</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-2 font-label-md text-label-md uppercase text-on-surface-variant">{label}{children}</label>;
}
