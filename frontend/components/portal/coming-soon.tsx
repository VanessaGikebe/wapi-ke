import { PortalPageHeader } from "@/components/portal/portal-shell";

/** Placeholder for a portal section that is scaffolded but not yet built. */
export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <>
      <PortalPageHeader title={title} subtitle={description} />
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant px-6 py-20 text-center">
        <span aria-hidden className="material-symbols-outlined text-[40px] text-on-surface-variant">
          construction
        </span>
        <p className="font-body-lg text-body-lg text-on-surface">Coming soon</p>
        <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
          This section is part of the portal structure and will be enabled in a
          later release.
        </p>
      </div>
    </>
  );
}
