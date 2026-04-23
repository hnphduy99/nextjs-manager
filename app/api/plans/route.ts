import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * GET /api/plans
 * Public endpoint — no auth required.
 * Returns all active license plans for display in the Electron purchase UI.
 */
export async function GET() {
  const plans = await db.licensePlan.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      currency: true,
      durationDays: true
    },
    orderBy: { price: "asc" }
  });

  // Convert Decimal to number for JSON serialization
  return NextResponse.json({
    plans: plans.map((p) => ({ ...p, price: Number(p.price) }))
  });
}
