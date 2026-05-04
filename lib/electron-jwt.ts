import { jwtVerify } from "jose";

/**
 * Electron app JWT auth — uses `jose` (edge-compatible, no Node.js crypto required).
 * These tokens are separate from NextAuth sessions and used exclusively by the Electron client.
 */

function getSecret(): Uint8Array {
  const secret = process.env.ELECTRON_JWT_SECRET;
  if (!secret) throw new Error("ELECTRON_JWT_SECRET env variable is not set.");
  return new TextEncoder().encode(secret);
}

export interface ElectronTokenPayload {
  sub: string; // userId
  email: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

/** Verify and decode an Electron JWT. Returns null if invalid or expired. */
export async function verifyElectronToken(token: string): Promise<ElectronTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as ElectronTokenPayload;
  } catch {
    return null;
  }
}

/** Extract Electron JWT from Authorization header. Returns null if missing/invalid. */
export async function extractElectronToken(authHeader: string | null): Promise<ElectronTokenPayload | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyElectronToken(authHeader.slice(7));
}

/** Helper for API routes — returns 401 Response if token is missing or invalid */
export async function requireElectronAuth(
  authHeader: string | null
): Promise<{ payload: ElectronTokenPayload; error: null } | { payload: null; error: Response }> {
  const payload = await extractElectronToken(authHeader);
  if (!payload) {
    return {
      payload: null,
      error: Response.json({ error: "Unauthorized. Valid Bearer token required." }, { status: 401 })
    };
  }
  return { payload, error: null };
}
