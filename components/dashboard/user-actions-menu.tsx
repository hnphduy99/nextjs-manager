"use client";

import { DeleteButton } from "@/components/actions/delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ALL_ROLES = ["user", "moderator", "admin", "superadmin"] as const;
type RoleName = (typeof ALL_ROLES)[number];

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
  deletedAt: Date | null;
  roles: { role: { name: string } }[];
}

interface Props {
  user: UserRow;
  currentUserId: string;
}

export function UserActionsMenu({ user, currentUserId }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    name: user.name ?? "",
    email: user.email,
    isActive: user.isActive,
    roleNames: user.roles.map((r) => r.role.name) as RoleName[]
  });

  const isSelf = user.id === currentUserId;

  // ── Ban / Unban ─────────────────────────────────────────────────────────────
  const handleToggleBan = async () => {
    if (!confirm(`Are you sure you want to ${user.isActive ? "ban" : "unban"} this user?`)) return;
    setLoading(true);
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive })
    });
    setLoading(false);
    router.refresh();
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = (await res.json()) as { error?: string };
      alert(d.error ?? "Failed to delete user.");
    }
    setLoading(false);
    router.refresh();
  };

  // ── Edit submit ─────────────────────────────────────────────────────────────
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || null,
        email: form.email,
        isActive: form.isActive,
        roleNames: form.roleNames
      })
    });

    if (!res.ok) {
      const d = (await res.json()) as { error?: string };
      setError(d.error ?? "Failed to update user.");
      setLoading(false);
      return;
    }

    setEditOpen(false);
    setLoading(false);
    router.refresh();
  };

  const toggleRole = (role: RoleName) => {
    setForm((f) => ({
      ...f,
      roleNames: f.roleNames.includes(role) ? f.roleNames.filter((r) => r !== role) : [...f.roleNames, role]
    }));
  };

  return (
    <>
      {/* Action buttons */}
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => setEditOpen(true)}
          className="h-7 gap-1 px-2 text-xs"
        >
          <Pencil className="size-3" /> Edit
        </Button>

        {!isSelf && (
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={handleToggleBan}
            className={`h-7 gap-1 px-2 text-xs ${user.isActive ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950" : "text-green-600 hover:bg-green-50 dark:hover:bg-green-950"}`}
          >
            {user.isActive ? "Ban" : "Unban"}
          </Button>
        )}

        {!isSelf && !user.deletedAt && (
          <DeleteButton
            trigger={loading ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            title="Permanently delete this user? This cannot be undone."
            confirm={handleDelete}
          />
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card relative w-full max-w-md rounded-xl border p-6 shadow-xl">
            <button
              onClick={() => setEditOpen(false)}
              className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
            >
              <X className="size-4" />
            </button>

            <h2 className="mb-5 text-lg font-semibold">Edit User</h2>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Name */}
              <div className="grid gap-1.5">
                <Label htmlFor="edit-name">Full name</Label>
                <Input
                  id="edit-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>

              {/* Email */}
              <div className="grid gap-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              {/* Status */}
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <div className="flex gap-3">
                  {[true, false].map((v) => (
                    <label key={String(v)} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="isActive"
                        checked={form.isActive === v}
                        onChange={() => setForm((f) => ({ ...f, isActive: v }))}
                      />
                      {v ? "Active" : "Banned"}
                    </label>
                  ))}
                </div>
              </div>

              {/* Roles */}
              <div className="grid gap-1.5">
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {ALL_ROLES.map((role) => {
                    const checked = form.roleNames.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                          checked ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
                <p className="text-muted-foreground text-xs">Click to toggle role assignment.</p>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
