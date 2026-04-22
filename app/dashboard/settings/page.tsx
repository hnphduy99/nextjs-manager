import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { LicensePlansManager } from "@/components/dashboard/license-plans-manager";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  const isAdmin = session.user.roles.some((r) => ["admin", "superadmin"].includes(r));
  const plans = isAdmin ? await db.licensePlan.findMany({ orderBy: { createdAt: "asc" } }) : [];

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account and system configuration</p>
      </div>

      {/* Account */}
      <section className="bg-card rounded-xl border p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold">Account Info</h2>
        <p className="text-muted-foreground mb-5 text-sm">Your account details</p>
        <div className="space-y-2 text-sm">
          <div className="flex gap-3">
            <span className="text-muted-foreground w-24">Name</span>
            <span className="font-medium">{session.user.name ?? "—"}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-muted-foreground w-24">Email</span>
            <span className="font-medium">{session.user.email}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-muted-foreground w-24">Roles</span>
            <div className="flex gap-1">
              {session.user.roles.map((r) => (
                <span
                  key={r}
                  className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Change password */}
      <section className="bg-card rounded-xl border p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold">Change Password</h2>
        <p className="text-muted-foreground mb-5 text-sm">Update your login password</p>
        <ChangePasswordForm />
      </section>

      {/* License Plans (admin only) */}
      {isAdmin && (
        <section className="bg-card rounded-xl border p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold">License Plans</h2>
          <p className="text-muted-foreground mb-5 text-sm">Manage available license plans and pricing</p>
          <LicensePlansManager initialPlans={plans.map((p) => ({ ...p, price: Number(p.price) }))} />
        </section>
      )}
    </div>
  );
}
