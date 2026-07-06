"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  usePreferenceProfile,
  useSavePreferenceProfile,
} from "@/lib/queries/personalization";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  { label: "Cafes", value: "cafes" },
  { label: "Restaurants", value: "restaurants" },
  { label: "Hiking", value: "hiking" },
  { label: "Nightlife", value: "nightlife" },
  { label: "Staycations", value: "staycations" },
  { label: "Culture", value: "cultural-experiences" },
  { label: "Family", value: "family-activities" },
  { label: "Outdoors", value: "outdoor-adventures" },
  { label: "Picnics", value: "picnics" },
  { label: "Road trips", value: "road-trips" },
];

const INTEREST_OPTIONS = [
  "coffee",
  "live music",
  "nature",
  "food",
  "art",
  "wellness",
  "romance",
  "adventure",
  "family friendly",
  "photography",
];

const VIBE_OPTIONS = [
  "quiet",
  "social",
  "luxury",
  "local",
  "scenic",
  "creative",
  "high energy",
  "relaxed",
];

const GROUP_OPTIONS = ["solo", "date", "friends", "family", "work"];
const PACE_OPTIONS = ["spontaneous", "planned", "weekends", "short trips"];
const LOCATION_OPTIONS = ["Nairobi", "Coast", "Rift Valley", "Central", "Anywhere"];
const BUDGET_OPTIONS = [
  { label: "$", value: 1 },
  { label: "$$", value: 2 },
  { label: "$$$", value: 3 },
  { label: "$$$$", value: 4 },
];

export function DiscoverVibeOnboarding() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.accountType);
  const enabled = isAuthenticated && accountType === "user";
  const profileQuery = usePreferenceProfile(enabled);
  const saveProfile = useSavePreferenceProfile();
  const [dismissed, setDismissed] = React.useState(false);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [interests, setInterests] = React.useState<string[]>([]);
  const [vibes, setVibes] = React.useState<string[]>([]);
  const [budgetTiers, setBudgetTiers] = React.useState<number[]>([]);
  const [group, setGroup] = React.useState<string[]>([]);
  const [pace, setPace] = React.useState<string[]>([]);
  const [locations, setLocations] = React.useState<string[]>([]);

  const open =
    enabled &&
    !dismissed &&
    profileQuery.isSuccess &&
    !profileQuery.data.completedOnboarding;

  const toggleString = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const toggleNumber = (value: number) => {
    setBudgetTiers((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const canSubmit =
    categories.length > 0 &&
    interests.length > 0 &&
    vibes.length > 0 &&
    budgetTiers.length > 0;

  const submit = () => {
    saveProfile.mutate(
      {
        categories,
        interests,
        vibes,
        budgetTiers,
        preferences: {
          group,
          pace,
          locations,
        },
      },
      {
        onSuccess: () => setDismissed(true),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={() => setDismissed(true)}
      title="Discover Your Vibe"
      className="max-h-[90vh] max-w-2xl overflow-y-auto"
    >
      <div className="flex flex-col gap-6">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Answer a few quick picks so wapiKE can start with recommendations that
          feel closer to your style.
        </p>

        <Question index={1} title="What do you want to explore first?">
          <ChipGrid
            options={CATEGORY_OPTIONS}
            values={categories}
            onToggle={(value) => toggleString(value, setCategories)}
          />
        </Question>

        <Question index={2} title="What usually catches your eye?">
          <ChipGrid
            options={INTEREST_OPTIONS.map((value) => ({ label: value, value }))}
            values={interests}
            onToggle={(value) => toggleString(value, setInterests)}
          />
        </Question>

        <Question index={3} title="Pick your ideal vibe.">
          <ChipGrid
            options={VIBE_OPTIONS.map((value) => ({ label: value, value }))}
            values={vibes}
            onToggle={(value) => toggleString(value, setVibes)}
          />
        </Question>

        <Question index={4} title="What budget range should we respect?">
          <ChipGrid
            options={BUDGET_OPTIONS.map((option) => ({
              label: option.label,
              value: String(option.value),
            }))}
            values={budgetTiers.map(String)}
            onToggle={(value) => toggleNumber(Number(value))}
          />
        </Question>

        <Question index={5} title="Who are you usually going with?">
          <ChipGrid
            options={GROUP_OPTIONS.map((value) => ({ label: value, value }))}
            values={group}
            onToggle={(value) => toggleString(value, setGroup)}
          />
        </Question>

        <Question index={6} title="How do you like to plan?">
          <ChipGrid
            options={PACE_OPTIONS.map((value) => ({ label: value, value }))}
            values={pace}
            onToggle={(value) => toggleString(value, setPace)}
          />
        </Question>

        <Question index={7} title="Where should we prioritize?">
          <ChipGrid
            options={LOCATION_OPTIONS.map((value) => ({ label: value, value }))}
            values={locations}
            onToggle={(value) => toggleString(value, setLocations)}
          />
        </Question>

        <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-lowest px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
          >
            Later
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit || saveProfile.isPending}
            onClick={submit}
          >
            {saveProfile.isPending ? "Saving..." : "Personalize wapiKE"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Question({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-container font-label-md text-label-md text-on-secondary-container">
          {index}
        </span>
        <h3 className="font-title-md text-title-md text-primary">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ChipGrid({
  options,
  values,
  onToggle,
}: {
  options: Array<{ label: string; value: string }>;
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(option.value)}
            className={cn(
              "transition-subtle rounded-full border px-3 py-2 font-label-md text-label-md",
              selected
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface-container-low text-on-surface hover:border-secondary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
