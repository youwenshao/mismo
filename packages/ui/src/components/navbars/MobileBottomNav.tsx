import React from 'react'
import { cn } from '../../utils'

export const MobileBottomNav = ({ className }: { className?: string }) => {
  return (
    <nav
      className={cn(
        'fixed bottom-0 w-full z-50 border-t bg-background pb-safe sm:hidden',
        className,
      )}
    >
      <div className="flex h-16 items-center justify-around">
        <a
          href="#"
          className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary"
        >
          <div className="w-6 h-6 rounded bg-current mb-1 opacity-80" />
          <span className="text-[10px] font-medium">Home</span>
        </a>
        <a
          href="#"
          className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary"
        >
          <div className="w-6 h-6 rounded bg-current mb-1 opacity-80" />
          <span className="text-[10px] font-medium">Search</span>
        </a>
        <a
          href="#"
          className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary"
        >
          <div className="w-6 h-6 rounded bg-current mb-1 opacity-80" />
          <span className="text-[10px] font-medium">Profile</span>
        </a>
      </div>
    </nav>
  )
}
