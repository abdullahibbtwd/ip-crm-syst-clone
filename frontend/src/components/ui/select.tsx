import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { useTranslation } from 'react-i18next'

import i18n from '@/i18n'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { fieldVariants, focusRing } from './shared'

type SelectLabelRegistry = {
  register: (value: string, label: string) => void
  getLabel: (value: unknown) => string | undefined
}

const SelectLabelRegistryContext = React.createContext<SelectLabelRegistry | null>(null)

function isFilterAllValue(value: unknown): boolean {
  if (value == null) return false
  const normalized = String(value)
  return normalized === 'all' || normalized === 'All'
}

function Select({ children, ...props }: SelectPrimitive.Root.Props) {
  const labelsRef = React.useRef<Map<string, string>>(new Map())

  React.useEffect(() => {
    const clearLabels = () => labelsRef.current.clear()
    i18n.on('languageChanged', clearLabels)
    return () => i18n.off('languageChanged', clearLabels)
  }, [])

  const registry = React.useMemo<SelectLabelRegistry>(
    () => ({
      register: (value, label) => {
        labelsRef.current.set(value, label)
      },
      getLabel: (value) => {
        if (value == null) return undefined
        return labelsRef.current.get(String(value))
      },
    }),
    [],
  )

  return (
    <SelectLabelRegistryContext.Provider value={registry}>
      <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
    </SelectLabelRegistryContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn('p-1', className)}
      {...props}
    />
  )
}

function SelectValue({
  className,
  children,
  placeholder,
  ...props
}: SelectPrimitive.Value.Props) {
  const registry = React.useContext(SelectLabelRegistryContext)
  const { t } = useTranslation('common')

  const formatValue = React.useCallback(
    (value: unknown) => {
      if (children != null) {
        if (typeof children === 'function') {
          return children(value)
        }
        return children
      }

      const registered = registry?.getLabel(value)
      if (registered) return registered

      if (isFilterAllValue(value)) {
        if (placeholder != null) return placeholder
        return t('filters.all')
      }

      if (value == null) return null
      return String(value)
    },
    [children, registry, placeholder, t],
  )

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn('flex flex-1 truncate text-left', className)}
      placeholder={placeholder}
      {...props}
    >
      {formatValue}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: 'sm' | 'default'
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        fieldVariants({ size: size === 'sm' ? 'sm' : 'default' }),
        'flex w-full min-w-[8rem] items-center justify-between gap-2 pr-2.5',
        'cursor-pointer select-none data-placeholder:text-muted-foreground/70',
        'disabled:cursor-not-allowed',
        '*:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDown className="size-4 shrink-0 text-muted-foreground/80" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-[100]"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            'relative z-[100] max-h-(--available-height) w-(--anchor-width) min-w-40',
            'origin-(--transform-origin) overflow-hidden rounded-md',
            'border border-border/80 bg-popover text-popover-foreground',
            'shadow-lg shadow-foreground/5',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:duration-150',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="max-h-64 overflow-y-auto p-1 shell-scrollbar">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        'px-2 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase',
        className,
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  label,
  value,
  ...props
}: SelectPrimitive.Item.Props) {
  const registry = React.useContext(SelectLabelRegistryContext)
  const itemLabel =
    label ??
    (typeof children === 'string' || typeof children === 'number' ? String(children) : undefined)

  React.useLayoutEffect(() => {
    if (registry && value != null && itemLabel) {
      registry.register(String(value), itemLabel)
    }
  }, [registry, value, itemLabel])

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-2 pr-8 pl-2',
        'text-sm outline-none select-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-highlighted:bg-muted/80 data-highlighted:text-foreground',
        'data-disabled:pointer-events-none data-disabled:opacity-40',
        className,
      )}
      label={itemLabel}
      value={value}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-primary" />
        }
      >
        <Check className="size-3.5 stroke-[2.5]" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border/80', className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        'flex cursor-pointer items-center justify-center bg-popover py-1',
        focusRing,
        className,
      )}
      {...props}
    >
      <ChevronUp className="size-4 text-muted-foreground" />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        'flex cursor-pointer items-center justify-center bg-popover py-1',
        focusRing,
        className,
      )}
      {...props}
    >
      <ChevronDown className="size-4 text-muted-foreground" />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
