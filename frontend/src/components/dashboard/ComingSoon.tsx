import { Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ComingSoonProps = {
  title?: string
  description?: string
  className?: string
  compact?: boolean
}

export function ComingSoon({
  title = 'Coming soon',
  description = 'This module is under development. Live data and workflows will be available in a future release.',
  className,
  compact = false,
}: ComingSoonProps) {
  return (
    <Card
      className={cn(
        'border-dashed border-border/80 bg-muted/20 shadow-none',
        compact ? 'py-0' : '',
        className,
      )}
    >
      <CardContent
        className={cn(
          'flex flex-col items-center text-center',
          compact ? 'px-6 py-10' : 'px-8 py-16',
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Construction className="size-6 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="mt-4 font-serif text-xl text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
