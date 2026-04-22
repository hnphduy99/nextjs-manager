"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
}
interface User {
  id: string;
  email: string;
  name: string | null;
}

interface Props {
  plans: Plan[];
  users: User[];
}

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "MOMO", label: "MoMo" },
  { value: "ZALOPAY", label: "ZaloPay" },
  { value: "VNPAY", label: "VNPay" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" }
];

export function CreateTransactionModal({ plans, users }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    userId: "",
    planId: "",
    amount: "",
    currency: "VND",
    paymentMethod: "BANK_TRANSFER",
    paymentRef: "",
    note: ""
  });

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    setForm((f) => ({
      ...f,
      planId,
      amount: plan ? String(plan.price) : f.amount,
      currency: plan?.currency ?? f.currency
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.planId || !form.amount) {
      setError("User, plan, and amount are required.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) })
    });

    if (!res.ok) {
      const d = (await res.json()) as { error?: string };
      setError(d.error ?? "Failed to create transaction.");
      setLoading(false);
      return;
    }

    setOpen(false);
    setForm({
      userId: "",
      planId: "",
      amount: "",
      currency: "VND",
      paymentMethod: "BANK_TRANSFER",
      paymentRef: "",
      note: ""
    });
    router.refresh();
    setLoading(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        + New Transaction
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card relative w-full max-w-md rounded-xl border p-6 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
            >
              <X className="size-4" />
            </button>

            <h2 className="mb-5 text-lg font-semibold">New Transaction</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-1.5">
                <Label>Customer</Label>
                <select
                  className="bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                  value={form.userId}
                  onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                  required
                >
                  <option value="">Select user…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label>Plan</Label>
                <select
                  className="bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                  value={form.planId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  required
                >
                  <option value="">Select plan…</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {Number(p.price).toLocaleString()} {p.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Currency</Label>
                  <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>Payment Method</Label>
                <select
                  className="bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                  value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label>
                  Payment Reference <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  placeholder="Bank ref / MoMo TX ID…"
                  value={form.paymentRef}
                  onChange={(e) => setForm((f) => ({ ...f, paymentRef: e.target.value }))}
                />
              </div>

              <div className="grid gap-1.5">
                <Label>
                  Note <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  placeholder="Internal note…"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
