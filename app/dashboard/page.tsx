import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Users, Key, Receipt, Monitor } from "lucide-react";

async function getStats() {
  const [users, licenses, transactions, activeSessions] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.license.count({ where: { status: "ACTIVE" } }),
    db.transaction.count({ where: { status: "PENDING" } }),
    db.deviceSession.count({ where: { isActive: true } })
  ]);
  return { users, licenses, transactions, activeSessions };
}

async function getRecentTransactions() {
  return db.transaction.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, name: true } }, plan: { select: { name: true } } }
  });
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REFUNDED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const [stats, recent] = await Promise.all([getStats(), getRecentTransactions()]);

  const statCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-500" },
    { label: "Active Licenses", value: stats.licenses, icon: Key, color: "text-green-500" },
    { label: "Pending Payments", value: stats.transactions, icon: Receipt, color: "text-yellow-500" },
    { label: "Online Devices", value: stats.activeSessions, icon: Monitor, color: "text-emerald-500" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">System summary at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card rounded-xl border p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">{label}</p>
              <Icon className={`size-5 ${color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Recent transactions */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Recent Transactions</h2>
        </div>
        <div className="divide-y">
          {recent.length === 0 ? (
            <p className="text-muted-foreground px-5 py-8 text-center text-sm">No transactions yet.</p>
          ) : (
            recent.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{tx.user.name ?? tx.user.email}</p>
                  <p className="text-muted-foreground text-xs">
                    {tx.plan.name} · {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {Number(tx.amount).toLocaleString()} {tx.currency}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[tx.status] ?? ""}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
