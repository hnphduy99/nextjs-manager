import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// PATCH /api/admin/plans/[id] — update price, description, isActive
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  assertPermission(session, "license", "update");

  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    durationDays?: number | null;
    isActive?: boolean;
  };

  const plan = await db.licensePlan.update({ where: { id }, data: body });
  return NextResponse.json({ plan });
}
