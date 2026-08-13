import type { MatterType } from './types'
import { ALL_MATTER_TYPES } from './utils'

/** Primary shelves shown under Working files in the sidebar. */
export const PRIMARY_MATTER_TYPES = [
  'trademark',
  'patent',
  'utility_model',
  'industrial_design',
  'geographical_indication',
  'cases',
] as const satisfies readonly MatterType[]

export type PrimaryMatterType = (typeof PRIMARY_MATTER_TYPES)[number]

const PRIMARY_SET = new Set<string>(PRIMARY_MATTER_TYPES)

export const OTHER_MATTER_TYPES = ALL_MATTER_TYPES.filter(
  (type) => !PRIMARY_SET.has(type),
) as MatterType[]

export function isPrimaryMatterType(type: string | null | undefined): type is PrimaryMatterType {
  return Boolean(type && PRIMARY_SET.has(type))
}

export function isOtherMatterType(type: string | null | undefined): type is MatterType {
  return Boolean(type && !PRIMARY_SET.has(type) && ALL_MATTER_TYPES.includes(type as MatterType))
}
