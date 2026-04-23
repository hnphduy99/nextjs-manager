import { db } from "@/lib/db";
import { requireElectronAuth } from "@/lib/electron-jwt";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/me/license
 * Returns the current active license for the authenticated Electron user.
 * Used to display license status and expiry info in the app settings/profile.
 *
 * Auth: Bearer token from POST /api/auth/token
 */
export async function GET(req: NextRequest) {
  const { payload, error } = await requireElectronAuth(req.headers.get("authorization"));
  if (error) return error;

  // Find the most recent ACTIVE or PENDING license for this user
  const license = await db.license.findFirst({
    where: {
      userId: payload.sub,
      status: { in: ["ACTIVE", "PENDING"] }
    },
    select: {
      key: true,
      status: true,
      activatedAt: true,
      expiresAt: true,
      createdAt: true,
      plan: { select: { name: true, durationDays: true, price: true, currency: true } },
      deviceSessions: {
        where: { isActive: true },
        select: { machineName: true, platform: true, lastHeartbeatAt: true },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!license) {
    return NextResponse.json({ hasLicense: false, license: null });
  }

  // Auto-check expiry
  const isExpired = license.expiresAt !== null && license.expiresAt < new Date();

  return NextResponse.json({
    hasLicense: true,
    license: {
      key: license.key,
      status: isExpired ? "EXPIRED" : license.status,
      plan: {
        name: license.plan.name,
        durationDays: license.plan.durationDays,
        price: Number(license.plan.price),
        currency: license.plan.currency
      },
      activatedAt: license.activatedAt?.toISOString() ?? null,
      expiresAt: license.expiresAt?.toISOString() ?? null,
      isLifetime: license.expiresAt === null,
      activeDevice: license.deviceSessions[0] ?? null
    }
  });
}
