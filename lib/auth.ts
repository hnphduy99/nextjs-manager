import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { forbidden } from "next/navigation";
import "server-only";

export interface AppSession {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    roles: string[];
    permissions: string[];
  };
}

/** Get the current server session with roles & permissions. Returns null if unauthenticated. */
export async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Link by email (Supabase UUID ≠ Prisma CUID — email is the stable bridge)
  const dbUser = await db.user.findUnique({
    where: { email: user.email!, isActive: true, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
              permissions: {
                select: { permission: { select: { action: true, subject: true } } }
              }
            }
          }
        }
      }
    }
  });

  if (!dbUser) return null;

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      image: dbUser.image,
      roles: dbUser.roles.map((ur) => ur.role.name),
      permissions: dbUser.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => `${rp.permission.action}:${rp.permission.subject}`)
      )
    }
  };
}

/** Get session and throw if unauthenticated (use in protected Server Components). */
export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/**
 * Check if a session has a specific permission.
 * Superadmin (manage:all) bypasses all checks.
 */
export function hasPermission(session: AppSession | null, subject: string, action: string): boolean {
  if (!session) return false;
  const perms = session.user.permissions ?? [];
  return perms.includes("manage:all") || perms.includes(`${action}:${subject}`);
}

/** Check if a session has a specific role. */
export function hasRole(session: AppSession | null, role: string): boolean {
  if (!session) return false;
  return session.user.roles?.includes(role) ?? false;
}

/** Assert permission — calls Next.js forbidden() → renders app/forbidden.tsx with HTTP 403. */
export function assertPermission(session: AppSession | null, subject: string, action: string): void {
  if (!hasPermission(session, subject, action)) {
    forbidden();
  }
}
