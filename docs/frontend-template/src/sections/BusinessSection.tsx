import { useEffect, useRef, useState } from 'react'

interface BusinessItem {
  id: string
  title: string
  category: string
  image: string
  gradient?: string
  logo?: string
}

const businessItems: BusinessItem[] = [
  {
    id: '1',
    title: 'Taisei Corporation shapes the next generation of talent with ChatGPT',
    category: 'ChatGPT',
    image: '/images/business1.jpg',
    gradient: 'linear-gradient(135deg, #9ca3af 0%, #4b5563 100%)',
    logo: 'TAISEI',
  },
  {
    id: '2',
    title: 'Powering tax donations with AI powered personalized recommendations',
    category: 'API',
    image: '/images/business2.jpg',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #be185d 100%)',
    logo: 'TRUST BANK',
  },
  {
    id: '3',
    title: 'How Higgsfield turns simple ideas into cinematic social videos',
    category: 'API',
    image: '/images/business3.jpg',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)',
    logo: 'Higgsfield',
  },
]

export default function BusinessSection() {
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
    <section ref={sectionRef} className="px-4 md:px-8 lg:px-12 py-12" id="business">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Mismo for business</h2>
          <a href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            View all
          </a>
        </div>

        {/* Business Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {businessItems.map((item, index) => (
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
                <div className="absolute inset-0 flex items-center justify-center">
                  {item.id === '1' && (
                    <div className="text-center">
                      <svg viewBox="0 0 120 80" fill="none" className="w-24 h-16 mx-auto">
                        <path
                          d="M60 10L20 30v20l40 20 40-20V30L60 10z"
                          fill="white"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <path
                          d="M60 25L35 37.5v10L60 55l25-7.5v-10L60 25z"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                        />
                        <circle cx="60" cy="42" r="8" fill="white" />
                      </svg>
                      <div className="text-white text-lg font-bold mt-2 tracking-wider">TAISEI</div>
                    </div>
                  )}
                  {item.id === '2' && (
                    <div className="text-center">
                      <div className="w-16 h-16 border-2 border-white rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <div className="w-10 h-10 border-2 border-white rounded-sm" />
                      </div>
                      <div className="text-white text-lg font-bold tracking-wider">TRUST BANK</div>
                    </div>
                  )}
                  {item.id === '3' && (
                    <div className="text-center">
                      <div className="text-white text-2xl font-bold mb-1">
                        <span className="inline-block transform -rotate-12">H</span>
                        <span className="inline-block transform rotate-12">i</span>
                        <span className="inline-block transform -rotate-6">g</span>
                        <span className="inline-block transform rotate-6">g</span>
                        <span className="inline-block transform -rotate-12">s</span>
                        <span className="inline-block transform rotate-12">f</span>
                        <span className="inline-block transform -rotate-6">i</span>
                        <span className="inline-block transform rotate-6">e</span>
                        <span className="inline-block transform -rotate-12">l</span>
                        <span className="inline-block transform rotate-12">d</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-base font-medium text-gray-900 group-hover:opacity-70 transition-opacity line-clamp-2">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>{item.category}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
