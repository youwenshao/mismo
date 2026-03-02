import { useEffect, useRef, useState } from 'react'

interface ResearchItem {
  id: string
  title: string
  category: string
  date: string
  image: string
  gradient?: string
  icon?: React.ReactNode
}

const researchItems: ResearchItem[] = [
  {
    id: '1',
    title: 'Evaluating chain-of-thought monitorability',
    category: 'Research',
    date: 'Dec 18, 2025',
    image: '/images/research1.jpg',
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
  },
  {
    id: '2',
    title: "Evaluating AI's ability to perform scientific research tasks",
    category: 'Research',
    date: 'Dec 16, 2025',
    image: '/images/research2.jpg',
    gradient: 'linear-gradient(135deg, #86efac 0%, #d9f99d 100%)',
  },
  {
    id: '3',
    title: "Measuring AI's capability to accelerate biological research",
    category: 'Research',
    date: 'Dec 16, 2025',
    image: '/images/research3.jpg',
    gradient: 'linear-gradient(135deg, #fed7aa 0%, #fbcfe8 100%)',
  },
]

export default function LatestResearch() {
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
    <section ref={sectionRef} className="px-4 md:px-8 lg:px-12 py-12" id="research">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Latest research</h2>
          <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            View all
          </a>
        </div>

        {/* Research Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {researchItems.map((item, index) => (
            <a
              key={item.id}
              href="#"
              className={`block group transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div
                className="relative aspect-[4/3] rounded-xl overflow-hidden"
                style={{ background: item.gradient }}
              >
                {item.id === '1' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 200 120" fill="none" className="w-32 h-20">
                      <rect
                        x="20"
                        y="20"
                        width="160"
                        height="20"
                        rx="10"
                        fill="white"
                        stroke="#1e40af"
                        strokeWidth="2"
                      />
                      <rect
                        x="20"
                        y="50"
                        width="120"
                        height="20"
                        rx="10"
                        fill="white"
                        stroke="#1e40af"
                        strokeWidth="2"
                      />
                      <rect
                        x="20"
                        y="80"
                        width="140"
                        height="20"
                        rx="10"
                        fill="white"
                        stroke="#1e40af"
                        strokeWidth="2"
                      />
                      <circle
                        cx="170"
                        cy="60"
                        r="15"
                        fill="white"
                        stroke="#1e40af"
                        strokeWidth="2"
                      />
                      <path
                        d="M165 60l5 5 10-10"
                        stroke="#1e40af"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                )}
                {item.id === '2' && (
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="text-center">
                      <div className="text-6xl font-black text-black/20 mb-2">Fr</div>
                      <div className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded inline-block mb-2">
                        AI for Science
                      </div>
                      <div className="text-xs text-gray-600 text-left space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>accuracy of the question and the solution.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Factual</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Gradable</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>Objective</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {item.id === '3' && (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="w-full">
                      <div className="flex justify-between items-end mb-2">
                        <div className="text-xs text-gray-500">POLYMERASE</div>
                        <div className="flex gap-1">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-black" />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-end mb-2">
                        <div className="text-xs text-gray-500">POLYMERASE</div>
                        <div className="flex gap-1">
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-black" />
                          ))}
                          <div className="w-2 h-2 rounded-full border-2 border-black" />
                          <div className="w-2 h-2 rounded-full border-2 border-black" />
                        </div>
                      </div>
                      <div className="flex justify-between items-end mb-2">
                        <div className="text-xs text-gray-500">LIGASE</div>
                        <div className="flex gap-1">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-black" />
                          ))}
                          <div className="w-2 h-2 rounded-full border-2 border-black" />
                          <div className="w-2 h-2 rounded-full border-2 border-black" />
                          <div className="w-2 h-2 rounded-full border-2 border-black" />
                          <div className="w-2 h-2 rounded-full border-2 border-black" />
                        </div>
                      </div>
                      <div className="text-4xl font-black text-black/80 mt-4">Bio</div>
                      <div className="text-4xl font-black text-black/80">Research</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-base font-medium text-gray-900 group-hover:opacity-70 transition-opacity line-clamp-2">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>{item.category}</span>
                  <span>•</span>
                  <span>{item.date}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
