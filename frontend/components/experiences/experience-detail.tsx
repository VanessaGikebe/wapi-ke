"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { BookingModal } from "@/components/categories/booking-modal";
import { ExperienceCard } from "@/components/categories/experience-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  experienceAmenities,
  experienceContact,
  experienceReviews,
  experienceTags,
  priceFromKsh,
  priceLabel,
} from "@/lib/experience-presentation";
import { experienceGallery } from "@/lib/images";
import { useExperience, useExperiences } from "@/lib/queries/categories";
import { useToggleFavorite } from "@/lib/queries/favorites";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useFavoritesStore } from "@/lib/stores/favorites-store";
import { cn } from "@/lib/utils";

export function ExperienceDetail({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const experienceQuery = useExperience(id);
  const experience = experienceQuery.data;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const saved = useFavoritesStore((s) =>
    experience ? !!s.favorites[experience.id] : false,
  );
  const setPendingFavorite = useFavoritesStore((s) => s.setPendingFavorite);
  const toggleFavorite = useToggleFavorite();
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const [activeImage, setActiveImage] = React.useState(0);

  const relatedQuery = useExperiences(
    experience?.categorySlug ?? "",
    "",
    Boolean(experience),
  );
  const related = (relatedQuery.data?.items ?? [])
    .filter((e) => e.id !== id)
    .slice(0, 3);

  if (experienceQuery.isLoading) return <DetailSkeleton />;
  if (experienceQuery.isError || !experience) return <NotFound />;

  const gallery = experienceGallery(experience.categorySlug, experience.id);
  const tags = experienceTags(experience);
  const amenities = experienceAmenities(experience);
  const reviews = experienceReviews(experience);
  const contact = experienceContact(experience);
  const categoryLabel = experience.categorySlug.replace(/-/g, " ");

  const handleBook = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setBookingOpen(true);
  };

  const handleSave = () => {
    if (!isAuthenticated) {
      setPendingFavorite(experience.id);
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    toggleFavorite.mutate({ id: experience.id, favorite: !saved });
  };

  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-8 md:px-margin-desktop md:py-12">
      <Link
        href={`/categories/${experience.categorySlug}`}
        className="transition-subtle mb-6 inline-flex items-center gap-1 rounded font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <span aria-hidden>←</span> Back to {categoryLabel}
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="subtle" className="mb-3 capitalize">
            {categoryLabel}
          </Badge>
          <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary md:text-[40px] md:leading-[48px]">
            {experience.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 font-body-md text-body-md text-on-surface-variant">
            <span>{experience.location}</span>
            <span aria-hidden>•</span>
            <span className="inline-flex items-center gap-1">
              <StarIcon className="h-4 w-4 text-secondary" />
              {experience.rating.toFixed(1)}
            </span>
            <span aria-hidden>•</span>
            <span>{priceLabel(experience.priceTier)}</span>
          </p>
        </div>
      </div>

      {/* Gallery */}
      <div className="mb-10 flex flex-col gap-3">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-surface-container">
          <Image
            src={gallery[activeImage]}
            alt={`${experience.title} — photo ${activeImage + 1}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1280px"
            className="object-cover"
          />
        </div>
        {gallery.length > 1 && (
          <div className="flex gap-3">
            {gallery.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === activeImage}
                className={cn(
                  "transition-subtle relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:w-28",
                  index === activeImage
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="mb-3 font-headline-sm text-headline-sm text-primary">
              About
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {experience.description} A standout {categoryLabel} experience in{" "}
              {experience.location}, hand-picked for the Wapike community.
            </p>
            {tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="subtle" shape="chip">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {amenities.length > 0 && (
            <section>
              <h2 className="mb-3 font-headline-sm text-headline-sm text-primary">
                Amenities
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant"
                  >
                    <CheckIcon className="h-4 w-4 shrink-0 text-secondary" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-headline-sm text-headline-sm text-primary">
              Location
            </h2>
            <div className="overflow-hidden rounded-xl border border-outline-variant">
              <div
                aria-hidden
                className="relative flex h-40 items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-container"
              >
                <span className="material-symbols-outlined text-[40px] text-primary">
                  location_on
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 p-4">
                <p className="font-body-md text-body-md text-on-surface">
                  {experience.location}, Kenya
                </p>
                <a
                  href={contact.mapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  Open in Maps
                </a>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
              Reviews
            </h2>
            <ul className="flex flex-col gap-4">
              {reviews.map((review, index) => (
                <li
                  key={index}
                  className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-highest font-label-md text-label-md text-primary"
                      >
                        {review.name.charAt(0)}
                      </span>
                      <div>
                        <p className="font-label-md text-label-md text-primary">
                          {review.name}
                        </p>
                        <p className="font-caption text-caption text-on-surface-variant">
                          {review.date}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface">
                      <StarIcon className="h-3.5 w-3.5 text-secondary" />
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {review.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Booking / contact sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-tonal">
            <div>
              <p className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
                From
              </p>
              <p className="font-headline-md text-headline-md text-primary">
                KSh {priceFromKsh(experience.priceTier).toLocaleString()}
              </p>
            </div>

            <Button size="lg" className="w-full" onClick={handleBook}>
              Book Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              aria-pressed={saved}
              onClick={handleSave}
            >
              {saved ? "Saved ♥" : "Save to favorites"}
            </Button>

            <div className="border-t border-surface-variant pt-4">
              <p className="mb-2 font-label-md text-label-md uppercase text-on-surface-variant">
                Contact
              </p>
              <p className="font-body-md text-body-md text-on-surface">
                {contact.phone}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {contact.email}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-section-mobile md:mt-section">
          <h2 className="mb-6 font-headline-md text-headline-md text-primary">
            You might also like
          </h2>
          <ul className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <ExperienceCard experience={item} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <BookingModal
        experience={{
          id: experience.id,
          title: experience.title,
          location: experience.location,
          priceTier: experience.priceTier,
        }}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-12 md:px-margin-desktop">
      <Skeleton className="mb-6 h-5 w-40" />
      <Skeleton className="mb-3 h-10 w-2/3" />
      <Skeleton className="mb-8 h-5 w-1/3" />
      <Skeleton className="mb-10 aspect-[16/10] w-full rounded-2xl" />
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-container-max flex-col items-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
      <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary">
        Experience not found
      </h1>
      <p className="max-w-md font-body-lg text-body-lg text-on-surface-variant">
        This experience may have moved or no longer exists.
      </p>
      <Link
        href="/categories"
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Browse Categories
      </Link>
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1L12 2z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5 12.5l4 4 10-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
