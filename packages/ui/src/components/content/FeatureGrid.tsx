import React from 'react'
import { cn } from '../../utils'

export const FeatureGrid = ({ className }: { className?: string }) => {
  const features = [
    { title: 'Lightning Fast', desc: 'Optimized for speed and performance.' },
    { title: 'Fully Secure', desc: 'Enterprise-grade security built-in.' },
    { title: 'Scalable', desc: 'Grows with your business needs.' },
    { title: 'Customizable', desc: 'Make it yours with easy theming.' },
    { title: 'Analytics', desc: 'Detailed insights and reporting.' },
    { title: 'Support', desc: '24/7 dedicated customer support.' },
  ]

  return (
    <section className={cn('py-24 px-4', className)}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our platform provides all the tools necessary to build, deploy, and scale your
            applications faster than ever before.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-2xl border bg-card text-card-foreground">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
