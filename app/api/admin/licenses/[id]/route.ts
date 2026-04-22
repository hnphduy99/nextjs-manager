import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// PATCH /api/admin/licenses/[id] — revoke, suspend, extend
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  assertPermission(session, "license", "revoke");

  const { id } = await params;
  const body = (await req.json()) as {
    action: "revoke" | "suspend" | "activate" | "extend";
    reason?: string;
    expiresAt?: string;
  };

  const before = await db.license.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "License not found." }, { status: 404 });

  let data: Record<string, unknown> = {};
  switch (body.action) {
    case "revoke":
      data = {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedBy: session!.user.id,
        revokeReason: body.reason ?? null
      };
      break;
    case "suspend":
      data = { status: "SUSPENDED" };
      break;
    case "activate":
      data = { status: "ACTIVE", activatedAt: before.activatedAt ?? new Date() };
      break;
    case "extend":
      if (!body.expiresAt) return NextResponse.json({ error: "expiresAt required for extend." }, { status: 400 });
      data = { expiresAt: new Date(body.expiresAt), status: "ACTIVE" };
      break;
    default:
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const license = await db.license.update({ where: { id }, data });

  await db.auditLog.create({
    data: {
      userId: session!.user.id,
      action: `license.${body.action}`,
      entityType: "License",
      entityId: id,
      before: { status: before.status },
      after: data as any
    }
  });

  return NextResponse.json({ license });
}
