import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TransactionActionsMenu } from "@/components/dashboard/transaction-actions-menu";
import { CreateTransactionModal } from "@/components/dashboard/create-transaction-modal";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REFUNDED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
};

export default async function TransactionsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  assertPermission(session, "transaction", "read");

  const { page: rawPage, status } = await searchParams;
  const page = Math.max(1, Number(rawPage ?? 1));
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = status ? { status: status as never } : {};

  const [transactions, total, plans, users] = await Promise.all([
    db.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        plan: { select: { name: true } },
        license: { select: { key: true } }
      }
    }),
    db.transaction.count({ where }),
    db.licensePlan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, currency: true }
    }),
    db.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" }
    })
  ]);

  const totalPages = Math.ceil(total / limit);
  const statuses = ["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm">{total} total transactions</p>
        </div>
        <CreateTransactionModal
          plans={plans.map((p) => ({ ...p, price: Number(p.price) }))}
          users={users.map((u) => ({ ...u, name: u.name }))}
        />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/transactions"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!status ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/dashboard/transactions?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${status === s ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">License Key</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{tx.user.name ?? "—"}</p>
                  <p className="text-muted-foreground text-xs">{tx.user.email}</p>
                </td>
                <td className="px-4 py-3">{tx.plan.name}</td>
                <td className="px-4 py-3 font-medium">
                  {Number(tx.amount).toLocaleString()} {tx.currency}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-xs">{tx.paymentMethod.replace("_", " ")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[tx.status] ?? ""}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {tx.license ? (
                    <code className="bg-muted rounded px-1 py-0.5 text-xs">{tx.license.key}</code>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <TransactionActionsMenu transactionId={tx.id} status={tx.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">No transactions found.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <p>
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/transactions?page=${page - 1}${status ? `&status=${status}` : ""}`}
                className="hover:bg-accent rounded-md border px-3 py-1"
              >
                Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/transactions?page=${page + 1}${status ? `&status=${status}` : ""}`}
                className="hover:bg-accent rounded-md border px-3 py-1"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
