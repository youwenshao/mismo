import React from 'react'
import { cn } from '../../utils'

export const MinimalStickyNav = ({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) => {
  return (
    <nav
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className,
      )}
    >
      <div className="container flex h-14 items-center">
        {children || <div className="font-bold">Logo</div>}
      </div>
    </nav>
  )
}
