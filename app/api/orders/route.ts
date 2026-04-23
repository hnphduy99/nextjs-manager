import { db } from "@/lib/db";
import { requireElectronAuth } from "@/lib/electron-jwt";
import { type NextRequest, NextResponse } from "next/server";

interface CreateOrderBody {
  planId: string;
  note?: string;
}

/**
 * POST /api/orders
 * Electron app — create a purchase order (PENDING transaction).
 * Returns order details and bank transfer info for user to complete payment.
 *
 * Auth: Bearer token from POST /api/auth/token
 */
export async function POST(req: NextRequest) {
  const { payload, error } = await requireElectronAuth(req.headers.get("authorization"));
  if (error) return error;

  let body: CreateOrderBody;
  try {
    body = (await req.json()) as CreateOrderBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { planId, note } = body;
  if (!planId) {
    return NextResponse.json({ error: "planId is required." }, { status: 400 });
  }

  // Validate plan exists and is active
  const plan = await db.licensePlan.findUnique({
    where: { id: planId },
    select: { id: true, name: true, price: true, currency: true, durationDays: true, isActive: true }
  });

  if (!plan || !plan.isActive) {
    return NextResponse.json({ error: "Plan not found or inactive." }, { status: 404 });
  }

  // Check if user already has a PENDING order for this plan (prevent duplicates)
  const existingPending = await db.transaction.findFirst({
    where: { userId: payload.sub, planId, status: "PENDING" }
  });

  if (existingPending) {
    return NextResponse.json(
      {
        error: "You already have a pending order for this plan.",
        orderId: existingPending.id
      },
      { status: 409 }
    );
  }

  const transaction = await db.transaction.create({
    data: {
      userId: payload.sub,
      planId,
      amount: plan.price,
      currency: plan.currency,
      paymentMethod: "BANK_TRANSFER",
      note: note ?? null,
      status: "PENDING"
    }
  });

  // Bank transfer info — read from env for easy config changes
  const bankInfo = {
    bankName: process.env.BANK_NAME ?? "Vietcombank",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
    accountName: process.env.BANK_ACCOUNT_NAME ?? "",
    transferContent: `LICENSE ${transaction.id.slice(-8).toUpperCase()}`,
    amount: Number(plan.price),
    currency: plan.currency
  };

  return NextResponse.json(
    {
      orderId: transaction.id,
      status: "PENDING",
      plan: {
        id: plan.id,
        name: plan.name,
        durationDays: plan.durationDays
      },
      amount: Number(plan.price),
      currency: plan.currency,
      bankTransfer: bankInfo,
      message: `Transfer exactly ${Number(plan.price).toLocaleString("vi-VN")} ${plan.currency} with content: "${bankInfo.transferContent}"`
    },
    { status: 201 }
  );
}

/**
 * GET /api/orders
 * List all orders of the authenticated user.
 * Auth: Bearer token
 */
export async function GET(req: NextRequest) {
  const { payload, error } = await requireElectronAuth(req.headers.get("authorization"));
  if (error) return error;

  const orders = await db.transaction.findMany({
    where: { userId: payload.sub },
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      paymentMethod: true,
      createdAt: true,
      paidAt: true,
      plan: { select: { name: true, durationDays: true } },
      license: { select: { key: true, status: true, expiresAt: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o,
      amount: Number(o.amount)
    }))
  });
}
