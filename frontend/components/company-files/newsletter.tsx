import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function NewsletterContent() {
  return (
    <>
      <Badge variant="glass" className="mb-6">
        Stay Connected
      </Badge>
      <h1 className="mb-3 font-display-lg-mobile text-display-lg-mobile text-primary md:font-display-lg md:text-display-lg">
        Join Our Newsletter
      </h1>
      <p className="mb-10 font-body-lg text-body-lg text-on-surface-variant">
        Get curated recommendations, exclusive deals, and insider tips delivered
        straight to your inbox. Discover Kenya&apos;s best experiences before anyone
        else.
      </p>

      <div className="mb-12 rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 md:p-10">
        <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">
          Subscribe Now
        </h2>
        <p className="mb-6 font-body-md text-body-md text-on-surface-variant">
          Enter your email address to receive our weekly newsletter featuring top
          experiences, upcoming events, and special offers.
        </p>
        <form className="flex flex-col gap-4 sm:flex-row">
          <input
            type="email"
            placeholder="your@email.com"
            required
            className="flex-1 rounded-full border border-outline-variant bg-surface px-5 py-3 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          />
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Subscribe
          </Button>
        </form>
        <p className="mt-4 font-caption text-caption text-on-surface-variant">
          By subscribing, you agree to receive marketing emails from Wapike. You can
          unsubscribe at any time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6 text-primary"
              aria-hidden
            >
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-headline-sm text-headline-sm text-primary">
            Curated Experiences
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Hand-picked recommendations for restaurants, hikes, staycations, and hidden
            gems across Kenya.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6 text-primary"
              aria-hidden
            >
              <path
                d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-headline-sm text-headline-sm text-primary">
            Exclusive Offers
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Be the first to know about special promotions, discounts, and limited-time
            deals from our partners.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6 text-primary"
              aria-hidden
            >
              <path
                d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-headline-sm text-headline-sm text-primary">
            Upcoming Events
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Stay informed about concerts, festivals, food markets, and other exciting
            events happening near you.
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6 text-primary"
              aria-hidden
            >
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h3 className="mb-2 font-headline-sm text-headline-sm text-primary">
            Insider Tips
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Local insights and travel tips from our community of explorers and
            experience creators.
          </p>
        </div>
      </div>
    </>
  );
}