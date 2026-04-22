import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { randomBytes } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () => Array.from({ length: 4 }, () => chars[randomBytes(1)[0] % chars.length]).join("");
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
}

// PATCH /api/admin/transactions/[id] — confirm, refund, or cancel
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  assertPermission(session, "transaction", "confirm");

  const { id } = await params;
  const { action, note } = (await req.json()) as { action: "confirm" | "refund" | "cancel"; note?: string };

  const tx = await db.transaction.findUnique({ where: { id }, include: { plan: true } });
  if (!tx) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  if (action === "confirm" && tx.status !== "PENDING") {
    return NextResponse.json({ error: "Only PENDING transactions can be confirmed." }, { status: 400 });
  }

  let updatedTx;
  let licenseId = tx.licenseId;

  if (action === "confirm") {
    // Generate license key automatically on confirm
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

    // Calculate expiry date
    let expiresAt: Date | null = null;
    if (tx.plan.durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + tx.plan.durationDays);
    }

    const license = await db.license.create({
      data: { key, userId: tx.userId, planId: tx.planId, status: "PENDING", expiresAt }
    });
    licenseId = license.id;

    updatedTx = await db.transaction.update({
      where: { id },
      data: { status: "COMPLETED", paidAt: new Date(), confirmedBy: session!.user.id, licenseId, note: note ?? tx.note }
    });
  } else {
    const statusMap = { refund: "REFUNDED", cancel: "CANCELLED" } as const;
    updatedTx = await db.transaction.update({
      where: { id },
      data: { status: statusMap[action as keyof typeof statusMap], note: note ?? tx.note }
    });
  }

  await db.auditLog.create({
    data: {
      userId: session!.user.id,
      action: `transaction.${action}`,
      entityType: "Transaction",
      entityId: id,
      before: { status: tx.status },
      after: { status: updatedTx.status, licenseId }
    }
  });

  return NextResponse.json({ transaction: updatedTx });
}
