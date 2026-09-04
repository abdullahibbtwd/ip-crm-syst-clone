import type { MatterType } from './types'

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

/** Remaining types shown under Working files → Others (not a primary shelf). */
export const OTHER_MATTER_TYPES = [
  'copyright',
  'border_measures',
  'fto_analysis',
  'valuation',
  'dispute_opposition',
  'domain',
  'litigation_expert_report',
  'consultation',
  'official_fee_payment',
  'other',
] as const satisfies readonly MatterType[]

const PRIMARY_SET = new Set<string>(PRIMARY_MATTER_TYPES)
const OTHER_SET = new Set<string>(OTHER_MATTER_TYPES)

export function isPrimaryMatterType(type: string | null | undefined): type is PrimaryMatterType {
  return Boolean(type && PRIMARY_SET.has(type))
}

export function isOtherMatterType(type: string | null | undefined): type is MatterType {
  return Boolean(type && OTHER_SET.has(type))
}

