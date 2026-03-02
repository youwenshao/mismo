import { useState } from 'react'
import { Search } from 'lucide-react'
import LoginDropdown from './LoginDropdown'

interface HeaderProps {
  scrolled: boolean
  isSidebarOpen?: boolean
}

export default function Header({ scrolled, isSidebarOpen = true }: HeaderProps) {
  const [showLoginDropdown, setShowLoginDropdown] = useState(false)

  return (
    <header
      className={`fixed top-0 right-0 z-[55] transition-all duration-300 ease-in-out ${
        scrolled ? 'bg-white/90 backdrop-blur-sm' : 'bg-transparent'
      } ${isSidebarOpen ? 'left-64' : 'left-0'}`}
    >
      <div className="flex items-center justify-between px-4 py-3 lg:px-8">
        {/* Logo - shifted right to make room for toggle button */}
        <div className="flex items-center gap-4 pl-10">
          <a href="/" className="flex items-center gap-2">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8"
            >
              <path
                d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 26c-6.627 0-12-5.373-12-12S9.373 4 16 4s12 5.373 12 12-5.373 12-12 12z"
                fill="currentColor"
              />
              <path
                d="M16 8c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 14c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"
                fill="currentColor"
              />
              <circle cx="16" cy="16" r="3" fill="currentColor" />
            </svg>
            <span className="text-xl font-semibold hidden sm:inline">Mismo</span>
          </a>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Search size={20} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowLoginDropdown(!showLoginDropdown)}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              Log in
            </button>
            {showLoginDropdown && <LoginDropdown onClose={() => setShowLoginDropdown(false)} />}
          </div>
        </div>
      </div>
    </header>
  )
}
