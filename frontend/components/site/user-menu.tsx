"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/stores/auth-store";

import { Dropdown } from "./dropdown";

const MENU_LINKS = [
  { label: "My Profile", href: "/account?tab=profile", icon: "person" },
  { label: "Saved Places", href: "/account?tab=saved", icon: "favorite" },
  { label: "My Bookings", href: "/account?tab=bookings", icon: "event" },
  { label: "Settings", href: "/account?tab=settings", icon: "settings" },
  { label: "Help", href: "/help", icon: "help" },
];

const itemClass =
  "flex items-center gap-3 px-4 py-2.5 font-body-md text-body-md text-on-surface transition-subtle hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none";

export function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accountType = useAuthStore((s) => s.accountType);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;
  const firstName = user.name.split(" ")[0];

  const roleLinks = [
    accountType === "admin"
      ? { label: "Admin Dashboard", href: "/admin", icon: "shield_person" }
      : null,
    accountType === "business"
      ? {
          label: "Business Dashboard",
          href: "/business/dashboard",
          icon: "storefront",
        }
      : null,
  ].filter(Boolean) as { label: string; href: string; icon: string }[];
  const links = [...roleLinks, ...MENU_LINKS];

  return (
    <Dropdown
      label="Account menu"
      triggerClassName="gap-2 py-1 pl-1 pr-2 hover:bg-surface-container-high"
      trigger={
        <>
          <Avatar name={user.name} url={user.avatarUrl} />
          <span className="hidden font-label-md text-label-md text-primary sm:inline">
            {firstName}
          </span>
          <span
            aria-hidden
            className="material-symbols-outlined text-[18px] text-on-surface-variant"
          >
            expand_more
          </span>
        </>
      }
    >
      {(close) => (
        <div>
          <div className="flex items-center gap-3 border-b border-surface-variant px-4 py-4">
            <Avatar name={user.name} url={user.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate font-label-md text-label-md text-primary">
                {user.name}
              </p>
              <p className="truncate font-caption text-caption text-on-surface-variant">
                {user.email}
              </p>
            </div>
          </div>

          <nav className="py-1">
            {links.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={close}
                className={itemClass}
              >
                <span
                  aria-hidden
                  className="material-symbols-outlined text-[20px] text-on-surface-variant"
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-surface-variant py-1">
            <button
              type="button"
              onClick={() => {
                close();
                void logout();
                router.push("/");
              }}
              className={`w-full ${itemClass}`}
            >
              <span
                aria-hidden
                className="material-symbols-outlined text-[20px] text-on-surface-variant"
              >
                logout
              </span>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-label-md text-label-md text-on-primary"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
