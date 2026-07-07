import Image from "next/image";
import Link from "next/link";

import { CategoriesCarousel } from "@/components/categories/categories-carousel";
import { PersonalizedHome } from "@/components/marketing/personalized-home";
import { Testimonials } from "@/components/marketing/testimonials";
import { UpcomingEvents } from "@/components/marketing/upcoming-events";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { HERO_IMAGE } from "@/lib/images";
import { cn } from "@/lib/utils";

/*
 * Landing page. One clear flow toward the two discovery paths:
 *   Hero → Explore Categories → AI Assistant → Upcoming Events →
 *   Testimonials → Footer.
 */

function Hero() {
  return (
    <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden md:min-h-[86vh]">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/45 to-surface"
      />

      <div className="relative z-10 mx-auto w-full max-w-container-max px-margin-mobile py-24 text-center md:px-margin-desktop">
        <Badge variant="glass" className="mb-6">
          Discover Kenya
        </Badge>
        <h1 className="mx-auto mb-6 max-w-4xl font-display-lg-mobile text-display-lg-mobile text-on-primary drop-shadow-lg md:font-display-lg md:text-display-lg">
          Discover Your Next Unforgettable Kenyan Experience.
        </h1>
        <p className="mx-auto mb-10 max-w-2xl font-body-lg text-body-lg text-on-primary/90 drop-shadow-md">
          Restaurants, hikes, staycations, hidden gems and more — all in one
          place. Browse by category, or let our AI assistant guide you.
        </p>

        <div className="flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
          <Link
            href="/categories"
            className={cn(
              buttonVariants({ variant: "primary", size: "lg" }),
              "w-full sm:w-auto",
            )}
          >
            Browse Categories
          </Link>
          <Link
            href="/assistant"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "w-full sm:w-auto",
            )}
          >
            <SparkleIcon className="h-5 w-5" />
            Ask the AI Assistant
          </Link>
        </div>
      </div>
    </section>
  );
}

function ExploreCategories() {
  return (
    <section
      id="categories"
      className="bg-surface pt-section-mobile md:pt-section"
    >
      <div className="mx-auto mb-8 flex max-w-container-max flex-wrap items-end justify-between gap-4 px-margin-mobile md:mb-10 md:px-margin-desktop">
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">
            Explore Categories
          </h2>
          <p className="mt-2 max-w-xl font-body-md text-body-md text-on-surface-variant">
            Pick a vibe and dive into curated experiences across the country.
          </p>
        </div>
        <Link
          href="/categories"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "shrink-0",
          )}
        >
          View All Categories
        </Link>
      </div>

      {/* Full-bleed carousel; cards stay clear of the page gutter via padding. */}
      <div className="px-margin-mobile md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <CategoriesCarousel />
        </div>
      </div>
    </section>
  );
}

function AssistantSection() {
  return (
    <section
      id="ai-assistant"
      className="px-margin-mobile py-section-mobile md:px-margin-desktop md:py-section"
    >
      <div className="mx-auto flex max-w-container-max flex-col items-center gap-6 overflow-hidden rounded-2xl bg-primary px-6 py-14 text-center md:px-16 md:py-20">
        <Badge variant="accent">AI Assistant</Badge>
        <h2 className="mx-auto max-w-2xl font-headline-md text-headline-md text-on-primary">
          Not sure where to start? Just ask.
        </h2>
        <p className="mx-auto max-w-xl font-body-lg text-body-lg text-on-primary/80">
          &ldquo;Somewhere romantic under 5,000.&rdquo; &ldquo;An easy hike near
          Nairobi.&rdquo; &ldquo;A hidden café.&rdquo; Tell us what you&apos;re
          after and we&apos;ll find it.
        </p>
        <Link
          href="/assistant"
          className={cn(
            buttonVariants({ variant: "secondary", size: "lg" }),
            "w-full sm:w-auto",
          )}
        >
          <SparkleIcon className="h-5 w-5" />
          Ask the AI Assistant
        </Link>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="bg-surface px-margin-mobile pb-section-mobile md:px-margin-desktop md:pb-section">
      <div className="mx-auto max-w-container-max">
        <h2 className="mb-8 text-center font-headline-md text-headline-md text-primary md:mb-10">
          Loved by explorers
        </h2>
        <Testimonials />
      </div>
    </section>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 3l1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8L12 3z"
        fill="currentColor"
      />
      <path
        d="M19 14l.8 2.2 2.2.8-2.2.8L19 20l-.8-2.2-2.2-.8 2.2-.8L19 14z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <PersonalizedHome />
        <ExploreCategories />
        <AssistantSection />
        <UpcomingEvents />
        <TestimonialsSection />
      </main>
      <SiteFooter />
    </div>
  );
}
