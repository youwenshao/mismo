import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-sans text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'rounded-[4px] bg-[var(--accent)] text-white uppercase tracking-[0.1em] text-[14px] font-medium hover:bg-[var(--accent-hover)] cursor-pointer',
        secondary:
          'rounded-[4px] border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer',
        tertiary:
          'rounded-none bg-transparent text-[var(--accent)] border-b border-[var(--accent)] hover:text-[var(--accent-hover)] hover:border-[var(--accent-hover)] cursor-pointer',
        send:
          'rounded-full bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] cursor-pointer',
      },
      size: {
        default: 'px-6 py-3',
        sm: 'px-4 py-2 text-[13px]',
        lg: 'px-8 py-3.5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
