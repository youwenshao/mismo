import React from 'react'
import { cn } from '../../utils'

export const TestimonialCarousel = ({ className }: { className?: string }) => {
  return (
    <section className={cn('py-24 overflow-hidden bg-muted/30', className)}>
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Loved by thousands</h2>

        {/* Simple CSS-only infinite scroll simulation for the placeholder */}
        <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="min-w-[300px] md:min-w-[400px] flex-shrink-0 snap-center p-8 rounded-2xl bg-background border shadow-sm"
            >
              <div className="flex text-yellow-400 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s}>★</span>
                ))}
              </div>
              <p className="text-lg mb-6">
                "This product has completely transformed how our team works. The efficiency gains
                are truly remarkable and the interface is a joy to use."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div>
                  <div className="font-semibold">Jane Doe</div>
                  <div className="text-sm text-muted-foreground">Product Manager, TechCo</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
