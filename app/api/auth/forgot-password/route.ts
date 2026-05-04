import { createAdminClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/forgot-password
 * Sends a Supabase password reset email.
 * Always returns 200 (security: don't reveal whether email exists).
 */
export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = (await req.json()) as { email: string });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Generate reset link via Supabase (only sends if user exists in Supabase Auth)
  await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`
    }
  });

  // Always return 200 to avoid email enumeration
  return NextResponse.json({ ok: true });
}
