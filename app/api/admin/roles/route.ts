import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/admin/roles — list all roles with their permissions and user count
export async function GET() {
  const session = await getSession();
  assertPermission(session, "user", "read");

  const roles = await db.role.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } }
    }
  });

  return NextResponse.json({ roles });
}

// POST /api/admin/roles — create new role
export async function POST(req: NextRequest) {
  const session = await getSession();
  assertPermission(session, "user", "manage");

  const { name, description } = (await req.json()) as { name: string; description?: string };
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const exists = await db.role.findUnique({ where: { name } });
  if (exists) return NextResponse.json({ error: "Role name already exists." }, { status: 409 });

  const role = await db.role.create({
    data: { name: name.toLowerCase().trim(), description: description ?? null },
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }
  });

  return NextResponse.json({ role }, { status: 201 });
}
