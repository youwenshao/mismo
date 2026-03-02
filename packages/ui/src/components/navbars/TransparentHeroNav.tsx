import React from 'react'
import { cn } from '../../utils'

export const TransparentHeroNav = ({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) => {
  return (
    <nav
      className={cn(
        'absolute top-0 w-full z-50 flex items-center justify-between p-6 text-white',
        className,
      )}
    >
      <div className="font-bold text-xl">Brand</div>
      <div className="flex gap-6 font-medium">
        {children || (
          <>
            <a href="#" className="hover:opacity-80">
              Work
            </a>
            <a href="#" className="hover:opacity-80">
              Studio
            </a>
            <a href="#" className="hover:opacity-80">
              Contact
            </a>
          </>
        )}
      </div>
    </nav>
  )
}
