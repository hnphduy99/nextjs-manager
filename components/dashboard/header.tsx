"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: { name?: string | null; email?: string | null };
}

export function DashboardHeader({ user }: HeaderProps) {
  return (
    <header className="bg-card flex h-16 items-center justify-between border-b px-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Welcome back, <span className="text-foreground font-medium">{user.name ?? user.email}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="size-4" />
        </Button>
        <ModeToggle />
      </div>
    </header>
  );
}
