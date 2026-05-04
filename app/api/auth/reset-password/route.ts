import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/reset-password
 * Resets the user's password using the Supabase session established from the recovery link.
 * The client must first exchange the recovery token (via update-password page callback) before calling this.
 */
export async function POST(req: NextRequest) {
  let password: string;
  try {
    ({ password } = (await req.json()) as { password: string });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized. Please use a valid reset link." }, { status: 401 });
  }

  // Update password in both Supabase Auth and Prisma DB
  const [supabaseResult] = await Promise.all([
    supabase.auth.updateUser({ password }),
    bcrypt.hash(password, 12).then((hash) => db.user.update({ where: { id: user.id }, data: { passwordHash: hash } }))
  ]);

  if (supabaseResult.error) {
    console.error("Supabase updateUser error:", supabaseResult.error);
    return NextResponse.json({ error: "Could not update password." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
