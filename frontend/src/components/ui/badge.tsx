import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1',
    'rounded-md border px-2 py-0.5',
    'text-[11px] font-semibold tracking-wide uppercase',
    'transition-colors duration-150',
    '[&>svg]:pointer-events-none [&>svg]:size-3',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/10 text-primary',
        secondary: 'border-border bg-muted text-muted-foreground',
        outline: 'border-border/90 bg-card text-foreground',
        destructive: 'border-destructive/20 bg-destructive/8 text-destructive',
        success: 'border-emerald-600/20 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-600/20 bg-amber-50 text-amber-900',
        info: 'border-sky-600/20 bg-sky-50 text-sky-900',
        ghost: 'border-transparent bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  })
}

export { Badge, badgeVariants }
