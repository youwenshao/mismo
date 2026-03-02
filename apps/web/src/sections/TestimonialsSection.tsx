'use client'

import { useEffect, useRef, useState } from 'react'

const testimonials = [
  {
    id: '1',
    quote:
      'I described my idea in a 15-minute call with Mo. Two weeks later I had a fully working product with Stripe integration.',
    name: 'Sarah Chen',
    role: 'Founder, PetMatch',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: '2',
    quote:
      'The Verified tier gave us enterprise-grade code quality. Our security audit passed on the first try.',
    name: 'James Rodriguez',
    role: 'CTO, HealthBridge',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  },
  {
    id: '3',
    quote:
      "As a non-technical founder, Mismo is exactly what I needed. Mo understood my vision better than any freelancer I've hired.",
    name: 'Aisha Patel',
    role: 'CEO, LearnLoop',
    gradient: 'linear-gradient(135deg, #34d399 0%, #06b6d4 100%)',
  },
]

export default function TestimonialsSection() {
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
    <section ref={sectionRef} id="testimonials" className="px-4 md:px-8 lg:px-12 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900">What founders are saying</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <div
              key={t.id}
              className={`block group transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div
                className="relative aspect-[4/3] rounded-xl overflow-hidden flex items-center justify-center p-8"
                style={{ background: t.gradient }}
              >
                <p className="text-white text-base font-medium leading-relaxed text-center">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div className="mt-4">
                <h3 className="text-base font-medium text-gray-900">{t.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
