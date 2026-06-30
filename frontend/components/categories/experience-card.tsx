"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardMedia,
  CardMeta,
  CardTitle,
} from "@/components/ui/card";
import { experienceCover } from "@/lib/images";
import { experienceTags, priceLabel } from "@/lib/experience-presentation";
import { useToggleFavorite } from "@/lib/queries/favorites";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useFavoritesStore } from "@/lib/stores/favorites-store";
import { cn } from "@/lib/utils";
import type { Experience } from "@/lib/types";

/**
 * Experience card — photo-led, premium. The cover and title link to the
 * experience detail page; the heart saves (auth-gated). Booking lives on the
 * detail page now.
 */
export function ExperienceCard({ experience }: { experience: Experience }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const saved = useFavoritesStore((state) => !!state.favorites[experience.id]);
  const setPendingFavorite = useFavoritesStore(
    (state) => state.setPendingFavorite,
  );
  const toggleFavorite = useToggleFavorite();

  const href = `/experiences/${experience.id}`;
  const cover = experienceCover(experience.categorySlug, experience.id);
  const tags = experienceTags(experience).slice(0, 3);

  const handleFavorite = () => {
    if (!isAuthenticated) {
      setPendingFavorite(experience.id);
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    toggleFavorite.mutate({ id: experience.id, favorite: !saved });
  };

  return (
    <Card className="h-full">
      <CardMedia>
        <Link
          href={href}
          aria-label={`View ${experience.title}`}
          className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
        >
          <Image
            src={cover}
            alt={experience.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-primary/50 via-transparent to-transparent"
          />
        </Link>

        <Badge
          variant="glass"
          shape="chip"
          className="absolute left-4 top-4 z-10 normal-case"
        >
          <StarIcon className="h-3.5 w-3.5 text-secondary-fixed-dim" />
          {experience.rating.toFixed(1)}
        </Badge>

        <button
          type="button"
          onClick={handleFavorite}
          aria-pressed={saved}
          aria-label={
            saved
              ? `Remove ${experience.title} from saved`
              : `Save ${experience.title}`
          }
          className={cn(
            "transition-subtle absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest/85 backdrop-blur-sm hover:bg-surface-container-lowest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            saved ? "text-secondary" : "text-primary",
          )}
        >
          <HeartIcon className="h-5 w-5" filled={saved} />
        </button>
      </CardMedia>

      <CardBody className="flex-1">
        <Link
          href={href}
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
        >
          <CardTitle className="line-clamp-1">{experience.title}</CardTitle>
        </Link>

        <CardMeta>
          <span className="normal-case tracking-normal">
            {experience.location}
          </span>
          <span aria-hidden>•</span>
          <span>{priceLabel(experience.priceTier)}</span>
        </CardMeta>

        {experience.description && (
          <p className="line-clamp-2 font-body-md text-body-md text-on-surface-variant">
            {experience.description}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="subtle" shape="chip">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Link
          href={href}
          className={cn(buttonVariants({ size: "sm" }), "mt-auto w-full")}
        >
          View Details
        </Link>
      </CardBody>
    </Card>
  );
}

function HeartIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 5.5 5.5c1.9 0 3.2 1.1 3.9 2.2.7-1.1 2-2.2 3.9-2.2 3 0 4.5 3 3 6C19 15.65 12 20 12 20z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
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
