import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** POST /api/auth/logout — Signs out the current Supabase session and clears cookies. */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
