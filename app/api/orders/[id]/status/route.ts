import { db } from "@/lib/db";
import { requireElectronAuth } from "@/lib/electron-jwt";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/orders/[id]/status
 * Poll this endpoint after placing an order to check if admin has confirmed the payment.
 * When status becomes "COMPLETED", licenseKey will be included in the response.
 *
 * Recommended polling interval: every 10–30 seconds.
 * Auth: Bearer token
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { payload, error } = await requireElectronAuth(req.headers.get("authorization"));
  if (error) return error;

  const { id } = await params;

  const order = await db.transaction.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      amount: true,
      currency: true,
      createdAt: true,
      paidAt: true,
      plan: { select: { name: true, durationDays: true } },
      license: {
        select: {
          key: true,
          status: true,
          activatedAt: true,
          expiresAt: true
        }
      }
    }
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Users can only see their own orders
  if (order.userId !== payload.sub) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    amount: Number(order.amount),
    currency: order.currency,
    plan: order.plan,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    // License key is revealed only after admin confirms (COMPLETED status)
    licenseKey: order.status === "COMPLETED" ? (order.license?.key ?? null) : null,
    license:
      order.status === "COMPLETED" && order.license
        ? {
            key: order.license.key,
            status: order.license.status,
            activatedAt: order.license.activatedAt?.toISOString() ?? null,
            expiresAt: order.license.expiresAt?.toISOString() ?? null
          }
        : null
  });
}
