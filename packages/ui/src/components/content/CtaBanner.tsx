import React from 'react'
import { cn } from '../../utils'

export const CtaBanner = ({ className }: { className?: string }) => {
  return (
    <section className={cn('py-24 px-4', className)}>
      <div className="max-w-5xl mx-auto bg-primary text-primary-foreground rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-64 h-64 bg-black/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-2xl">
            Ready to transform your workflow?
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-xl">
            Join thousands of teams who have already upgraded their productivity. Start your free
            trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <button className="bg-background text-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-background/90 transition-colors shadow-lg">
              Start Free Trial
            </button>
            <button className="px-8 py-4 rounded-full font-semibold text-lg border border-primary-foreground/30 hover:bg-primary-foreground/10 transition-colors">
              Talk to Sales
            </button>
          </div>
          <p className="mt-6 text-sm text-primary-foreground/60">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </div>
    </section>
  )
}
