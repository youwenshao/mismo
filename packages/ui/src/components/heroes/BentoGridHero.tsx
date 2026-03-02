import React from 'react'
import { cn } from '../../utils'

export const BentoGridHero = ({ className }: { className?: string }) => {
  return (
    <section className={cn('py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto', className)}>
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold tracking-tight mb-6">The suite that works for you.</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover the power of integrated tools designed to elevate your workflow and maximize
          productivity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto auto-rows-[250px]">
        <div className="md:col-span-2 bg-muted rounded-3xl p-8 flex flex-col justify-end overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-2xl font-bold mb-2 z-10">Advanced Analytics</h3>
          <p className="text-muted-foreground z-10">Real-time insights at your fingertips.</p>
        </div>
        <div className="bg-primary text-primary-foreground rounded-3xl p-8 flex flex-col justify-end">
          <h3 className="text-2xl font-bold mb-2">Fast</h3>
          <p className="text-primary-foreground/80">Built for speed.</p>
        </div>
        <div className="bg-secondary rounded-3xl p-8 flex flex-col justify-end">
          <h3 className="text-2xl font-bold mb-2">Secure</h3>
          <p className="text-muted-foreground">Enterprise-grade security.</p>
        </div>
        <div className="md:col-span-2 bg-muted rounded-3xl p-8 flex flex-col justify-end relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 w-1/2 h-full flex flex-col gap-2 opacity-50">
            <div className="h-2 w-full bg-background rounded-full" />
            <div className="h-2 w-5/6 bg-background rounded-full" />
            <div className="h-2 w-4/6 bg-background rounded-full" />
          </div>
          <h3 className="text-2xl font-bold mb-2 z-10">Seamless Integration</h3>
          <p className="text-muted-foreground z-10">Connects with everything.</p>
        </div>
      </div>
    </section>
  )
}
