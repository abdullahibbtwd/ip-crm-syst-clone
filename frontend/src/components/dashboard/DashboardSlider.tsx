import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type DesktopCols = 2 | 3 | 4 | 5

const DESKTOP_GRID: Record<DesktopCols, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
}

type DashboardSliderProps = {
  children: ReactNode
  className?: string
  desktopCols?: DesktopCols
  ariaLabel?: string
}

export function DashboardSlider({
  children,
  className,
  desktopCols = 4,
  ariaLabel,
}: DashboardSliderProps) {
  const { t } = useTranslation('dashboard')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const items = Children.toArray(children)
  const count = items.length

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return

    const slides = Array.from(el.querySelectorAll<HTMLElement>('[data-slide]'))
    if (slides.length === 0) return

    const center = el.scrollLeft + el.clientWidth / 2
    let nearest = 0
    let nearestDistance = Number.POSITIVE_INFINITY
    slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2
      const distance = Math.abs(center - slideCenter)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = index
      }
    })
    setActiveIndex(nearest)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    updateScrollState()
    el.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState, count])

  const scrollToIndex = (index: number) => {
    const el = scrollerRef.current
    const slide = el?.querySelectorAll<HTMLElement>('[data-slide]')[index]
    if (!el || !slide) return
    el.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' })
  }

  if (count === 0) return null

  return (
    <div className={cn('relative', className)}>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-brand-light via-brand-light/80 to-transparent sm:w-10 lg:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-brand-light via-brand-light/80 to-transparent sm:w-10 lg:hidden"
        aria-hidden
      />

      <div
        ref={scrollerRef}
        className={cn(
          'dashboard-slider-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth',
          'lg:grid lg:overflow-visible lg:snap-none',
          DESKTOP_GRID[desktopCols],
        )}
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel ?? t('slider.carousel')}
      >
        {items.map((child, index) => (
          <div
            key={index}
            data-slide
            className={cn(
              'min-w-[88%] shrink-0 snap-start sm:min-w-[calc(50%-0.5rem)] md:min-w-[calc(33.333%-0.67rem)]',
              'lg:min-w-0 lg:shrink',
            )}
          >
            {child}
          </div>
        ))}
      </div>

      {count > 1 ? (
        <div
          className="mt-4 flex items-center justify-center gap-2 lg:hidden"
          role="tablist"
          aria-label={t('slider.dots')}
        >
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={t('slider.goToSlide', { index: index + 1 })}
              className={cn(
                'rounded-full transition-all duration-500 ease-out',
                index === activeIndex
                  ? 'h-2 w-7 bg-gradient-to-r from-brand-green to-primary shadow-[0_0_10px_rgba(232,98,26,0.35)]'
                  : 'size-2 bg-brand-green/20 hover:bg-brand-green/35',
              )}
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
