import { BusinessesPanel } from "@/components/admin/businesses-panel";
import { PortalPageHeader } from "@/components/portal/portal-shell";

export default function AdminBusinessesPage() {
  return (
    <>
      <PortalPageHeader
        title="Businesses"
        subtitle="Every verified business on WapiKE. View, suspend, archive, or reopen."
      />
      <BusinessesPanel />
    </>
  );
}
