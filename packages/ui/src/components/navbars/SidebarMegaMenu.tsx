import React from 'react'
import { cn } from '../../utils'

export const SidebarMegaMenu = ({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) => {
  return (
    <div className={cn('flex h-screen w-64 flex-col border-r bg-muted/40', className)}>
      <div className="p-6 font-semibold">Workspace</div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          {children || (
            <a
              href="#"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              Item 1
            </a>
          )}
        </nav>
      </div>
    </div>
  )
}
