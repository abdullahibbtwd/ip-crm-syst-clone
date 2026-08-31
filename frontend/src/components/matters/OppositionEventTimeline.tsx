import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { OppositionEvent } from '@/features/matters/opposition-workflow'

type OppositionEventTimelineProps = {
  events: OppositionEvent[]
  legacyLines?: string[]
  className?: string
}

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function OppositionEventTimeline({
  events,
  legacyLines = [],
  className,
}: OppositionEventTimelineProps) {
  const { t } = useTranslation('matters')

  const hasStructured = events.length > 0
  const hasLegacy = legacyLines.length > 0

  if (!hasStructured && !hasLegacy) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-5 text-center',
        className,
      )}
    >
      <ul className="space-y-2">
        {events.map((event) => (
          <li key={event.id} className="text-sm font-medium text-foreground">
            {event.kind === 'appeal' || event.kind === 'court_appeal' ? (
              <span>
                {event.kind === 'court_appeal'
                  ? t('oppositionView.timeline.appealedInCourtBy', {
                      name: event.appealedBy ?? event.label,
                    })
                  : t('oppositionView.timeline.appealedBy', {
                      name: event.appealedBy ?? event.label,
                    })}
              </span>
            ) : event.kind === 'decision' ||
              event.kind === 'department_decision' ||
              event.kind === 'second_decision' ? (
              <span>
                {t(`oppositionView.timeline.${event.kind}`)}{' '}
                {event.decisionNumber ? (
                  <span className="text-primary">
                    {t('oppositionView.timeline.decisionRef', {
                      number: event.decisionNumber,
                      date: event.decisionDate
                        ? formatEventDate(event.decisionDate)
                        : formatEventDate(event.at),
                    })}
                  </span>
                ) : null}
              </span>
            ) : event.decisionNumber ? (
              <span>
                {event.label}{' '}
                <span className="text-primary">
                  {t('oppositionView.timeline.decisionRef', {
                    number: event.decisionNumber,
                    date: event.decisionDate
                      ? formatEventDate(event.decisionDate)
                      : formatEventDate(event.at),
                  })}
                </span>
              </span>
            ) : (
              <span>{event.label}</span>
            )}
          </li>
        ))}
        {!hasStructured
          ? legacyLines.map((line) => (
              <li key={line} className="text-sm text-muted-foreground">
                {line}
              </li>
            ))
          : null}
      </ul>
    </div>
  )
}
