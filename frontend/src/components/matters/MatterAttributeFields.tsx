import { useTranslation } from 'react-i18next'
import type { MatterType } from '@/features/matters/types'
import {
  getMatterAttributeFields,
  type AttributeFieldConfig,
} from '@/features/matters/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseTagsInput, tagsToInput } from '@/features/matters/utils'

type MatterAttributeFieldsProps = {
  matterType: MatterType
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  disabled?: boolean
  excludeKeys?: string[]
}

function FieldControl({
  field,
  value,
  onChange,
  selectPlaceholder,
  disabled,
}: {
  field: AttributeFieldConfig
  value: unknown
  onChange: (value: unknown) => void
  selectPlaceholder: string
  disabled?: boolean
}) {
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          disabled={disabled}
        />
      )
    case 'number':
      return (
        <Input
          type="number"
          value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )
    case 'date':
      return (
        <Input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )
    case 'select':
      return (
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={selectPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'tags':
      return (
        <Input
          value={tagsToInput(value)}
          onChange={(e) => onChange(parseTagsInput(e.target.value))}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )
    default:
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      )
  }
}

export function MatterAttributeFields({
  matterType,
  values,
  onChange,
  disabled,
  excludeKeys,
}: MatterAttributeFieldsProps) {
  const { t } = useTranslation('matters')
  const fields = getMatterAttributeFields(matterType).filter(
    (f) => !excludeKeys?.includes(f.key),
  )

  if (fields.length === 0) return null

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{t('attributeFields.title')}</p>
      {fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <label className="text-sm text-muted-foreground">{field.label}</label>
          <FieldControl
            field={field}
            value={values[field.key]}
            onChange={(v) => onChange(field.key, v)}
            selectPlaceholder={t('attributeFields.selectPlaceholder')}
            disabled={disabled}
          />
          {field.helpText ? (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
