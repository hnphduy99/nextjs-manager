import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { Key, Monitor, Receipt, Users } from "lucide-react";

async function getStats() {
  const [users, licenses, transactions, activeSessions] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.license.count({ where: { status: "ACTIVE" } }),
    db.transaction.count({ where: { status: "PENDING" } }),
    db.deviceSession.count({ where: { isActive: true } })
  ]);
  return { users, licenses, transactions, activeSessions };
}

export async function StatsCards() {
  const stats = await getStats();

  const statCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-500" },
    { label: "Active Licenses", value: stats.licenses, icon: Key, color: "text-green-500" },
    { label: "Pending Payments", value: stats.transactions, icon: Receipt, color: "text-yellow-500" },
    { label: "Online Devices", value: stats.activeSessions, icon: Monitor, color: "text-emerald-500" }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">{label}</p>
            <Icon className={`size-5 ${color}`} />
          </div>
          <p className="mt-2 text-3xl font-bold">{value.toLocaleString()}</p>
        </Card>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-5 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-9 w-20" />
        </Card>
      ))}
    </div>
  );
}
