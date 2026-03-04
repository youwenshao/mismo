import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'

const envPath = resolve(__dirname, '../../../.env')
dotenvConfig({ path: envPath })

console.log('[farm-monitor] Environment loaded from:', envPath)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('[farm-monitor] WARNING: NEXT_PUBLIC_SUPABASE_URL is not set in environment')
}
