'use client'

import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

const placeholderTexts = [
  'A marketplace for vintage cameras',
  'An AI-powered fitness tracker',
  'A booking platform for local guides',
  'A SaaS dashboard for analytics',
]

const pillButtons = [
  { label: 'Talk to Mo', href: '/chat' },
  { label: 'View Pricing', href: '#pricing' },
  { label: 'How It Works', href: '#how-it-works' },
]

export default function HeroSection() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 pt-4 pb-12">
      <h1 className="text-3xl md:text-4xl font-semibold text-center mb-8">
        What can I help you build?
      </h1>

      <div className="w-full max-w-2xl relative mb-6">
        <div className="relative bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholderTexts[placeholderIndex]}
            className="search-input w-full px-6 py-4 pr-14 text-base bg-transparent rounded-2xl"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
            <ArrowUp size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
        {pillButtons.map((button) => (
          <a
            key={button.label}
            href={button.href}
            className="pill-button px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-full"
          >
            {button.label}
          </a>
        ))}
      </div>
    </section>
  )
}
