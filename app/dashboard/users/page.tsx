import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserActionsMenu } from "@/components/dashboard/user-actions-menu";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  assertPermission(session, "user", "read");

  const { page: rawPage, q } = await searchParams;
  const page = Math.max(1, Number(rawPage ?? 1));
  const limit = 20;
  const skip = (page - 1) * limit;
  const search = q ?? "";

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } }
        ]
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        deletedAt: true,
        roles: { select: { role: { select: { name: true } } } },
        _count: { select: { licenses: true } }
      }
    }),
    db.user.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm">{total} total users</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search by email or name…"
          className="bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full max-w-sm rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Roles</th>
              <th className="px-4 py-3 font-medium">Licenses</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name ?? "—"}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map(({ role }) => (
                      <span
                        key={role.name}
                        className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{user._count.licenses}</td>
                <td className="px-4 py-3">
                  {user.deletedAt ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      Deleted
                    </span>
                  ) : user.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Banned
                    </span>
                  )}
                </td>
                <td className="text-muted-foreground px-4 py-3 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <UserActionsMenu user={user} currentUserId={session!.user.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-muted-foreground px-4 py-8 text-center text-sm">No users found.</p>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <p>
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/users?page=${page - 1}${search ? `&q=${search}` : ""}`}
                className="hover:bg-accent rounded-md border px-3 py-1"
              >
                Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/users?page=${page + 1}${search ? `&q=${search}` : ""}`}
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
