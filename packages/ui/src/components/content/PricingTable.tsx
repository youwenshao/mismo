import React, { useState } from 'react'
import { cn } from '../../utils'

export const PricingTable = ({ className }: { className?: string }) => {
  const [annual, setAnnual] = useState(false)

  return (
    <section className={cn('py-24 px-4', className)}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple, transparent pricing</h2>

          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={cn('text-sm', !annual && 'font-bold')}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className="w-14 h-7 bg-primary rounded-full p-1 transition-colors relative"
            >
              <div
                className={cn(
                  'w-5 h-5 bg-white rounded-full transition-transform duration-300',
                  annual && 'translate-x-7',
                )}
              />
            </button>
            <span className={cn('text-sm flex items-center gap-2', annual && 'font-bold')}>
              Annually{' '}
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="border rounded-3xl p-8 bg-card">
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <p className="text-muted-foreground mb-6">
              Perfect for individuals and small projects.
            </p>
            <div className="text-4xl font-bold mb-8">
              ${annual ? '12' : '15'}
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </div>
            <button className="w-full py-3 px-4 bg-muted hover:bg-muted/80 rounded-lg font-medium mb-8 transition-colors">
              Get Started
            </button>
            <ul className="space-y-4">
              {[
                'Up to 3 projects',
                'Basic analytics',
                '24-hour support response',
                'Custom domains',
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-2 border-primary rounded-3xl p-8 bg-card relative shadow-xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <p className="text-muted-foreground mb-6">For professional teams scaling their work.</p>
            <div className="text-4xl font-bold mb-8">
              ${annual ? '39' : '49'}
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </div>
            <button className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium mb-8 transition-colors">
              Start Free Trial
            </button>
            <ul className="space-y-4">
              {[
                'Unlimited projects',
                'Advanced analytics',
                '1-hour support response',
                'Custom domains',
                'Team collaboration',
                'Priority integrations',
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
