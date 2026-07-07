"use client";

/*
 * TEMPORARY design-system preview.
 *
 * This route exists only to review the UI primitives in `components/ui`
 * against the Stitch design language. It is safe to delete — remove the
 * `src/app/design-preview` folder once the primitives are signed off.
 */

import * as React from "react";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardMedia,
  CardMeta,
  CardTitle,
  Checkbox,
  Input,
  RangeSlider,
  Select,
  Skeleton,
} from "@/components/ui";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-t border-outline-variant pt-10">
      <div className="flex flex-col gap-1">
        <h2 className="font-headline-md text-headline-md text-primary">
          {title}
        </h2>
        {description && (
          <p className="font-body-md text-body-md text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function DesignPreviewPage() {
  const [price, setPrice] = React.useState(60);

  return (
    <main className="min-h-screen bg-surface px-margin-mobile py-16 md:px-margin-desktop">
      <div className="mx-auto flex max-w-container-max flex-col gap-16">
        {/* Header */}
        <header className="flex flex-col gap-4">
          <Badge variant="accent" shape="pill" className="w-fit">
            Temporary · safe to delete
          </Badge>
          <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
            Wapike Design Preview
          </h1>
          <p className="max-w-2xl font-body-lg text-body-lg text-on-surface-variant">
            The restyled primitives in{" "}
            <code className="rounded bg-surface-container-highest px-1.5 py-0.5 font-mono text-[13px]">
              components/ui
            </code>
            , translated from the Stitch exports. Delete the{" "}
            <code className="rounded bg-surface-container-highest px-1.5 py-0.5 font-mono text-[13px]">
              design-preview
            </code>{" "}
            route once reviewed.
          </p>
        </header>

        {/* Buttons */}
        <Section
          title="Buttons"
          description="Pill-shaped, uppercase label type, restrained press motion."
        >
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">Browse Categories</Button>
            <Button variant="secondary">Ask AI Assistant</Button>
            <Button variant="outline">Details</Button>
            <Button variant="subtle">Rooftop</Button>
            <Button variant="ghost">Skip</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        {/* Badges */}
        <Section
          title="Badges"
          description="Category chips, ratings, and status tags."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="solid">Fine Dining</Badge>
            <Badge variant="accent">Featured</Badge>
            <Badge variant="subtle">Casual</Badge>
            <Badge variant="outline">New</Badge>
            <Badge variant="subtle" shape="chip" className="normal-case">
              <span className="text-secondary">★</span> 4.9
            </Badge>
          </div>
          <div className="relative flex h-32 w-full max-w-sm items-end overflow-hidden rounded-xl bg-primary p-4">
            <Badge variant="glass">Over imagery</Badge>
          </div>
        </Section>

        {/* Cards */}
        <Section
          title="Cards"
          description="The experience listing card: 4:5 media, title, meta, action."
        >
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "The Savannah Room",
                meta: "Fine Dining · Over KSh 8,000 · Nairobi",
              },
              {
                name: "Altitude Lounge",
                meta: "Rooftop · KSh 4,000–8,000 · Westlands",
              },
              {
                name: "Ocean Drift",
                meta: "Seafood · KSh 4,000–8,000 · Mombasa",
              },
            ].map((item) => (
              <Card key={item.name}>
                <CardMedia>
                  <div className="absolute inset-0 bg-gradient-to-tr from-surface-container-high to-surface-container" />
                  <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest/80 backdrop-blur-sm">
                    <span className="text-secondary">♥</span>
                  </div>
                  <Badge variant="glass" className="absolute bottom-4 left-4">
                    Curated
                  </Badge>
                </CardMedia>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle>{item.name}</CardTitle>
                    <Badge
                      variant="subtle"
                      shape="chip"
                      className="normal-case"
                    >
                      <span className="text-secondary">★</span> 4.9
                    </Badge>
                  </div>
                  <CardMeta>{item.meta}</CardMeta>
                  <Button variant="primary" size="sm" className="mt-2 w-full">
                    Book Now
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </Section>

        {/* Form controls */}
        <Section
          title="Form Controls"
          description="Inputs, selects, checkboxes — the building blocks for filters."
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <label className="font-label-md text-label-md uppercase text-on-surface-variant">
                Search
              </label>
              <Input placeholder="Search experiences…" />
            </div>
            <div className="flex flex-col gap-3">
              <label className="font-label-md text-label-md uppercase text-on-surface-variant">
                Dining style
              </label>
              <Select defaultValue="">
                <option value="" disabled>
                  Choose a style
                </option>
                <option value="fine">Fine dining</option>
                <option value="casual">Casual</option>
                <option value="rooftop">Rooftop</option>
                <option value="buffet">Buffet</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="font-label-md text-label-md uppercase text-on-surface-variant">
              Dietary preference
            </span>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Checkbox label="Vegetarian" defaultChecked />
              <Checkbox label="Vegan" />
              <Checkbox label="Halal" />
              <Checkbox label="Gluten-free" />
              <Checkbox label="Unavailable" disabled />
            </div>
          </div>

          <div className="max-w-md">
            <RangeSlider
              label="Max price"
              showValue
              min={0}
              max={100}
              value={price}
              formatValue={(v) => `KSh ${v.toLocaleString()}`}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
        </Section>

        {/* Skeletons */}
        <Section
          title="Skeletons"
          description="Loading placeholders mirroring the card layout."
        >
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-4">
                <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-11 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
