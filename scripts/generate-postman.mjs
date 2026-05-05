/**
 * generate-postman.mjs
 * Generates a Postman Collection v2.1 from the Next.js API routes.
 * Run: node scripts/generate-postman.mjs
 * Output: postman-collection.json (project root)
 */

import { writeFileSync } from "fs";

const BASE_URL = "{{BASE_URL}}";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function req({ name, method, path, auth = "none", body = null, description = "", pathVars = [] }) {
  const url = {
    raw: `${BASE_URL}${path}`,
    host: ["{{BASE_URL}}"],
    path: path.replace(/^\//, "").split("/"),
    variable: pathVars.map((v) => ({ key: v, value: `{{${v}}}`, description: "" }))
  };

  const item = {
    name,
    request: {
      method,
      header: [{ key: "Content-Type", value: "application/json" }],
      url,
      description
    },
    response: []
  };

  // Auth
  if (auth === "bearer") {
    item.request.auth = { type: "bearer", bearer: [{ key: "token", value: "{{TOKEN}}", type: "string" }] };
  }

  // Body
  if (body) {
    item.request.body = { mode: "raw", raw: JSON.stringify(body, null, 2), options: { raw: { language: "json" } } };
  }

  return item;
}

function folder(name, items, description = "") {
  return { name, description, item: items, _postman_isSubFolder: true };
}

// ──────────────────────────────────────────────
// Collection Definition
// ──────────────────────────────────────────────
const collection = {
  info: {
    _postman_id: uid(),
    name: "NextJS Auto Manager API",
    description:
      "Auto-generated Postman collection for NextJS Auto Manager.\n\n**Variables:**\n- `BASE_URL` — e.g. `http://localhost:3000/api`\n- `TOKEN` — JWT from POST /auth/token (set after login)\n- `ADMIN_SESSION` — session cookie for admin (set after login to dashboard)\n\n**Auth flow for Electron app:**\n1. `POST /auth/register` or `POST /auth/login` → get session.\n2. `POST /auth/token` → exchange for JWT Bearer token.\n3. Use JWT in all Electron-facing endpoints.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    { key: "BASE_URL", value: "http://localhost:3000/api", type: "string" },
    { key: "TOKEN", value: "", type: "string", description: "JWT from POST /auth/token" },
    { key: "planId", value: "", type: "string" },
    { key: "orderId", value: "", type: "string" },
    { key: "licenseKey", value: "", type: "string" },
    { key: "userId", value: "", type: "string" },
    { key: "roleId", value: "", type: "string" },
    { key: "permissionId", value: "", type: "string" },
    { key: "transactionId", value: "", type: "string" },
    { key: "adminLicenseId", value: "", type: "string" }
  ],
  item: [
    // ── Auth ──────────────────────────────────
    folder(
      "🔐 Auth",
      [
        req({
          name: "Register",
          method: "POST",
          path: "/auth/register",
          description: "Create a new user account.",
          body: { email: "user@example.com", password: "Password123!", name: "John Doe" }
        }),
        req({
          name: "Login",
          method: "POST",
          path: "/auth/login",
          description: "Login and create a Supabase session.",
          body: { email: "user@example.com", password: "Password123!" }
        }),
        req({
          name: "Logout",
          method: "POST",
          path: "/auth/logout",
          auth: "bearer",
          description: "Invalidate the current session."
        }),
        req({
          name: "Get Electron JWT Token",
          method: "POST",
          path: "/auth/token",
          description:
            "Exchange credentials for a short-lived JWT used by the Electron app.\n\nStore the returned `token` in the `TOKEN` variable.",
          body: { email: "user@example.com", password: "Password123!" }
        }),
        req({
          name: "Forgot Password",
          method: "POST",
          path: "/auth/forgot-password",
          description: "Send a password reset email.",
          body: { email: "user@example.com" }
        }),
        req({
          name: "Reset Password",
          method: "POST",
          path: "/auth/reset-password",
          description: "Reset password using token from email.",
          body: { token: "reset-token-from-email", password: "NewPassword123!" }
        }),
        req({
          name: "Change Password",
          method: "POST",
          path: "/auth/change-password",
          auth: "bearer",
          description: "Change password for authenticated user.",
          body: { currentPassword: "Password123!", newPassword: "NewPassword456!" }
        })
      ],
      "Authentication endpoints — login, register, token exchange."
    ),

    // ── Plans (Public) ────────────────────────
    folder(
      "📦 Plans (Public)",
      [
        req({
          name: "List Active Plans",
          method: "GET",
          path: "/plans",
          description:
            "Public — no auth needed. Returns all active license plans sorted by price. Use in Electron purchase UI."
        })
      ],
      "Public endpoints — no auth required."
    ),

    // ── Orders (Electron) ─────────────────────
    folder(
      "🛒 Orders",
      [
        req({
          name: "Create Order",
          method: "POST",
          path: "/orders",
          auth: "bearer",
          description:
            "Create a PENDING purchase order. Returns bank transfer info for user to complete payment.\n\nSet `orderId` variable from response for polling.",
          body: { planId: "{{planId}}", note: "Optional note from user" }
        }),
        req({
          name: "List My Orders",
          method: "GET",
          path: "/orders",
          auth: "bearer",
          description: "Returns all orders for the authenticated user (latest 20)."
        }),
        req({
          name: "Poll Order Status",
          method: "GET",
          path: "/orders/{{orderId}}/status",
          auth: "bearer",
          description:
            "Poll this endpoint every 10–30s after placing an order.\nWhen `status === 'COMPLETED'`, `licenseKey` will be included in the response.",
          pathVars: ["orderId"]
        })
      ],
      "Order management — create orders and poll status."
    ),

    // ── License ───────────────────────────────
    folder(
      "🔑 License",
      [
        req({
          name: "Verify License Key",
          method: "POST",
          path: "/license/verify",
          auth: "bearer",
          description: "Activate/verify a license key on the current device.",
          body: {
            licenseKey: "{{licenseKey}}",
            machineId: "unique-machine-id",
            machineName: "My MacBook Pro",
            platform: "darwin"
          }
        }),
        req({
          name: "Get My License",
          method: "GET",
          path: "/me/license",
          auth: "bearer",
          description: "Returns the current user's license status, plan details, and active device."
        })
      ],
      "License activation and status check."
    ),

    // ── Admin ─────────────────────────────────
    folder(
      "🛡️ Admin",
      [
        folder("Users", [
          req({
            name: "List Users",
            method: "GET",
            path: "/admin/users",
            auth: "bearer",
            description: "Admin only — list all users with pagination."
          }),
          req({
            name: "Get User",
            method: "GET",
            path: "/admin/users/{{userId}}",
            auth: "bearer",
            description: "Admin only — get a specific user by ID.",
            pathVars: ["userId"]
          }),
          req({
            name: "Update User",
            method: "PATCH",
            path: "/admin/users/{{userId}}",
            auth: "bearer",
            description: "Admin only — update user fields.",
            pathVars: ["userId"],
            body: { name: "Updated Name", roleId: "{{roleId}}", isActive: true }
          }),
          req({
            name: "Delete User",
            method: "DELETE",
            path: "/admin/users/{{userId}}",
            auth: "bearer",
            description: "Admin only — soft or hard delete a user.",
            pathVars: ["userId"]
          })
        ]),
        folder("Roles", [
          req({
            name: "List Roles",
            method: "GET",
            path: "/admin/roles",
            auth: "bearer",
            description: "Admin only — list all roles with their permissions."
          }),
          req({
            name: "Create Role",
            method: "POST",
            path: "/admin/roles",
            auth: "bearer",
            description: "Admin only — create a new role.",
            body: { name: "moderator", description: "Can moderate content", permissionIds: [] }
          }),
          req({
            name: "Update Role",
            method: "PATCH",
            path: "/admin/roles/{{roleId}}",
            auth: "bearer",
            description: "Admin only — update role and its permissions.",
            pathVars: ["roleId"],
            body: { name: "moderator", description: "Updated description", permissionIds: ["perm-id-1", "perm-id-2"] }
          }),
          req({
            name: "Delete Role",
            method: "DELETE",
            path: "/admin/roles/{{roleId}}",
            auth: "bearer",
            description: "Admin only — delete a role.",
            pathVars: ["roleId"]
          })
        ]),
        folder("Permissions", [
          req({
            name: "List Permissions",
            method: "GET",
            path: "/admin/permissions",
            auth: "bearer",
            description: "Admin only — list all permissions."
          }),
          req({
            name: "Create Permission",
            method: "POST",
            path: "/admin/permissions",
            auth: "bearer",
            description: "Admin only — create a new permission.",
            body: { name: "users:delete", description: "Can delete users" }
          }),
          req({
            name: "Update Permission",
            method: "PATCH",
            path: "/admin/permissions/{{permissionId}}",
            auth: "bearer",
            description: "Admin only — update a permission.",
            pathVars: ["permissionId"],
            body: { name: "users:delete", description: "Updated description" }
          }),
          req({
            name: "Delete Permission",
            method: "DELETE",
            path: "/admin/permissions/{{permissionId}}",
            auth: "bearer",
            description: "Admin only — delete a permission.",
            pathVars: ["permissionId"]
          })
        ]),
        folder("Plans (Admin)", [
          req({
            name: "List All Plans",
            method: "GET",
            path: "/admin/plans",
            auth: "bearer",
            description: "Admin only — list all plans including inactive."
          }),
          req({
            name: "Create Plan",
            method: "POST",
            path: "/admin/plans",
            auth: "bearer",
            description: "Admin only — create a new license plan.",
            body: {
              name: "Pro 1 Year",
              description: "Full access for 1 year",
              price: 299000,
              currency: "VND",
              durationDays: 365,
              isActive: true
            }
          }),
          req({
            name: "Update Plan",
            method: "PATCH",
            path: "/admin/plans/{{planId}}",
            auth: "bearer",
            description: "Admin only — update a plan.",
            pathVars: ["planId"],
            body: { name: "Pro 1 Year (Updated)", price: 349000, isActive: true }
          }),
          req({
            name: "Delete Plan",
            method: "DELETE",
            path: "/admin/plans/{{planId}}",
            auth: "bearer",
            description: "Admin only — delete a plan.",
            pathVars: ["planId"]
          })
        ]),
        folder("Licenses (Admin)", [
          req({
            name: "List All Licenses",
            method: "GET",
            path: "/admin/licenses",
            auth: "bearer",
            description: "Admin only — list all licenses with user/plan info."
          }),
          req({
            name: "Get License",
            method: "GET",
            path: "/admin/licenses/{{adminLicenseId}}",
            auth: "bearer",
            description: "Admin only — get a specific license.",
            pathVars: ["adminLicenseId"]
          }),
          req({
            name: "Update License",
            method: "PATCH",
            path: "/admin/licenses/{{adminLicenseId}}",
            auth: "bearer",
            description: "Admin only — update license status or expiry.",
            pathVars: ["adminLicenseId"],
            body: { status: "ACTIVE", expiresAt: "2026-12-31T23:59:59.000Z" }
          }),
          req({
            name: "Delete License",
            method: "DELETE",
            path: "/admin/licenses/{{adminLicenseId}}",
            auth: "bearer",
            description: "Admin only — revoke/delete a license.",
            pathVars: ["adminLicenseId"]
          })
        ]),
        folder("Transactions (Admin)", [
          req({
            name: "List Transactions",
            method: "GET",
            path: "/admin/transactions",
            auth: "bearer",
            description: "Admin only — list all transactions/orders."
          }),
          req({
            name: "Get Transaction",
            method: "GET",
            path: "/admin/transactions/{{transactionId}}",
            auth: "bearer",
            description: "Admin only — get a specific transaction.",
            pathVars: ["transactionId"]
          }),
          req({
            name: "Update Transaction",
            method: "PATCH",
            path: "/admin/transactions/{{transactionId}}",
            auth: "bearer",
            description:
              "Admin only — confirm/reject a transaction. Setting status to COMPLETED will auto-generate a license key.",
            pathVars: ["transactionId"],
            body: { status: "COMPLETED", note: "Payment confirmed via bank transfer" }
          })
        ]),
        folder("Analytics", [
          req({
            name: "Get Analytics",
            method: "GET",
            path: "/admin/analytics",
            auth: "bearer",
            description: "Admin only — revenue, user stats, license counts."
          })
        ])
      ],
      "Admin-only endpoints — require admin role."
    )
  ]
};

const output = JSON.stringify(collection, null, 2);
writeFileSync("postman-collection.json", output, "utf8");
console.log(`✅ postman-collection.json generated (${(output.length / 1024).toFixed(1)} KB)`);
console.log("📌 Import into Postman: File → Import → select postman-collection.json");
console.log("🔧 Set BASE_URL variable to your server URL (default: http://localhost:3000/api)");
