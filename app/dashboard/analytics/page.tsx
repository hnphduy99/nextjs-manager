"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalUsers: number;
    activeUsers: number;
    activeLicenses: number;
  };
  revenue: { date: string; revenue: number; count: number }[];
  licenseStatus: { name: string; value: number }[];
  planData: { name: string; licenses: number }[];
  userGrowth: { date: string; count: number }[];
}

const PIE_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e",
  PENDING: "#eab308",
  EXPIRED: "#6b7280",
  REVOKED: "#ef4444",
  SUSPENDED: "#f97316"
};

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function shortDate(iso: any) {
  if (typeof iso !== "string") return String(iso);
  return iso.slice(5); // "MM-DD"
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        setData(d as AnalyticsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted h-24 animate-pulse rounded-xl border" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Failed to load analytics.</p>;

  const { summary, revenue, licenseStatus, planData, userGrowth } = data;

  const summaryCards = [
    { label: "Total Revenue", value: formatVND(summary.totalRevenue), sub: "Completed transactions" },
    { label: "Total Users", value: summary.totalUsers.toLocaleString(), sub: `${summary.activeUsers} active` },
    { label: "Active Licenses", value: summary.activeLicenses.toLocaleString(), sub: "Currently in use" },
    {
      label: "Conversion Rate",
      value: summary.totalUsers > 0 ? `${Math.round((summary.activeLicenses / summary.totalUsers) * 100)}%` : "0%",
      sub: "Users with active license"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">Revenue, growth, and license insights</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, sub }) => (
          <div key={label} className="bg-card rounded-xl border p-5 shadow-sm">
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-card rounded-xl border p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Revenue (Last 30 Days)</h2>
        {revenue.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">No completed transactions yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenue} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: any) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: any) => formatVND(typeof v === "number" ? v : Number(v) || 0)}
                labelFormatter={shortDate}
              />
              <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User growth */}
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">User Growth (Last 30 Days)</h2>
          {userGrowth.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No new users in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={userGrowth} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={shortDate} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} name="New Users" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* License status pie */}
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">License Status</h2>
          {licenseStatus.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No licenses yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={licenseStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {licenseStatus.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Plan popularity */}
      {planData.length > 0 && (
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <h2 className="mb-4 font-semibold">License Plans Popularity</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={planData} layout="vertical" margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
              <Tooltip />
              <Bar dataKey="licenses" fill="#6366f1" radius={[0, 4, 4, 0]} name="Licenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
