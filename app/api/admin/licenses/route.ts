import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { randomBytes } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () => Array.from({ length: 4 }, () => chars[randomBytes(1)[0] % chars.length]).join("");
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
}

// GET /api/admin/licenses — list all licenses
export async function GET(req: NextRequest) {
  const session = await getSession();
  assertPermission(session, "license", "read");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const status = searchParams.get("status") ?? undefined;
  const skip = (page - 1) * limit;

  const where = status ? { status: status as never } : {};

  const [licenses, total] = await Promise.all([
    db.license.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        plan: { select: { name: true } },
        _count: { select: { deviceSessions: true } }
      }
    }),
    db.license.count({ where })
  ]);

  return NextResponse.json({ licenses, total, page, limit });
}

// POST /api/admin/licenses — generate a new license key
export async function POST(req: NextRequest) {
  const session = await getSession();
  assertPermission(session, "license", "create");

  const { userId, planId, expiresAt, notes } = (await req.json()) as {
    userId: string;
    planId: string;
    expiresAt?: string;
    notes?: string;
  };

  if (!userId || !planId) {
    return NextResponse.json({ error: "userId and planId are required." }, { status: 400 });
  }

  // Generate unique key (retry up to 5x in case of collision)
  let key = "";
  for (let i = 0; i < 5; i++) {
    const candidate = generateLicenseKey();
    const existing = await db.license.findUnique({ where: { key: candidate } });
    if (!existing) {
      key = candidate;
      break;
    }
  }
  if (!key) return NextResponse.json({ error: "Key generation failed." }, { status: 500 });

  const license = await db.license.create({
    data: {
      key,
      userId,
      planId,
      status: "PENDING",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes ?? null
    },
    include: { plan: { select: { name: true } }, user: { select: { email: true } } }
  });

  await db.auditLog.create({
    data: {
      userId: session!.user.id,
      action: "license.create",
      entityType: "License",
      entityId: license.id,
      after: { key, planId }
    }
  });

  return NextResponse.json({ license }, { status: 201 });
}
