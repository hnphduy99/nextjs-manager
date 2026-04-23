import { UsersDataTable } from "@/components/dashboard/users/users-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assertPermission, getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm">{total} total users</p>
        </div>
      </div>

      {/* Search */}
      <form className="flex gap-2">
        <Input name="q" defaultValue={search} placeholder="Search by email or name…" className="max-w-sm" />
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      {/* Data Table */}
      <UsersDataTable currentUserId={session.user.id} data={users} />
    </div>
  );
}
