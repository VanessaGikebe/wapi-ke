"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { PreferenceProfileInput } from "@/lib/api/personalization";
import {
  usePreferenceProfile,
  useSavePreferenceProfile,
} from "@/lib/queries/personalization";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  icon: string;
}

const CATEGORY_OPTIONS: Option[] = [
  { value: "cafes", label: "Cafes", icon: "local_cafe" },
  { value: "restaurants", label: "Restaurants", icon: "restaurant" },
  { value: "hiking", label: "Hiking", icon: "hiking" },
  { value: "nightlife", label: "Nightlife", icon: "nightlife" },
  { value: "staycations", label: "Staycations", icon: "hotel" },
  { value: "cultural-experiences", label: "Culture", icon: "museum" },
  { value: "family-activities", label: "Family", icon: "family_restroom" },
  { value: "outdoor-adventures", label: "Outdoors", icon: "kayaking" },
  { value: "picnics", label: "Picnics", icon: "deck" },
  { value: "road-trips", label: "Road trips", icon: "directions_car" },
];

const INTEREST_OPTIONS: Option[] = [
  { value: "coffee", label: "Coffee", icon: "coffee" },
  { value: "live music", label: "Live music", icon: "music_note" },
  { value: "nature", label: "Nature", icon: "forest" },
  { value: "food", label: "Food", icon: "restaurant" },
  { value: "art", label: "Art", icon: "palette" },
  { value: "wellness", label: "Wellness", icon: "spa" },
  { value: "romance", label: "Romance", icon: "favorite" },
  { value: "adventure", label: "Adventure", icon: "explore" },
  { value: "family friendly", label: "Family", icon: "family_restroom" },
  { value: "photography", label: "Photography", icon: "photo_camera" },
];

const VIBE_OPTIONS: Option[] = [
  { value: "quiet", label: "Quiet", icon: "nightlight" },
  { value: "social", label: "Social", icon: "groups" },
  { value: "luxury", label: "Luxury", icon: "diamond" },
  { value: "local", label: "Local", icon: "location_on" },
  { value: "scenic", label: "Scenic", icon: "landscape" },
  { value: "creative", label: "Creative", icon: "brush" },
  { value: "high energy", label: "High energy", icon: "bolt" },
  { value: "relaxed", label: "Relaxed", icon: "self_improvement" },
];

// Sentinel tier meaning "no budget preference" — exclusive with the real tiers
// (1–4) and stripped out before saving, so it persists as an empty budget list.
const BUDGET_NO_PREFERENCE = 0;

const BUDGET_OPTIONS: Option[] = [
  { value: "1", label: "Under KSh 1,500", icon: "payments" },
  { value: "2", label: "KSh 1,500–4,000", icon: "payments" },
  { value: "3", label: "KSh 4,000–8,000", icon: "account_balance_wallet" },
  { value: "4", label: "Over KSh 8,000", icon: "diamond" },
  { value: String(BUDGET_NO_PREFERENCE), label: "No preference", icon: "done_all" },
];

export function DiscoverVibeOnboarding() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.accountType);
  const isUser = isAuthenticated && accountType === "user";

  const profileQuery = usePreferenceProfile(isUser);
  const saveProfile = useSavePreferenceProfile();

  // Client-only gate so the modal never renders during SSR — auth and profile
  // state only resolve on the client.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [dismissed, setDismissed] = React.useState(false);
  const [step, setStep] = React.useState(0);

  const [categories, setCategories] = React.useState<string[]>([]);
  const [interests, setInterests] = React.useState<string[]>([]);
  const [vibes, setVibes] = React.useState<string[]>([]);
  const [budgetTiers, setBudgetTiers] = React.useState<number[]>([]);

  // Show once, right after sign-in/sign-up, only if this account has not yet
  // completed onboarding. Signed-out visitors never see the wizard.
  const open =
    mounted &&
    !dismissed &&
    isUser &&
    profileQuery.isSuccess &&
    !profileQuery.data.completedOnboarding;

  const toggleString = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) =>
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );

  const toggleBudget = (value: string) =>
    setBudgetTiers((current) => {
      const tier = Number(value);
      // "No preference" is exclusive with the specific KES tiers.
      if (tier === BUDGET_NO_PREFERENCE) {
        return current.includes(BUDGET_NO_PREFERENCE) ? [] : [BUDGET_NO_PREFERENCE];
      }
      const withoutSentinel = current.filter(
        (item) => item !== BUDGET_NO_PREFERENCE,
      );
      return withoutSentinel.includes(tier)
        ? withoutSentinel.filter((item) => item !== tier)
        : [...withoutSentinel, tier];
    });

  const steps = [
    {
      title: "What do you want to explore first?",
      options: CATEGORY_OPTIONS,
      values: categories,
      toggle: (v: string) => toggleString(v, setCategories),
    },
    {
      title: "What usually catches your eye?",
      options: INTEREST_OPTIONS,
      values: interests,
      toggle: (v: string) => toggleString(v, setInterests),
    },
    {
      title: "Pick your ideal vibe.",
      options: VIBE_OPTIONS,
      values: vibes,
      toggle: (v: string) => toggleString(v, setVibes),
    },
    {
      title: "What budget range should we respect?",
      options: BUDGET_OPTIONS,
      values: budgetTiers.map(String),
      toggle: toggleBudget,
    },
  ];

  const current = steps[step];
  const canAdvance = current.values.length > 0;
  const isLast = step === steps.length - 1;
  const progress = Math.round(((step + 1) / steps.length) * 100);

  const submit = () => {
    const input: PreferenceProfileInput = {
      categories,
      interests,
      vibes,
      // Drop the "no preference" sentinel — it persists as an empty list.
      budgetTiers: budgetTiers.filter((tier) => tier !== BUDGET_NO_PREFERENCE),
      preferences: {},
    };
    // The wizard only opens for a signed-in user, so persist to the account
    // (the backend flag then gates future sessions) and close.
    saveProfile.mutate(input, {
      onSuccess: () => setDismissed(true),
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => setDismissed(true)}
      title="Discover Your Vibe"
      className="max-h-[90vh] max-w-lg overflow-y-auto"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
              Step {step + 1} of {steps.length}
            </span>
            <span className="font-caption text-caption text-on-surface-variant">
              {progress}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="transition-subtle h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="font-title-lg text-title-lg text-primary">
            {current.title}
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Tap any that apply — this takes about 15 seconds.
          </p>
        </div>

        <OptionCards
          options={current.options}
          values={current.values}
          onToggle={current.toggle}
        />

        <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-lowest px-6 py-4">
          {step > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
            >
              Later
            </Button>
          )}
          {isLast ? (
            <Button
              type="button"
              size="sm"
              disabled={!canAdvance || saveProfile.isPending}
              onClick={submit}
            >
              {saveProfile.isPending ? "Saving..." : "Personalize wapiKE"}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!canAdvance}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function OptionCards({
  options,
  values,
  onToggle,
}: {
  options: Option[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(option.value)}
            className={cn(
              "transition-subtle flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center",
              selected
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface-container-low text-on-surface hover:border-secondary",
            )}
          >
            <span aria-hidden className="material-symbols-outlined text-[24px]">
              {option.icon}
            </span>
            <span className="font-label-md text-label-md">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
