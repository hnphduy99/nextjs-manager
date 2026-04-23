"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
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

  const visibleItems = NAV_ITEMS.filter(
    ({ adminOnly }) => !adminOnly || user.roles.some((r) => ["admin", "superadmin"].includes(r))
  );

  return (
    <Sidebar collapsible="icon">
      {/* Brand */}
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
            AM
          </div>
          <span className="truncate font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Auto Manager
          </span>
        </div>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={label}
                      className="relative z-10 h-10 cursor-pointer gap-3 text-sm font-medium transition-colors"
                    >
                      <Link
                        href={href}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 rounded-md px-2 py-1 group-data-[collapsible=icon]:hidden">
              <div className="min-w-0 flex-1">
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
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
