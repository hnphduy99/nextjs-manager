"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Pencil, Check, X, Plus } from "lucide-react";
import { useState } from "react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationDays: number | null;
  isActive: boolean;
}

export function LicensePlansManager({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Plan>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    price: "",
    currency: "VND",
    durationDays: ""
  });
  const [createLoading, setCreateLoading] = useState(false);

  const startEdit = (plan: Plan) => {
    setEditId(plan.id);
    setEditForm({
      price: plan.price,
      description: plan.description ?? "",
      isActive: plan.isActive,
      durationDays: plan.durationDays
    });
  };

  const saveEdit = async (id: string) => {
    setLoading(id);
    const res = await fetch(`/api/admin/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      const { plan } = (await res.json()) as { plan: Plan };
      setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...plan, price: Number(plan.price) } : p)));
    }
    setEditId(null);
    setLoading(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name,
        description: createForm.description || null,
        price: Number(createForm.price),
        currency: createForm.currency,
        durationDays: createForm.durationDays ? Number(createForm.durationDays) : null
      })
    });
    if (res.ok) {
      const { plan } = (await res.json()) as { plan: Plan };
      setPlans((prev) => [...prev, { ...plan, price: Number(plan.price) }]);
      setShowCreate(false);
      setCreateForm({ name: "", description: "", price: "", currency: "VND", durationDays: "" });
    }
    setCreateLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground border-b text-left">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Price</th>
              <th className="px-4 py-2.5 font-medium">Duration</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{plan.name}</p>
                  {plan.description && <p className="text-muted-foreground text-xs">{plan.description}</p>}
                </td>
                <td className="px-4 py-2.5">
                  {editId === plan.id ? (
                    <Input
                      type="number"
                      className="h-7 w-28 text-xs"
                      value={String(editForm.price ?? "")}
                      onChange={(e) => setEditForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    />
                  ) : (
                    <span>
                      {plan.price.toLocaleString()} {plan.currency}
                    </span>
                  )}
                </td>
                <td className="text-muted-foreground px-4 py-2.5 text-xs">
                  {editId === plan.id ? (
                    <Input
                      type="number"
                      className="h-7 w-20 text-xs"
                      placeholder="days"
                      value={String(editForm.durationDays ?? "")}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, durationDays: e.target.value ? Number(e.target.value) : null }))
                      }
                    />
                  ) : plan.durationDays ? (
                    `${plan.durationDays} days`
                  ) : (
                    "Lifetime"
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {editId === plan.id ? (
                    <select
                      className="bg-background h-7 rounded border px-2 text-xs"
                      value={String(editForm.isActive)}
                      onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === "true" }))}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${plan.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {editId === plan.id ? (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => saveEdit(plan.id)}
                        disabled={loading === plan.id}
                      >
                        {loading === plan.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Check className="size-3 text-green-600" />
                        )}
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditId(null)}>
                        <X className="size-3 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => startEdit(plan)}>
                      <Pencil className="size-3" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create new plan */}
      {showCreate ? (
        <form onSubmit={handleCreate} className="bg-muted/20 space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">New Plan</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Name *"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Price *"
              required
              value={createForm.price}
              onChange={(e) => setCreateForm((f) => ({ ...f, price: e.target.value }))}
            />
            <Input
              placeholder="Currency"
              value={createForm.currency}
              onChange={(e) => setCreateForm((f) => ({ ...f, currency: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Duration (days, blank = lifetime)"
              value={createForm.durationDays}
              onChange={(e) => setCreateForm((f) => ({ ...f, durationDays: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={createLoading}>
              {createLoading && <Loader2 className="mr-1 size-3 animate-spin" />}
              Create
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 size-3" /> Add Plan
        </Button>
      )}
    </div>
  );
}
