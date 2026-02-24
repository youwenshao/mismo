import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const badgeVariants = cva(
  'inline-flex items-center font-sans text-xs transition-colors',
  {
    variants: {
      variant: {
        default: 'text-[var(--text-secondary)] font-normal',
        accent: 'text-[var(--accent)] font-medium',
        active: 'text-[var(--dash-active,var(--accent))] font-medium',
        complete: 'text-[var(--dash-complete,var(--text-primary))] font-medium',
        pending: 'text-[var(--dash-pending,#737373)] font-normal',
        warning: 'text-[var(--dash-warning,#92400E)] font-medium',
        critical: 'text-[var(--dash-critical,#7F1D1D)] font-semibold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
