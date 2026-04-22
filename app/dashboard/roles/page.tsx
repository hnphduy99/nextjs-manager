import { RolesManager } from "@/components/dashboard/roles-manager";
import { assertPermission, getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  assertPermission(session, "user", "manage");

  const [roles, permissions] = await Promise.all([
    db.role.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        permissions: {
          include: {
            permission: {
              include: { _count: { select: { roles: true } } }
            }
          }
        },
        _count: { select: { users: true } }
      }
    }),
    db.permission.findMany({
      orderBy: [{ subject: "asc" }, { action: "asc" }],
      include: { _count: { select: { roles: true } } }
    })
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground text-sm">Manage system roles and their permission assignments</p>
      </div>
      <RolesManager initialRoles={roles} initialPermissions={permissions} />
    </div>
  );
}
