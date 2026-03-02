import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import { UserMenu } from '@/components/UserMenu'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/auth')

  return (
    <div className="min-h-screen bg-white">
      <header
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-md"
        style={{
          maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
        }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Mismo
          </Link>
          <UserMenu userId={user.id} />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  )
}
