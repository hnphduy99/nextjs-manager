import { RecentTransactions, TransactionsSkeleton } from "@/components/dashboard/recent-transactions";
import { StatsCards, StatsSkeleton } from "@/components/dashboard/stats-cards";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">System summary at a glance</p>
      </div>

      {/* Stat cards */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Recent transactions */}
      <Suspense fallback={<TransactionsSkeleton />}>
        <RecentTransactions />
      </Suspense>
    </div>
  );
}
