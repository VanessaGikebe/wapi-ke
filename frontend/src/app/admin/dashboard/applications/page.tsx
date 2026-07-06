import { ApplicationsTab } from "@/components/admin/applications-panel";
import { PortalPageHeader } from "@/components/portal/portal-shell";

export default function AdminApplicationsPage() {
  return (
    <>
      <PortalPageHeader
        title="Business Applications"
        subtitle="Review, verify, and approve new business applications (pending)."
      />
      <ApplicationsTab />
    </>
  );
}
