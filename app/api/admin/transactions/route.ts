import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/admin/transactions — list all transactions
export async function GET(req: NextRequest) {
  const session = await getSession();
  assertPermission(session, "transaction", "read");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const status = searchParams.get("status") ?? undefined;
  const skip = (page - 1) * limit;

  const where = status ? { status: status as never } : {};

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        plan: { select: { name: true } },
        license: { select: { key: true } }
      }
    }),
    db.transaction.count({ where })
  ]);

  return NextResponse.json({ transactions, total, page, limit });
}

// POST /api/admin/transactions — create manual transaction record
export async function POST(req: NextRequest) {
  const session = await getSession();
  assertPermission(session, "transaction", "confirm");

  const body = (await req.json()) as {
    userId: string;
    planId: string;
    amount: number;
    currency?: string;
    paymentMethod?: string;
    paymentRef?: string;
    note?: string;
  };

  const tx = await db.transaction.create({
    data: {
      userId: body.userId,
      planId: body.planId,
      amount: body.amount,
      currency: body.currency ?? "VND",
      paymentMethod: (body.paymentMethod as never) ?? "BANK_TRANSFER",
      paymentRef: body.paymentRef,
      note: body.note,
      status: "PENDING"
    }
  });

  return NextResponse.json({ transaction: tx }, { status: 201 });
}
