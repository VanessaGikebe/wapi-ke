import { ClaimsTab } from "@/components/admin/claims-panel";
import { PortalPageHeader } from "@/components/portal/portal-shell";

export default function AdminClaimsPage() {
  return (
    <>
      <PortalPageHeader
        title="Business Claims"
        subtitle="Review ownership claims on existing catalog listings."
      />
      <ClaimsTab />
    </>
  );
}
