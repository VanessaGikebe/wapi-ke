import { PortalShell, type NavItem } from "@/components/portal/portal-shell";

// Only the sections that are actually built. (Users, Listings, Reports, etc.
// were placeholder links to pages that don't exist yet — they 404'd — so
// they're omitted until their pages ship.)
const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
  { label: "Business Applications", href: "/admin/dashboard/applications", icon: "assignment" },
  { label: "Business Claims", href: "/admin/dashboard/claims", icon: "verified_user" },
  { label: "Businesses", href: "/admin/dashboard/businesses", icon: "storefront" },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalShell accountType="admin" portalName="Admin" nav={ADMIN_NAV}>
      {children}
    </PortalShell>
  );
}
