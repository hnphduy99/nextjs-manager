import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/admin/plans
export async function GET() {
  const session = await getSession();
  assertPermission(session, "license", "read");

  const plans = await db.licensePlan.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ plans });
}

// POST /api/admin/plans — create new plan
export async function POST(req: NextRequest) {
  const session = await getSession();
  assertPermission(session, "license", "create");

  const body = (await req.json()) as {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    durationDays?: number | null;
  };

  if (!body.name || body.price === undefined) {
    return NextResponse.json({ error: "name and price are required." }, { status: 400 });
  }

  const plan = await db.licensePlan.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      price: body.price,
      currency: body.currency ?? "VND",
      durationDays: body.durationDays ?? null
    }
  });

  return NextResponse.json({ plan }, { status: 201 });
}
