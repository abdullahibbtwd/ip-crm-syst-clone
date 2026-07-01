import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { focusRing } from './shared'

const buttonVariants = cva(
  [
    'group/button inline-flex shrink-0 items-center justify-center gap-2',
    'rounded-md border border-transparent bg-clip-padding',
    'text-sm font-medium whitespace-nowrap',
    'transition-all duration-150 ease-out',
    'select-none cursor-pointer',
    focusRing,
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45',
    'active:scale-[0.98]',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-primary text-primary-foreground shadow-sm',
          'hover:bg-primary/92 hover:shadow-md',
          'active:shadow-sm',
        ].join(' '),
        secondary: [
          'border-border/80 bg-secondary text-secondary-foreground shadow-xs',
          'hover:bg-secondary/80 hover:border-border',
        ].join(' '),
        outline: [
          'border-border/90 bg-card text-foreground shadow-xs',
          'hover:bg-muted/60 hover:border-foreground/15',
          'aria-expanded:bg-muted/60',
        ].join(' '),
        ghost: [
          'text-foreground/80',
          'hover:bg-muted/70 hover:text-foreground',
          'aria-expanded:bg-muted/70',
        ].join(' '),
        destructive: [
          'bg-destructive/8 text-destructive border-destructive/15',
          'hover:bg-destructive/12 hover:border-destructive/25',
          'focus-visible:ring-destructive/20',
        ].join(' '),
        link: 'h-auto border-0 p-0 text-primary shadow-none hover:underline underline-offset-4 active:scale-100',
      },
      size: {
        xs: 'h-7 gap-1 rounded-md px-2 text-xs [&_svg:not([class*="size-"])]:size-3.5',
        sm: 'h-8 gap-1.5 rounded-md px-3 text-[13px] [&_svg:not([class*="size-"])]:size-3.5',
        default: 'h-9 px-3.5',
        lg: 'h-10 px-4 text-[15px]',
        icon: 'size-9',
        'icon-xs': 'size-7 [&_svg:not([class*="size-"])]:size-3.5',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
