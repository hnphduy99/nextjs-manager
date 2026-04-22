import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// PATCH /api/admin/users/[id] — update name, email, isActive, roles
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  assertPermission(session, "user", "update");

  const { id } = await params;
  const body = (await req.json()) as {
    isActive?: boolean;
    name?: string;
    email?: string;
    roleNames?: string[]; // e.g. ["user", "admin"]
  };

  // Cannot self-demote to prevent lockout
  if (id === session!.user.id && body.roleNames && !body.roleNames.includes("superadmin")) {
    const isSuperadmin = session!.user.roles.includes("superadmin");
    if (isSuperadmin) {
      return NextResponse.json({ error: "Cannot remove superadmin role from your own account." }, { status: 400 });
    }
  }

  const userData: Record<string, unknown> = {};
  if (body.name !== undefined) userData.name = body.name;
  if (body.email !== undefined) userData.email = body.email;
  if (body.isActive !== undefined) userData.isActive = body.isActive;

  const user = await db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: userData,
      select: { id: true, email: true, name: true, isActive: true }
    });

    // Update roles if provided
    if (body.roleNames) {
      // Remove all current roles
      await tx.userRole.deleteMany({ where: { userId: id } });

      // Re-assign new roles
      const roles = await tx.role.findMany({ where: { name: { in: body.roleNames } } });
      await tx.userRole.createMany({
        data: roles.map((r) => ({ userId: id, roleId: r.id })),
        skipDuplicates: true
      });
    }

    return updated;
  });

  // Determine action label for audit
  let action = "user.update";
  if (body.isActive === false) action = "user.ban";
  else if (body.isActive === true) action = "user.unban";

  await db.auditLog.create({
    data: {
      userId: session!.user.id,
      action,
      entityType: "User",
      entityId: id,
      after: { ...userData, roleNames: body.roleNames }
    }
  });

  return NextResponse.json({ user });
}

// DELETE /api/admin/users/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  assertPermission(session, "user", "delete");

  const { id } = await params;

  if (id === session!.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  await db.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await db.auditLog.create({
    data: { userId: session!.user.id, action: "user.delete", entityType: "User", entityId: id }
  });

  return NextResponse.json({ success: true });
}
