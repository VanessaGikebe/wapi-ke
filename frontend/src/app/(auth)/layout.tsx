import Link from "next/link";

import { Brand } from "@/components/site/brand";

/** Centered shell for the auth surfaces (login / signup). */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="mx-auto flex h-20 w-full max-w-container-max items-center px-margin-mobile md:px-margin-desktop">
        <Link href="/" aria-label="wapiKE home" className="rounded">
          <Brand
            logoClassName="h-8 w-8 md:h-9 md:w-9"
            wordmarkClassName="text-[26px] md:text-display-lg"
          />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-margin-mobile pb-16 pt-4 md:px-margin-desktop">
        {children}
      </main>
    </div>
  );
}
