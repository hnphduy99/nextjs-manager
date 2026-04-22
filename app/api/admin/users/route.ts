import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/admin/users — list all users with roles and license count
export async function GET(req: NextRequest) {
  const session = await getSession();
  assertPermission(session, "user", "read");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const search = searchParams.get("q") ?? "";
  const skip = (page - 1) * limit;

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

  return NextResponse.json({ users, total, page, limit });
}
