"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown, ChevronRight, Loader2, Pencil, Plus, Shield, Trash2, X } from "lucide-react";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Permission {
  id: string;
  action: string;
  subject: string;
  description: string | null;
  _count: { roles: number };
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: { permission: Permission }[];
  _count: { users: number };
}

interface Props {
  initialRoles: Role[];
  initialPermissions: Permission[];
}

const PROTECTED_ROLES = ["superadmin", "admin", "user"];

// ─── Helper ───────────────────────────────────────────────────────────────────

function groupBySubject(permissions: Permission[]) {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.subject] ??= []).push(p);
    return acc;
  }, {});
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RolesManager({ initialRoles, initialPermissions }: Props) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");

  // ── Role state ──────────────────────────────────────────────────────────────
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({ name: "", description: "" });
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState({ name: "", description: "" });
  const [createRoleLoading, setCreateRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // ── Permission state ────────────────────────────────────────────────────────
  const [showCreatePerm, setShowCreatePerm] = useState(false);
  const [createPermForm, setCreatePermForm] = useState({ action: "", subject: "", description: "" });
  const [createPermLoading, setCreatePermLoading] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const [deletePermLoading, setDeletePermLoading] = useState<string | null>(null);

  // ─── Role actions ─────────────────────────────────────────────────────────────────────

  const startEditRole = (role: Role) => {
    setEditRoleId(role.id);
    setEditRoleForm({ name: role.name, description: role.description ?? "" });
    setEditPerms(role.permissions.map((rp) => rp.permission.id));
    setExpandedRole(role.id);
    setRoleError(null);
  };

  const cancelEditRole = () => {
    setEditRoleId(null);
    setEditPerms([]);
    setRoleError(null);
  };

  const saveRole = async (id: string) => {
    setRoleLoading(id);
    setRoleError(null);
    const res = await fetch(`/api/admin/roles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editRoleForm.name,
        description: editRoleForm.description || null,
        permissionIds: editPerms
      })
    });
    const data = (await res.json()) as { role?: Role; error?: string };
    if (!res.ok) {
      setRoleError(data.error ?? "Failed to update role.");
    } else if (data.role) {
      setRoles((prev) => prev.map((r) => (r.id === id ? data.role! : r)));
      setEditRoleId(null);
    }
    setRoleLoading(null);
  };

  const deleteRole = async (id: string, name: string) => {
    if (!confirm(`Delete role "${name}"? This will remove it from all users.`)) return;
    setRoleLoading(id);
    const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      alert(data.error ?? "Failed to delete role.");
    } else {
      setRoles((prev) => prev.filter((r) => r.id !== id));
    }
    setRoleLoading(null);
  };

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateRoleLoading(true);
    setRoleError(null);
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createRoleForm)
    });
    const data = (await res.json()) as { role?: Role; error?: string };
    if (!res.ok) {
      setRoleError(data.error ?? "Failed to create role.");
    } else if (data.role) {
      setRoles((prev) => [...prev, data.role!]);
      setShowCreateRole(false);
      setCreateRoleForm({ name: "", description: "" });
    }
    setCreateRoleLoading(false);
  };

  const togglePerm = (id: string) => {
    setEditPerms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  // ─── Permission actions ───────────────────────────────────────────────────────────────

  const createPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePermLoading(true);
    setPermError(null);
    const res = await fetch("/api/admin/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createPermForm)
    });
    const data = (await res.json()) as { permission?: Permission; error?: string };
    if (!res.ok) {
      setPermError(data.error ?? "Failed to create permission.");
    } else if (data.permission) {
      setPermissions((prev) =>
        [...prev, data.permission!].sort(
          (a, b) => a.subject.localeCompare(b.subject) || a.action.localeCompare(b.action)
        )
      );
      setShowCreatePerm(false);
      setCreatePermForm({ action: "", subject: "", description: "" });
    }
    setCreatePermLoading(false);
  };

  const deletePermission = async (id: string, label: string) => {
    if (!confirm(`Delete permission "${label}"?`)) return;
    setDeletePermLoading(id);
    const res = await fetch(`/api/admin/permissions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPermissions((prev) => prev.filter((p) => p.id !== id));
      // Remove from any roles that had it
      setRoles((prev) =>
        prev.map((r) => ({ ...r, permissions: r.permissions.filter((rp) => rp.permission.id !== id) }))
      );
    }
    setDeletePermLoading(null);
  };

  const grouped = groupBySubject(permissions);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-muted/30 flex w-fit gap-1 rounded-lg border p-1">
        {(["roles", "permissions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${activeTab === tab ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab === "roles" ? `Roles (${roles.length})` : `Permissions (${permissions.length})`}
          </button>
        ))}
      </div>

      {/* ── ROLES TAB ─────────────────────────────────────────────── */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          {roleError && <p className="text-destructive text-sm">{roleError}</p>}

          {/* Roles list */}
          <div className="bg-card divide-y overflow-hidden rounded-xl border shadow-sm">
            {roles.map((role) => {
              const expanded = expandedRole === role.id;
              const isEditing = editRoleId === role.id;
              const isProtected = PROTECTED_ROLES.includes(role.name);

              return (
                <div key={role.id}>
                  {/* Role row */}
                  <div className="hover:bg-muted/20 flex items-center gap-3 px-4 py-3 transition-colors">
                    <button
                      onClick={() => setExpandedRole(expanded ? null : role.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>

                    <Shield className="text-primary size-4" />

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <Input
                            className="h-7 w-36 text-xs"
                            value={editRoleForm.name}
                            onChange={(e) => setEditRoleForm((f) => ({ ...f, name: e.target.value }))}
                            disabled={isProtected}
                          />
                          <Input
                            className="h-7 w-52 text-xs"
                            placeholder="Description"
                            value={editRoleForm.description}
                            onChange={(e) => setEditRoleForm((f) => ({ ...f, description: e.target.value }))}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{role.name}</span>
                          {isProtected && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              system
                            </span>
                          )}
                          {role.description && (
                            <span className="text-muted-foreground truncate text-xs">{role.description}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                      <span>{role._count.users} users</span>
                      <span>·</span>
                      <span>{role.permissions.length} perms</span>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => saveRole(role.id)}
                            disabled={roleLoading === role.id}
                          >
                            {roleLoading === role.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Check className="size-3 text-green-600" />
                            )}
                          </Button>
                          <Button size="icon" variant="ghost" className="size-7" onClick={cancelEditRole}>
                            <X className="size-3 text-red-500" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => startEditRole(role)}>
                            <Pencil className="size-3" />
                          </Button>
                          {!isProtected && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 size-7"
                              onClick={() => deleteRole(role.id, role.name)}
                              disabled={roleLoading === role.id}
                            >
                              {roleLoading === role.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Trash2 className="size-3" />
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded: permission assignment */}
                  {expanded && (
                    <div className="bg-muted/10 border-t px-5 py-4">
                      {isEditing ? (
                        <div>
                          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                            Assign Permissions
                          </p>
                          <div className="space-y-3">
                            {Object.entries(grouped).map(([subject, perms]) => (
                              <div key={subject}>
                                <p className="text-muted-foreground mb-1.5 text-xs font-medium capitalize">{subject}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {perms.map((p) => {
                                    const checked = editPerms.includes(p.id);
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => togglePerm(p.id)}
                                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${checked ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                                      >
                                        {p.action}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                            Permissions
                          </p>
                          {role.permissions.length === 0 ? (
                            <p className="text-muted-foreground text-xs">No permissions assigned.</p>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(
                                role.permissions.reduce<Record<string, Permission[]>>((acc, rp) => {
                                  (acc[rp.permission.subject] ??= []).push(rp.permission);
                                  return acc;
                                }, {})
                              ).map(([subject, perms]) => (
                                <div key={subject} className="flex items-start gap-2">
                                  <span className="text-muted-foreground mt-0.5 w-24 shrink-0 text-xs capitalize">
                                    {subject}
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {perms.map((p) => (
                                      <span
                                        key={p.id}
                                        className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium"
                                      >
                                        {p.action}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Create role */}
          {showCreateRole ? (
            <form onSubmit={createRole} className="bg-card space-y-3 rounded-xl border p-4 shadow-sm">
              <p className="text-sm font-semibold">New Role</p>
              <div className="flex flex-wrap gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Name *</Label>
                  <Input
                    className="h-8 w-36 text-sm"
                    placeholder="e.g. moderator"
                    required
                    value={createRoleForm.name}
                    onChange={(e) => setCreateRoleForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    className="h-8 w-64 text-sm"
                    placeholder="Optional description"
                    value={createRoleForm.description}
                    onChange={(e) => setCreateRoleForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              {roleError && <p className="text-destructive text-sm">{roleError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createRoleLoading}>
                  {createRoleLoading && <Loader2 className="mr-1 size-3 animate-spin" />} Create
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreateRole(false);
                    setRoleError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowCreateRole(true)}>
              <Plus className="mr-1 size-3" /> New Role
            </Button>
          )}
        </div>
      )}

      {/* ── PERMISSIONS TAB ───────────────────────────────────────── */}
      {activeTab === "permissions" && (
        <div className="space-y-4">
          {/* Grouped by subject */}
          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
            {Object.entries(grouped).length === 0 ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">No permissions found.</p>
            ) : (
              Object.entries(grouped).map(([subject, perms]) => (
                <div key={subject} className="border-b last:border-0">
                  <div className="bg-muted/20 px-4 py-2">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide capitalize uppercase">
                      {subject}
                    </p>
                  </div>
                  {perms.map((perm) => (
                    <div
                      key={perm.id}
                      className="hover:bg-muted/10 flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    >
                      <code className="text-primary w-24 shrink-0 font-mono text-xs">{perm.action}</code>
                      <span className="text-muted-foreground flex-1 text-xs">
                        {perm.description ?? `${perm.action} ${perm.subject}`}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">{perm._count.roles} roles</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 size-6 shrink-0"
                        disabled={deletePermLoading === perm.id}
                        onClick={() => deletePermission(perm.id, `${perm.subject}:${perm.action}`)}
                      >
                        {deletePermLoading === perm.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Create permission */}
          {showCreatePerm ? (
            <form onSubmit={createPermission} className="bg-card space-y-3 rounded-xl border p-4 shadow-sm">
              <p className="text-sm font-semibold">New Permission</p>
              <div className="flex flex-wrap gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">
                    Subject * <span className="text-muted-foreground">(resource)</span>
                  </Label>
                  <Input
                    className="h-8 w-32 text-sm"
                    placeholder="e.g. report"
                    required
                    value={createPermForm.subject}
                    onChange={(e) => setCreatePermForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Action *</Label>
                  <Input
                    className="h-8 w-28 text-sm"
                    placeholder="e.g. export"
                    required
                    value={createPermForm.action}
                    onChange={(e) => setCreatePermForm((f) => ({ ...f, action: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    className="h-8 w-64 text-sm"
                    placeholder="What this permission allows"
                    value={createPermForm.description}
                    onChange={(e) => setCreatePermForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              {permError && <p className="text-destructive text-sm">{permError}</p>}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={createPermLoading}>
                  {createPermLoading && <Loader2 className="mr-1 size-3 animate-spin" />} Create
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreatePerm(false);
                    setPermError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowCreatePerm(true)}>
              <Plus className="mr-1 size-3" /> New Permission
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
