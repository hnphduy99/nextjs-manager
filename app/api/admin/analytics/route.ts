import { db } from "@/lib/db";
import { assertPermission, getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  assertPermission(session, "user", "read");

  const now = new Date();

  // ── Last 7 days: daily transaction revenue ──────────────────────────────────
  const revenueRaw = await db.$queryRaw<{ date: string; revenue: number; count: number }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date,
      COALESCE(SUM(amount), 0)::float AS revenue,
      COUNT(*)::int AS count
    FROM transactions
    WHERE status = 'COMPLETED'
      AND "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY DATE_TRUNC('day', "createdAt")
  `;

  // ── License status breakdown ────────────────────────────────────────────────
  const licenseStatusRaw = await db.license.groupBy({
    by: ["status"],
    _count: { _all: true }
  });
  const licenseStatus = licenseStatusRaw.map((r) => ({
    name: r.status,
    value: r._count._all
  }));

  // ── Plan popularity ─────────────────────────────────────────────────────────
  const planPopularity = await db.license.groupBy({
    by: ["planId"],
    _count: { _all: true },
    orderBy: { _count: { planId: "desc" } }
  });

  const planIds = planPopularity.map((p) => p.planId);
  const plans = await db.licensePlan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, name: true }
  });
  const planMap = Object.fromEntries(plans.map((p) => [p.id, p.name]));

  const planData = planPopularity.map((p) => ({
    name: planMap[p.planId] ?? "Unknown",
    licenses: p._count._all
  }));

  // ── User growth (last 30 days, daily) ──────────────────────────────────────
  const userGrowthRaw = await db.$queryRaw<{ date: string; count: number }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count
    FROM users
    WHERE "createdAt" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY DATE_TRUNC('day', "createdAt")
  `;

  // ── Summary stats ───────────────────────────────────────────────────────────
  const [totalRevenue, totalUsers, activeUsers, totalLicenses] = await Promise.all([
    db.transaction.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true }
    }),
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { isActive: true, deletedAt: null } }),
    db.license.count({ where: { status: "ACTIVE" } })
  ]);

  return NextResponse.json({
    summary: {
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      totalUsers,
      activeUsers,
      activeLicenses: totalLicenses
    },
    revenue: revenueRaw,
    licenseStatus,
    planData,
    userGrowth: userGrowthRaw,
    generatedAt: now.toISOString()
  });
}
