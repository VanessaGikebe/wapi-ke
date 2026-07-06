import { PortalShell, type NavItem } from "@/components/portal/portal-shell";

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
  { label: "Business Applications", href: "/admin/dashboard/applications", icon: "assignment" },
  { label: "Business Claims", href: "/admin/dashboard/claims", icon: "verified_user" },
  { label: "Businesses", href: "/admin/dashboard/businesses", icon: "storefront" },
  { label: "Users", href: "/admin/dashboard/users", icon: "group" },
  { label: "Listings", href: "/admin/dashboard/listings", icon: "list_alt" },
  { label: "Reports", href: "/admin/dashboard/reports", icon: "flag" },
  { label: "Reviews", href: "/admin/dashboard/reviews", icon: "reviews" },
  { label: "Categories", href: "/admin/dashboard/categories", icon: "category" },
  { label: "Audit Logs", href: "/admin/dashboard/audit", icon: "history" },
  { label: "Administrators", href: "/admin/dashboard/administrators", icon: "shield_person" },
  { label: "Settings", href: "/admin/dashboard/settings", icon: "settings" },
  { label: "Analytics", href: "/admin/dashboard/analytics", icon: "analytics" },
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
