import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// DELETE /api/admin/permissions/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  assertPermission(session, "user", "manage");

  const { id } = await params;
  await db.permission.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
