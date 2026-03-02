interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navLinks = [
    { label: 'Research', href: '#research' },
    { label: 'Safety', href: '#safety' },
    { label: 'For Business', href: '#business' },
    { label: 'For Developers', href: '#developers' },
    { label: 'ChatGPT', href: '#chatgpt' },
    { label: 'Sora', href: '#sora' },
    { label: 'Codex', href: '#codex' },
    { label: 'Stories', href: '#stories' },
    { label: 'Company', href: '#company' },
    { label: 'News', href: '#news' },
  ]

  return (
    <>
      {/* Overlay - visible when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[45] transition-opacity duration-300"
          onClick={(e) => {
            // Only close if clicking directly on the overlay, not on the sidebar
            if (e.target === e.currentTarget) {
              onClose()
            }
          }}
        />
      )}

      {/* Sidebar */}
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
