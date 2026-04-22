import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LicenseActionsMenu } from "@/components/dashboard/license-actions-menu";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  EXPIRED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  REVOKED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  SUSPENDED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
};

export default async function LicensesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  assertPermission(session, "license", "read");

  const { page: rawPage, status } = await searchParams;
  const page = Math.max(1, Number(rawPage ?? 1));
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = status ? { status: status as never } : {};

  const [licenses, total] = await Promise.all([
    db.license.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        plan: { select: { name: true } },
        _count: { select: { deviceSessions: true } }
      }
    }),
    db.license.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);
  const statuses = ["PENDING", "ACTIVE", "EXPIRED", "REVOKED", "SUSPENDED"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Licenses</h1>
          <p className="text-muted-foreground text-sm">{total} total licenses</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/licenses"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!status ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/dashboard/licenses?status=${s}`}
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
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Devices</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {licenses.map((lic) => (
              <tr key={lic.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <code className="bg-muted rounded px-1 py-0.5 text-xs">{lic.key}</code>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{lic.user.name ?? "—"}</p>
                  <p className="text-muted-foreground text-xs">{lic.user.email}</p>
                </td>
                <td className="px-4 py-3">{lic.plan.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lic.status] ?? ""}`}>
                    {lic.status}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : "Lifetime"}
                </td>
                <td className="px-4 py-3">{lic._count.deviceSessions}</td>
                <td className="px-4 py-3">
                  <LicenseActionsMenu licenseId={lic.id} status={lic.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {licenses.length === 0 && (
          <p className="text-muted-foreground px-4 py-8 text-center text-sm">No licenses found.</p>
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
                href={`/dashboard/licenses?page=${page - 1}${status ? `&status=${status}` : ""}`}
                className="hover:bg-accent rounded-md border px-3 py-1"
              >
                Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/licenses?page=${page + 1}${status ? `&status=${status}` : ""}`}
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
