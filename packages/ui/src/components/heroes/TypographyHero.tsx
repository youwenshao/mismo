import React from 'react'
import { cn } from '../../utils'

export const TypographyHero = ({ className }: { className?: string }) => {
  return (
    <section
      className={cn(
        'min-h-[80vh] flex flex-col justify-center px-4 sm:px-8 md:px-16 lg:px-24',
        className,
      )}
    >
      <div className="max-w-5xl">
        <p className="text-sm font-mono tracking-widest text-muted-foreground mb-8 uppercase">
          Issue No. 042 — The Editorial Edit
        </p>
        <h1 className="text-6xl md:text-8xl lg:text-[120px] font-serif leading-[0.9] tracking-tighter mb-12">
          Design <br />
          <span className="italic font-light text-muted-foreground">without</span> <br />
          Compromise.
        </h1>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 border-t pt-8">
          <p className="text-lg md:text-xl leading-relaxed text-muted-foreground font-serif">
            We believe that every pixel matters. In a world of templates and generic solutions, we
            stand for bespoke craftsmanship that elevates your brand identity to new heights.
          </p>
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm uppercase tracking-widest font-mono">Read the manifesto</p>
            <button className="text-lg border-b border-black pb-1 hover:text-muted-foreground hover:border-muted-foreground transition-colors dark:border-white">
              Explore Our Vision →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
