import { getAdminSession } from "@/lib/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/me — Returns 200 if the current user is an admin, 403 otherwise.
 * Used by the admin page for client-side redirect without exposing admin email(s).
 */
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
