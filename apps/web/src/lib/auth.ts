import { createClient } from "@/lib/supabase/server";
import { prisma } from "@mismo/db";

export async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isWhitelistedAdmin(emailHash: string): boolean {
  const whitelist = (process.env.ADMIN_EMAIL_HASHES ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  return whitelist.includes(emailHash.toLowerCase());
}

export async function getSessionUser() {
  // Development mode: bypass auth if flag is set
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"
  ) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseAuthId: "9b7acb0c-5947-4451-bd31-2f44284623f2" },
    });
    return dbUser;
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
  });

  return dbUser;
}
