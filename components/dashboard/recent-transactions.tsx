import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import dayjs from "dayjs";

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

export async function RecentTransactions() {
  const recent = await getRecentTransactions();
  return (
    <Card className="px-4">
      <div className="border-b pb-3">
        <h2 className="font-semibold">Recent Transactions</h2>
      </div>
      <div className="divide-y">
        {recent.length === 0 ? (
          <p className="text-muted-foreground pb-3 text-center text-sm">No transactions yet.</p>
        ) : (
          recent.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between pb-3">
              <div>
                <p className="mb-1 text-sm font-medium">{tx.user.name ?? tx.user.email}</p>
                <p className="text-muted-foreground text-xs">
                  {tx.plan.name} · {dayjs(tx.createdAt).format("DD/MM/YYYY")}
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
    </Card>
  );
}

export function TransactionsSkeleton() {
  return (
    <Card className="px-4">
      <div className="border-b py-3">
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
