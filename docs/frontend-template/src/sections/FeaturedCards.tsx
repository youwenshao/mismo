import { useEffect, useRef, useState } from 'react'

export default function FeaturedCards() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="px-4 md:px-8 lg:px-12 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large Featured Card */}
          <div
            className={`lg:col-span-2 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <a href="#" className="block group">
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 md:w-48 md:h-48 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-16 h-16 md:w-24 md:h-24 text-white"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                        fill="white"
                        stroke="none"
                      />
                      <circle cx="12" cy="12" r="10" stroke="white" fill="none" />
                      <path
                        d="M8 12l3 3 5-6"
                        stroke="white"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Introducing the Codex app
                </h2>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>Product</span>
                  <span>•</span>
                  <span>7 min read</span>
                </div>
              </div>
            </a>
          </div>

          {/* Right Column Cards */}
          <div className="space-y-6">
            {/* GPT-5.3-Codex Card */}
            <a
              href="#"
              className={`block group transition-all duration-700 delay-100 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div
                className="relative aspect-[16/9] rounded-xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl md:text-3xl font-bold text-white">GPT-5.3-Codex</span>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Introducing GPT-5.3-Codex
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>Product</span>
                  <span>•</span>
                  <span>10 min read</span>
                </div>
              </div>
            </a>

            {/* OpenAI Frontier Card */}
            <a
              href="#"
              className={`block group transition-all duration-700 delay-200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div
                className="relative aspect-[16/9] rounded-xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl md:text-3xl font-bold text-white">OpenAI Frontier</span>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Introducing OpenAI Frontier
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>Product</span>
                  <span>•</span>
                  <span>8 min read</span>
                </div>
              </div>
            </a>

            {/* Prism Card */}
            <a
              href="#"
              className={`block group transition-all duration-700 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gradient-to-br from-blue-300 to-cyan-400">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-10 h-10 text-white"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <polygon
                        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                        fill="white"
                        stroke="none"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-70 transition-opacity">
                  Introducing Prism
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <span>Product</span>
                  <span>•</span>
                  <span>5 min read</span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
