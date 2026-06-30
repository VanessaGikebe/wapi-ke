import Link from "next/link";

import { Brand } from "./brand";

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: string[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="font-label-md text-label-md uppercase tracking-wider text-primary">
        {heading}
      </h4>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link}>
            <Link
              href="#"
              className="transition-subtle rounded font-body-md text-body-md text-on-surface-variant hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest"
            >
              {link}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shared site footer: wordmark, copyright, and link columns. */
export function SiteFooter() {
  return (
    <footer className="border-t border-surface-variant bg-surface-container-lowest py-16">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-margin-mobile md:grid-cols-4 md:px-margin-desktop">
        <div className="md:col-span-2">
          <Brand
            logoClassName="h-10 w-10"
            wordmarkClassName="text-display-lg"
          />
          <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
            © 2024 wapiKE. All rights reserved.
          </p>
        </div>
        <FooterColumn
          heading="Social"
          links={["Instagram", "Twitter", "TikTok"]}
        />
        <FooterColumn
          heading="Company"
          links={["Privacy Policy", "Terms", "Newsletter"]}
        />
      </div>
    </footer>
  );
}
