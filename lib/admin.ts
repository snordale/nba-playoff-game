import { auth } from "@/auth";

/**
 * Admin email(s) from env. Supports ADMIN_EMAIL (single) or ADMIN_EMAILS (comma-separated).
 * No secrets; used only for authorization checks.
 */
function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return emails
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Returns the current session if the user is an admin (email in ADMIN_EMAIL/ADMIN_EMAILS).
 * Returns null if not authenticated or not an admin. Use in admin API routes and return 403 when null.
 */
export async function getAdminSession() {
  const session = await auth();
  if (!session?.user?.email) return null;
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0 || !adminEmails.includes(session.user.email)) return null;
  return session;
}
