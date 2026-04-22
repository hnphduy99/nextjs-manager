import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/admin/permissions
export async function GET() {
  const session = await getSession();
  assertPermission(session, "user", "read");

  const permissions = await db.permission.findMany({
    orderBy: [{ subject: "asc" }, { action: "asc" }],
    include: { _count: { select: { roles: true } } }
  });

  return NextResponse.json({ permissions });
}

// POST /api/admin/permissions — create new permission
export async function POST(req: NextRequest) {
  const session = await getSession();
  assertPermission(session, "user", "manage");

  const { action, subject, description } = (await req.json()) as {
    action: string;
    subject: string;
    description?: string;
  };

  if (!action || !subject) {
    return NextResponse.json({ error: "action and subject are required." }, { status: 400 });
  }

  const exists = await db.permission.findUnique({ where: { action_subject: { action, subject } } });
  if (exists) return NextResponse.json({ error: "Permission already exists." }, { status: 409 });

  const permission = await db.permission.create({
    data: { action: action.trim(), subject: subject.trim(), description: description ?? null },
    include: { _count: { select: { roles: true } } }
  });

  return NextResponse.json({ permission }, { status: 201 });
}
