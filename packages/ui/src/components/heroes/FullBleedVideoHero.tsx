import React from 'react'
import { cn } from '../../utils'

export const FullBleedVideoHero = ({ className }: { className?: string }) => {
  return (
    <section
      className={cn(
        'relative h-screen w-full overflow-hidden flex items-center justify-center',
        className,
      )}
    >
      <div className="absolute inset-0 bg-black/40 z-10" />
      {/* Fallback gradient if no video */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900" />

      {/* Actual video would go here */}
      {/* <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
        <source src="/path/to/video.mp4" type="video/mp4" />
      </video> */}

      <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8">
          Cinematic Experience
        </h1>
        <p className="text-xl md:text-2xl font-light text-white/80 mb-12 max-w-2xl">
          Immerse your users in a visual journey that captures attention from the very first frame.
        </p>
        <button className="bg-white text-black px-10 py-4 rounded-full font-semibold text-lg hover:bg-white/90 transition-colors">
          Watch Reel
        </button>
      </div>
    </section>
  )
}
