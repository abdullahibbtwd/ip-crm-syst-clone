import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { CountrySelect } from '@/components/crm/CountrySelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/features/create-file/create-file-form'
import type { CasePartyDraft, CaseSectionTone } from '@/features/create-file/case-subtypes'
import { emptyCaseParty } from '@/features/matters/case-party-form'
import { cn } from '@/lib/utils'

const TONE_SIDE: Record<CaseSectionTone, string> = {
  us: 'border-l-[5px] border-l-emerald-600',
  them: 'border-l-[5px] border-l-rose-500',
  third: 'border-l-[5px] border-l-amber-500',
  case: 'border-l-[5px] border-l-sky-600',
}

const TONE_HEADER: Record<CaseSectionTone, string> = {
  us: 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50',
  them: 'border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/50',
  third:
    'border-amber-100 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/50',
  case: 'border-sky-100 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/50',
}

const TONE_TITLE: Record<CaseSectionTone, string> = {
  us: 'text-emerald-950 dark:text-emerald-100',
  them: 'text-rose-950 dark:text-rose-100',
  third: 'text-amber-950 dark:text-amber-100',
  case: 'text-sky-950 dark:text-sky-100',
}

function TonePanel({
  tone,
  title,
  action,
  children,
}: {
  tone: CaseSectionTone
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm',
        TONE_SIDE[tone],
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3',
          TONE_HEADER[tone],
        )}
      >
        <h2
          className={cn(
            'text-sm font-semibold tracking-wide uppercase',
            TONE_TITLE[tone],
          )}
        >
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-4 bg-card p-5">{children}</div>
    </section>
  )
}

type CasePartyListEditorProps = {
  title: string
  tone: CaseSectionTone
  rows: CasePartyDraft[]
  onChange: (rows: CasePartyDraft[]) => void
  disabled?: boolean
}

export function CasePartyListEditor({
  title,
  tone,
  rows,
  onChange,
  disabled = false,
}: CasePartyListEditorProps) {
  const { t } = useTranslation('matters')

  return (
    <TonePanel
      tone={tone}
      title={title}
      action={
        disabled ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => onChange([...rows, emptyCaseParty()])}
          >
            <Plus className="size-4" />
            {t('createFile.addParty')}
          </Button>
        )
      }
    >
      <div className="space-y-5">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="space-y-3 rounded-lg border bg-muted/20 p-4"
          >
            <div className="flex items-start justify-end">
              {!disabled && rows.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                  aria-label={t('createFile.removeApplicant')}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
            <Field label={t('createFile.fields.legalName')}>
              <Input
                value={row.legalName}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    rows.map((item) =>
                      item.id === row.id
                        ? { ...item, legalName: e.target.value }
                        : item,
                    ),
                  )
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t('createFile.fields.city')}>
                <Input
                  value={row.city}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(
                      rows.map((item) =>
                        item.id === row.id ? { ...item, city: e.target.value } : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={t('createFile.fields.postalCode')}>
                <Input
                  value={row.postalCode}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(
                      rows.map((item) =>
                        item.id === row.id
                          ? { ...item, postalCode: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={t('createFile.fields.country')}>
                <CountrySelect
                  value={row.country}
                  disabled={disabled}
                  onValueChange={(code) =>
                    onChange(
                      rows.map((item) =>
                        item.id === row.id ? { ...item, country: code } : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label={t('createFile.fields.address')} className="sm:col-span-3">
                <Input
                  value={row.address}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(
                      rows.map((item) =>
                        item.id === row.id
                          ? { ...item, address: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                {t('createFile.sections.lawyers')}
              </p>
              <Field label={t('createFile.fields.legalName')}>
                <Input
                  value={row.lawyerLegalName}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange(
                      rows.map((item) =>
                        item.id === row.id
                          ? { ...item, lawyerLegalName: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
            </div>
            {index < rows.length - 1 ? (
              <div className="border-b border-black/10 dark:border-white/10" />
            ) : null}
          </div>
        ))}
      </div>
    </TonePanel>
  )
}
