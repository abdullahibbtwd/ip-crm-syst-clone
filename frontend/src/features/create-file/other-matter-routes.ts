import type { MatterType } from '@/features/matters/types'
import { OTHER_MATTER_TYPES } from '@/features/matters/work-file-groups'

/** URL slug for an “other shelf” matter type, e.g. border_measures → border-measures */
export function otherMatterSlug(type: MatterType): string {
  return type.replace(/_/g, '-')
}

export function otherMatterCreatePath(type: MatterType): string {
  return `/files/new/other/${otherMatterSlug(type)}`
}

export function resolveOtherMatterType(slug: string | undefined): MatterType | null {
  if (!slug) return null
  const normalized = slug.trim().toLowerCase()
  for (const type of OTHER_MATTER_TYPES) {
    if (otherMatterSlug(type) === normalized) return type
  }
  return null
}

export { OTHER_MATTER_TYPES }
