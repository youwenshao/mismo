'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { label: 'Overview', href: '/', section: 'main' },
  { label: 'Fleet Status', href: '/fleet', section: 'mission' },
  { label: 'Commissions', href: '/commissions', section: 'mission' },
  { label: 'Agents', href: '/agents', section: 'mission' },
  { label: 'Financials', href: '/financials', section: 'mission' },
  { label: 'Alerts', href: '/alerts', section: 'mission' },
  { label: 'Projects', href: '/projects', section: 'main' },
  { label: 'Settings', href: '/settings', section: 'main' },
]

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = 'http://localhost:3000'
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 border-r border-gray-200 bg-white flex flex-col">
      <div className="px-4 pt-6">
        <span className="text-lg font-semibold">Mismo</span>
        <span className="block text-xs text-gray-400">Internal</span>
      </div>

      <nav className="mt-8 flex-1">
        <Link
          href="/"
          className={`block py-2 px-4 text-sm transition-colors ${
            isActive('/') && pathname === '/'
              ? 'text-black font-medium border-l-2 border-black'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </Link>

        <p className="px-4 pt-6 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-300">
          Mission Control
        </p>
        {nav
          .filter((i) => i.section === 'mission')
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block py-2 px-4 text-sm transition-colors ${
                isActive(item.href)
                  ? 'text-black font-medium border-l-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.label}
            </Link>
          ))}

        <p className="px-4 pt-6 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-300">
          Workspace
        </p>
        {nav
          .filter((i) => i.section === 'main' && i.href !== '/')
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block py-2 px-4 text-sm transition-colors ${
                isActive(item.href)
                  ? 'text-black font-medium border-l-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
      </nav>

      <div className="px-4 pb-6">
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
