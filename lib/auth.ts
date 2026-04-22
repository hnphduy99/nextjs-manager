import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";

// ─── Session helpers ──────────────────────────────────────────────────────────

/** Get the current server session. Returns null if unauthenticated. */
export function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/** Get session and throw if unauthenticated (use in protected Server Components). */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

// ─── Permission helpers ───────────────────────────────────────────────────────

/**
 * Check if a session has a specific permission.
 * Superadmin (manage:all) bypasses all checks.
 *
 * @example
 * const session = await getSession()
 * if (!hasPermission(session, "license", "revoke")) redirect("/403")
 */
export function hasPermission(session: Session | null, subject: string, action: string): boolean {
  if (!session) return false;
  const perms = session.user.permissions ?? [];
  return perms.includes("manage:all") || perms.includes(`${action}:${subject}`);
}

/**
 * Check if a session has a specific role.
 * @example
 * if (hasRole(session, "admin")) { ... }
 */
export function hasRole(session: Session | null, role: string): boolean {
  if (!session) return false;
  return session.user.roles?.includes(role) ?? false;
}

/**
 * Assert permission — throws if the session doesn't have the required permission.
 * Use in Server Actions or API routes that need fine-grained access control.
 *
 * @example
 * await assertPermission(session, "transaction", "confirm")
 */
export function assertPermission(session: Session | null, subject: string, action: string): void {
  if (!hasPermission(session, subject, action)) {
    throw new Error(`Forbidden: missing ${action}:${subject} permission`);
  }
}
