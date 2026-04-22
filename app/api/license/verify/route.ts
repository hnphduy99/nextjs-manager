import { db } from "@/lib/db";
import type { LicenseStatus } from "@prisma/client";
import { createHash } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VerifyRequest {
  licenseKey: string;
  machineId: string; // raw hardware fingerprint, we hash it server-side
  machineName?: string;
  platform?: string;
  appVersion?: string;
}

type VerifyErrorCode =
  | "INVALID_KEY"
  | "LICENSE_EXPIRED"
  | "LICENSE_REVOKED"
  | "LICENSE_SUSPENDED"
  | "LICENSE_PENDING"
  | "ACCOUNT_DISABLED"
  | "DEVICE_CONFLICT";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashMachineId(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function errorResponse(code: VerifyErrorCode, message: string, status = 403) {
  return NextResponse.json({ valid: false, reason: code, message }, { status });
}

const STATUS_ERROR_MAP: Partial<Record<LicenseStatus, [VerifyErrorCode, string]>> = {
  EXPIRED: ["LICENSE_EXPIRED", "License has expired. Please renew your subscription."],
  REVOKED: ["LICENSE_REVOKED", "License has been revoked. Please contact support."],
  SUSPENDED: ["LICENSE_SUSPENDED", "License is temporarily suspended. Please contact support."],
  PENDING: ["LICENSE_PENDING", "License has not been activated yet."]
};

// ─── Route Handler ────────────────────────────────────────────────────────────

/**
 * POST /api/license/verify
 * Called by Electron app on startup and every 5 minutes as heartbeat.
 */
export async function POST(req: NextRequest) {
  let body: VerifyRequest;

  try {
    body = (await req.json()) as VerifyRequest;
  } catch {
    return errorResponse("INVALID_KEY", "Invalid request body.", 400);
  }

  const { licenseKey, machineId, machineName, platform, appVersion } = body;

  if (!licenseKey || !machineId) {
    return errorResponse("INVALID_KEY", "licenseKey and machineId are required.", 400);
  }

  const hashedMachineId = hashMachineId(machineId);

  // ── 1. Load license with user + plan ───────────────────────────────────────
  const license = await db.license.findUnique({
    where: { key: licenseKey },
    include: {
      user: { select: { id: true, isActive: true, deletedAt: true } },
      plan: { select: { name: true, durationDays: true } }
    }
  });

  if (!license) return errorResponse("INVALID_KEY", "Invalid license key.", 404);

  // ── 2. Check account status ────────────────────────────────────────────────
  if (!license.user.isActive || license.user.deletedAt) {
    return errorResponse("ACCOUNT_DISABLED", "Your account has been disabled.");
  }

  // ── 3. Check license status ────────────────────────────────────────────────
  // Auto-expire if past expiresAt
  if (license.status === "ACTIVE" && license.expiresAt && license.expiresAt < new Date()) {
    await db.license.update({
      where: { id: license.id },
      data: { status: "EXPIRED" }
    });
    return errorResponse("LICENSE_EXPIRED", "License has expired. Please renew your subscription.");
  }

  const statusError = STATUS_ERROR_MAP[license.status];
  if (statusError) return errorResponse(statusError[0], statusError[1]);

  // ── 4. Device binding check (1 account = 1 device) ────────────────────────
  const activeSession = await db.deviceSession.findFirst({
    where: { userId: license.userId, isActive: true }
  });

  if (activeSession) {
    if (activeSession.machineId !== hashedMachineId) {
      // Different device is active → reject
      return errorResponse(
        "DEVICE_CONFLICT",
        "This license is already active on another device. Please deactivate the other device first."
      );
    }
    // Same device → update heartbeat
    await db.deviceSession.update({
      where: { id: activeSession.id },
      data: { lastHeartbeatAt: new Date(), appVersion: appVersion ?? activeSession.appVersion }
    });
  } else {
    // No active session → create new one; activate license if PENDING
    await db.$transaction([
      db.deviceSession.create({
        data: {
          userId: license.userId,
          licenseId: license.id,
          machineId: hashedMachineId,
          machineName: machineName ?? null,
          platform: platform ?? null,
          appVersion: appVersion ?? null,
          isActive: true
        }
      }),
      ...(license.status === "PENDING"
        ? [
            db.license.update({
              where: { id: license.id },
              data: { status: "ACTIVE", activatedAt: new Date() }
            })
          ]
        : [])
    ]);
  }

  // ── 5. Return success ──────────────────────────────────────────────────────
  return NextResponse.json({
    valid: true,
    userId: license.userId,
    plan: license.plan.name,
    expiresAt: license.expiresAt?.toISOString() ?? null, // null = lifetime
    activatedAt: license.activatedAt?.toISOString() ?? new Date().toISOString()
  });
}

/**
 * POST /api/license/deactivate
 * Called when user explicitly logs out of Electron app or switches device.
 */
export async function DELETE(req: NextRequest) {
  let body: Pick<VerifyRequest, "licenseKey" | "machineId">;

  try {
    body = (await req.json()) as Pick<VerifyRequest, "licenseKey" | "machineId">;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { licenseKey, machineId } = body;
  const hashedMachineId = hashMachineId(machineId);

  const license = await db.license.findUnique({ where: { key: licenseKey } });
  if (!license) return NextResponse.json({ error: "Invalid key" }, { status: 404 });

  await db.deviceSession.updateMany({
    where: { licenseId: license.id, machineId: hashedMachineId, isActive: true },
    data: { isActive: false, deactivatedAt: new Date(), deactivatedReason: "manual" }
  });

  return NextResponse.json({ success: true });
}
