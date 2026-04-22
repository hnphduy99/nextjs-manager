"use client";

import { cn } from "@/lib/utils";
import {
  BarChart3,
  Key,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/licenses", label: "Licenses", icon: Key },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/roles", label: "Roles & Perms", icon: ShieldCheck, adminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

interface SidebarProps {
  user: { name?: string | null; email?: string | null; roles: string[] };
}

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="bg-card flex h-screen w-60 flex-col border-r">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg text-sm font-bold">
          AM
        </div>
        <span className="font-semibold tracking-tight">Auto Manager</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {NAV_ITEMS.filter(
          ({ adminOnly }) => !adminOnly || user.roles.some((r) => ["admin", "superadmin"].includes(r))
        ).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t p-3">
        <div className="mb-2 rounded-md px-3 py-2">
          <p className="truncate text-sm font-medium">{user.name ?? "User"}</p>
          <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <span
                key={r}
                className="bg-primary/10 text-primary inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
