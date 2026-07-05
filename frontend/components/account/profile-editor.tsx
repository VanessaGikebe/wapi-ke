"use client";

import * as React from "react";

import { PasswordStrength } from "@/components/auth/password-strength";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { assessPassword } from "@/lib/password";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const COUNTIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Kiambu",
  "Narok",
  "Lamu",
  "Kilifi",
  "Kwale",
];

type Banner = { kind: "success" | "error"; text: string } | null;

export function ProfileEditor() {
  const user = useAuthStore((s) => s.user);
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const supabase = React.useMemo(() => createClient(), []);

  const [fullName, setFullName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [homeCounty, setHomeCounty] = React.useState("");
  const [emailNotifications, setEmailNotifications] = React.useState(true);

  const [loading, setLoading] = React.useState(true);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingPrefs, setSavingPrefs] = React.useState(false);
  const [profileBanner, setProfileBanner] = React.useState<Banner>(null);
  const [prefsBanner, setPrefsBanner] = React.useState<Banner>(null);

  // Load profile + preferences.
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: prefs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_preferences")
          .select("home_county, email_notifications")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setFullName(profile?.full_name ?? user.name ?? "");
      setUsername(profile?.username ?? "");
      setAvatarUrl(profile?.avatar_url ?? user.avatarUrl ?? "");
      setHomeCounty(prefs?.home_county ?? "");
      setEmailNotifications(prefs?.email_notifications ?? true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileBanner(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        username: username.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", user.id);
    // Keep the auth-session metadata in sync so the header updates too.
    if (!error) {
      await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), avatar_url: avatarUrl.trim() },
      });
    }
    setSavingProfile(false);
    setProfileBanner(
      error
        ? {
            kind: "error",
            text: error.message.includes("duplicate")
              ? "That username is already taken."
              : error.message,
          }
        : { kind: "success", text: "Profile updated." },
    );
  };

  const savePreferences = async () => {
    if (!user) return;
    setSavingPrefs(true);
    setPrefsBanner(null);
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      home_county: homeCounty || null,
      email_notifications: emailNotifications,
    });
    setSavingPrefs(false);
    setPrefsBanner(
      error
        ? { kind: "error", text: error.message }
        : { kind: "success", text: "Preferences saved." },
    );
  };

  if (!user || loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-surface-container" />;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {/* Profile */}
      <form
        onSubmit={saveProfile}
        className="flex flex-col gap-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <div className="flex items-center gap-4">
          <Avatar url={avatarUrl} name={fullName || user.name} />
          <div>
            <h2 className="font-headline-sm text-headline-sm text-primary">
              {fullName || user.name}
            </h2>
            <Badge variant="subtle" className="mt-1">
              {user.email}
            </Badge>
          </div>
        </div>

        <FieldRow label="Full name" htmlFor="full_name">
          <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
        </FieldRow>
        <FieldRow label="Username" htmlFor="username">
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
        </FieldRow>
        <FieldRow label="Avatar URL" htmlFor="avatar">
          <Input id="avatar" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…/photo.jpg" />
        </FieldRow>

        <BannerLine banner={profileBanner} />
        <div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>

      {/* Password */}
      <PasswordCard updatePassword={updatePassword} />

      {/* Preferences */}
      <div className="flex flex-col gap-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="font-headline-sm text-headline-sm text-primary">Preferences</h2>
        <FieldRow label="Home county" htmlFor="home_county">
          <select
            id="home_county"
            value={homeCounty}
            onChange={(e) => setHomeCounty(e.target.value)}
            className="h-12 w-full rounded-lg border border-outline-variant bg-surface px-4 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="">No preference</option>
            {COUNTIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FieldRow>
        <div className="flex items-center justify-between gap-4">
          <span className="font-body-md text-body-md text-on-surface">
            Email notifications
          </span>
          <Switch
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
            aria-label="Email notifications"
          />
        </div>
        <BannerLine banner={prefsBanner} />
        <div>
          <Button variant="outline" onClick={savePreferences} disabled={savingPrefs}>
            {savingPrefs ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PasswordCard({
  updatePassword,
}: {
  updatePassword: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [banner, setBanner] = React.useState<Banner>(null);
  const assessment = assessPassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBanner(null);
    if (!assessment.valid || password !== confirm) {
      setBanner({ kind: "error", text: "Check the password requirements." });
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      setBanner({ kind: "success", text: "Password updated." });
      setPassword("");
      setConfirm("");
    } catch (err) {
      setBanner({ kind: "error", text: err instanceof Error ? err.message : "Failed." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
    >
      <h2 className="font-headline-sm text-headline-sm text-primary">Change password</h2>
      <FieldRow label="New password" htmlFor="new_password">
        <Input id="new_password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </FieldRow>
      {password.length > 0 && <PasswordStrength password={password} />}
      <FieldRow label="Confirm password" htmlFor="confirm_password">
        <Input id="confirm_password" type="password" autoComplete="new-password" aria-invalid={mismatch} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
      </FieldRow>
      {mismatch && <p className="font-caption text-caption text-error">Passwords don&apos;t match.</p>}
      <BannerLine banner={banner} />
      <div>
        <Button type="submit" disabled={saving || !assessment.valid || mismatch}>
          {saving ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}

function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  );
}

function Avatar({ url, name }: { url: string; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className="h-16 w-16 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-16 w-16 items-center justify-center rounded-full bg-primary font-headline-sm text-headline-sm text-on-primary"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function BannerLine({ banner }: { banner: Banner }) {
  if (!banner) return null;
  return (
    <p
      role={banner.kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-4 py-2.5 font-body-md text-body-md",
        banner.kind === "error"
          ? "bg-error-container text-on-error-container"
          : "bg-secondary-container text-on-secondary-container",
      )}
    >
      {banner.text}
    </p>
  );
}
