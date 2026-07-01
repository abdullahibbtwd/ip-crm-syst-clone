import * as React from 'react'

import { cn } from '@/lib/utils'
import { fieldVariants } from './shared'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldVariants({ size: 'default' }),
        'field-sizing-content min-h-[88px] resize-y py-2.5 leading-relaxed',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
