import React, { useState, useEffect } from 'react'
import { cn } from '../../utils'

export const CommandPaletteNav = ({ className }: { className?: string }) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return (
    <>
      <nav className={cn('flex items-center justify-between p-4 border-b', className)}>
        <div className="font-bold">App</div>
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md flex items-center gap-2"
        >
          Search...{' '}
          <kbd className="font-mono text-[10px] bg-background px-1 rounded border">⌘K</kbd>
        </button>
      </nav>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder="Type a command or search..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
            <div className="text-sm text-muted-foreground mt-4">No results found.</div>
          </div>
        </div>
      )}
    </>
  )
}
