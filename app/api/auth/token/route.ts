import { db } from "@/lib/db";
import { signElectronToken } from "@/lib/electron-jwt";
import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";

interface LoginBody {
  email: string;
  password: string;
}

/**
 * POST /api/auth/token
 * Electron-only login endpoint. Returns a JWT Bearer token (not a NextAuth session).
 * Used by the desktop app to authenticate before accessing /api/plans, /api/orders, etc.
 */
export async function POST(req: NextRequest) {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true, isActive: true, deletedAt: true }
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if (!user.isActive || user.deletedAt) {
    return NextResponse.json({ error: "Account is disabled." }, { status: 403 });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = await signElectronToken(user.id, user.email);

  return NextResponse.json({
    token,
    userId: user.id,
    email: user.email,
    name: user.name,
    expiresIn: 30 * 24 * 60 * 60 // 30 days in seconds
  });
}
