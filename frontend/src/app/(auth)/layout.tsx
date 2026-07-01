import Link from "next/link";

import { BackLink } from "@/components/site/back-link";
import { Brand } from "@/components/site/brand";

/** Centered shell for the auth surfaces (login / signup). */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Warm "savannah dawn" gradient backdrop so the auth card floats on
          colour rather than plain white (kept light for readable text). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(55rem 42rem at 4% -10%, rgba(139,80,10,0.28), transparent 60%)," +
            "radial-gradient(48rem 40rem at 104% 8%, rgba(11,59,42,0.22), transparent 58%)," +
            "radial-gradient(55rem 45rem at 96% 112%, rgba(5,13,8,0.24), transparent 58%)," +
            "linear-gradient(155deg, #f4e8d6 0%, #eef0fb 50%, #e3e7f7 100%)",
        }}
      />

      <header className="mx-auto flex h-20 w-full max-w-container-max items-center justify-between gap-4 px-margin-mobile md:px-margin-desktop">
        <Link href="/" aria-label="wapiKE home" className="rounded">
          <Brand wordmarkClassName="text-[26px] md:text-display-lg" />
        </Link>
        <BackLink href="/" label="Back to Home" />
      </header>
      <main className="flex flex-1 items-center justify-center px-margin-mobile pb-16 pt-4 md:px-margin-desktop">
        {children}
      </main>
    </div>
  );
}
