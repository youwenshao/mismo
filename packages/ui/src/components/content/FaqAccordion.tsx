import React, { useState } from 'react'
import { cn } from '../../utils'

export const FaqAccordion = ({ className }: { className?: string }) => {
  const faqs = [
    {
      q: 'How do I get started?',
      a: "Simply sign up for an account and follow our quick-start guide. You'll be up and running in less than 5 minutes.",
    },
    {
      q: 'Can I cancel my subscription?',
      a: "Yes, you can cancel your subscription at any time from your account settings. You'll retain access until the end of your billing period.",
    },
    {
      q: 'Do you offer custom enterprise plans?',
      a: 'We do. If you have a large team or specific compliance requirements, please contact our sales team for a custom quote.',
    },
    {
      q: 'Is there a free trial available?',
      a: 'All paid plans come with a 14-day free trial. No credit card is required to start your trial.',
    },
  ]

  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className={cn('py-24 px-4 max-w-3xl mx-auto', className)}>
      <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="border rounded-xl overflow-hidden bg-card">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <span className="font-medium text-lg">{faq.q}</span>
              <svg
                className={cn(
                  'w-5 h-5 transition-transform duration-200',
                  openIndex === i && 'rotate-180',
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              className={cn(
                'grid transition-all duration-200 ease-in-out',
                openIndex === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <p className="p-6 pt-0 text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
