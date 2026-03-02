import { useEffect, useRef } from 'react'

interface LoginDropdownProps {
  onClose: () => void
}

export default function LoginDropdown({ onClose }: LoginDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const loginOptions = [
    { label: 'ChatGPT', href: '#' },
    { label: 'API Platform', href: '#' },
    { label: 'Codex', href: '#' },
    { label: 'Sora', href: '#' },
  ]

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
    >
      {loginOptions.map((option) => (
        <a
          key={option.label}
          href={option.href}
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {option.label}
        </a>
      ))}
    </div>
  )
}
