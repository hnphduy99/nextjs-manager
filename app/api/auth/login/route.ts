import { db } from "@/lib/db";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";

interface LoginBody {
  email: string;
  password: string;
}

/**
 * POST /api/auth/login
 * Custom login for Web Manager.
 *
 * Flow:
 *  1. Verify password against Prisma DB (source of truth / bcrypt)
 *  2. Sync user into Supabase Auth by email (create on first login, update password on subsequent)
 *  3. supabase.auth.signInWithPassword() → sets session cookies automatically
 *
 * Note: Supabase user UUID ≠ Prisma CUID. Email is the stable bridge between both systems.
 * lib/auth.ts resolves Prisma user by email from the Supabase session.
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

  // Step 1: Verify credentials against Prisma (bcrypt)
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

  // Step 2: Sync user into Supabase Auth (no UUID — let Supabase generate its own)
  const adminClient = createAdminClient();

  const { error: createError } = await adminClient.auth.admin.createUser({
    email: user.email,
    password, // Supabase hashes this internally
    email_confirm: true,
    user_metadata: { name: user.name }
  });

  if (createError) {
    if (!createError.message.toLowerCase().includes("already been registered")) {
      console.error("[login] Supabase createUser error:", createError.message);
      return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }

    // User already exists in Supabase — update their password to stay in sync
    const { data: list } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const supabaseUser = list?.users.find((u) => u.email === user.email);

    if (supabaseUser) {
      await adminClient.auth.admin.updateUserById(supabaseUser.id, { password });
    }
  }

  // Step 3: Sign in → sets Supabase session cookies on the response
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("[login] Supabase signInWithPassword error:", signInError.message);
    return NextResponse.json({ error: "Could not create session." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
