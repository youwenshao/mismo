import * as React from 'react'
import { cn } from './utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full rounded-[2px] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 font-sans text-base text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] transition-colors duration-150 ease-out focus:border-[var(--accent)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
