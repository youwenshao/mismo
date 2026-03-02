'use client'

import { useIsMobile } from '@/hooks/use-mobile'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Mo', href: '/chat' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'About', href: '#about' },
  { label: 'Support', href: '#support' },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const isMobile = useIsMobile()

  return (
    <>
      {/* Overlay -- mobile only */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/20 z-[45] transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose()
            }
          }}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 pt-20 pb-8 px-6 overflow-y-auto`}
      >
        <nav className="space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="sidebar-link block py-2 text-sm font-medium text-gray-900"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  )
}
