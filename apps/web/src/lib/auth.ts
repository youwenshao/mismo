import { createClient } from '@/lib/supabase/server'
import { prisma } from '@mismo/db'

export async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Check if an email hash is in the admin whitelist.
 * Sources checked in order: ADMIN_EMAIL_HASHES env var, then SystemConfig DB record.
 */
export function isWhitelistedAdmin(emailHash: string): boolean {
  const envWhitelist = (process.env.ADMIN_EMAIL_HASHES ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)

  return envWhitelist.includes(emailHash.toLowerCase())
}

/**
 * Extended check that also queries the DB SystemConfig table.
 * Use this in non-hot-path contexts (callback, settings) where a DB call is acceptable.
 */
export async function isWhitelistedAdminWithDb(emailHash: string): Promise<boolean> {
  if (isWhitelistedAdmin(emailHash)) return true

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'admin.emailHashes' },
    })
    if (config?.value) {
      const hashes = (config.value as string[]).map((h: string) => h.toLowerCase())
      return hashes.includes(emailHash.toLowerCase())
    }
  } catch {
    // DB not available, fall back to env-only check
  }

  return false
}

export async function getSessionUser() {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'
  ) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseAuthId: '9b7acb0c-5947-4451-bd31-2f44284623f2' },
    })
    return dbUser
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
  })

  return dbUser
}
