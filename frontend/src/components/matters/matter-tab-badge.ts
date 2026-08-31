import type { MatterTabCountKey } from '@/config/matter-tabs'
import type { MatterTabCounts } from '@/features/matters/types'

export type MatterTabBadgeTone =
  | 'deadlines'
  | 'correspondence-new'
  | 'correspondence'
  | 'tasks'
  | 'documents'
  | 'billing'
  | 'ipRights'
  | 'timeline'
  | 'instructions'
  | 'approvals'
  | 'customs'
  | 'secondaryActions'
  | 'default'

export type MatterTabBadge = {
  count: number
  tone: MatterTabBadgeTone
}

/** Maps each tab count key to a distinct badge color for quick scanning. */
export const MATTER_TAB_BADGE_CLASS: Record<MatterTabBadgeTone, string> = {
  deadlines: 'bg-destructive text-white shadow-sm ring-1 ring-destructive/40',
  'correspondence-new': 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30',
  correspondence: 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-600/30',
  tasks: 'bg-amber-500 text-white shadow-sm ring-1 ring-amber-500/30',
  documents: 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600/30',
  billing: 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600/30',
  ipRights: 'bg-violet-600 text-white shadow-sm ring-1 ring-violet-600/30',
  timeline: 'bg-slate-600 text-white shadow-sm ring-1 ring-slate-600/30',
  instructions: 'bg-orange-500 text-white shadow-sm ring-1 ring-orange-500/30',
  approvals: 'bg-yellow-500 text-yellow-950 shadow-sm ring-1 ring-yellow-500/40',
  customs: 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-600/30',
  secondaryActions: 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600/30',
  default: '',
}

export function matterTabBadge(
  countKey: MatterTabCountKey | undefined,
  counts: MatterTabCounts | undefined,
): MatterTabBadge {
  if (!countKey || !counts) return { count: 0, tone: 'default' }

  if (countKey === 'deadlines') {
    return { count: counts.deadlines, tone: 'deadlines' }
  }

  if (countKey === 'correspondence') {
    if (counts.correspondenceNew > 0) {
      return { count: counts.correspondenceNew, tone: 'correspondence-new' }
    }
    return { count: counts.correspondence, tone: 'correspondence' }
  }

  const toneMap: Partial<Record<MatterTabCountKey, MatterTabBadgeTone>> = {
    tasks: 'tasks',
    documents: 'documents',
    billing: 'billing',
    ipRights: 'ipRights',
    timeline: 'timeline',
    instructions: 'instructions',
    approvals: 'approvals',
    customs: 'customs',
    secondaryActions: 'secondaryActions',
  }

  return {
    count: counts[countKey],
    tone: toneMap[countKey] ?? 'default',
  }
}
