import React from 'react'
import { cn } from '../../utils'

export const SplitTextHero = ({ className }: { className?: string }) => {
  return (
    <section className={cn('grid lg:grid-cols-2 min-h-[80vh] items-center', className)}>
      <div className="p-8 lg:p-16 flex flex-col justify-center space-y-8">
        <h1 className="text-5xl font-bold tracking-tight">Build faster with our platform</h1>
        <p className="text-xl text-muted-foreground">
          Everything you need to launch your next great idea. No credit card required.
        </p>
        <div className="flex gap-4">
          <button className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium">
            Get Started
          </button>
          <button className="border px-8 py-3 rounded-md font-medium">Documentation</button>
        </div>
      </div>
      <div className="bg-muted h-full w-full min-h-[400px] flex items-center justify-center p-8">
        <div className="w-full max-w-md aspect-video bg-background rounded-lg shadow-xl border overflow-hidden">
          <div className="h-8 border-b bg-muted/50 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
            <div className="h-32 w-full bg-muted rounded mt-4" />
          </div>
        </div>
      </div>
    </section>
  )
}
