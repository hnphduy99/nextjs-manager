import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// PATCH /api/admin/roles/[id] — update name, description, permissions
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  assertPermission(session, "user", "manage");

  const { id } = await params;
  const { name, description, permissionIds } = (await req.json()) as {
    name?: string;
    description?: string;
    permissionIds?: string[]; // full replacement of permissions
  };

  const role = await db.$transaction(async (tx) => {
    const updated = await tx.role.update({
      where: { id },
      data: {
        ...(name && { name: name.toLowerCase().trim() }),
        ...(description !== undefined && { description: description || null })
      }
    });

    if (permissionIds !== undefined) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          skipDuplicates: true
        });
      }
    }

    return tx.role.findUnique({
      where: { id: updated.id },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }
    });
  });

  return NextResponse.json({ role });
}

// DELETE /api/admin/roles/[id] — delete role (guard system roles)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  assertPermission(session, "user", "manage");

  const { id } = await params;

  const role = await db.role.findUnique({ where: { id }, select: { name: true } });
  const PROTECTED = ["superadmin", "admin", "user"];
  if (role && PROTECTED.includes(role.name)) {
    return NextResponse.json({ error: `Cannot delete system role "${role.name}".` }, { status: 400 });
  }

  await db.role.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
