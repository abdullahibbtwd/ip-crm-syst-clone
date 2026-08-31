import { Stamp } from 'lucide-react'
import type { NavItem } from '@/config/role-views'

/** List shelves under Working files → Trademarks (sidebar). */
export const TRADEMARK_LIST_SHELVES = [
  'marks',
  'objection',
  'opposition',
  'cancellation',
  'deletion',
] as const

export type TrademarkListShelf = (typeof TRADEMARK_LIST_SHELVES)[number]

const TRADEMARK_LIST_SHELF_SET = new Set<string>(TRADEMARK_LIST_SHELVES)

export const TRADEMARK_PROCEDURE_QUERY_KEY = 'trademarkProcedure'

/** Default shelf when opening Trademarks (replaces former "All trademarks"). */
export const DEFAULT_TRADEMARK_LIST_SHELF: TrademarkListShelf = 'marks'

export function normalizeTrademarkListShelf(
  value: string | null | undefined,
): TrademarkListShelf | null {
  if (!value) return null
  if (value === 'new' || value === 'registered') return 'marks'
  if (value === 'opposition_against_us' || value === 'opposition_by_us') {
    return 'opposition'
  }
  if (value === 'revocation') return 'deletion'
  if (TRADEMARK_LIST_SHELF_SET.has(value)) return value as TrademarkListShelf
  return null
}

function trademarkShelfLabelKey(shelf: TrademarkListShelf): string {
  return shelf === 'marks' ? 'trademarkShelf.marks' : `createFile.procedures.${shelf}`
}

/** Sidebar + list shelves for trademark create-file subcategories. */
export function trademarkShelfNavItem(): NavItem {
  return {
    icon: Stamp,
    labelKey: 'type.trademark',
    labelNs: 'matters',
    id: 'matters-trademark-group',
    children: TRADEMARK_LIST_SHELVES.map((shelf) => ({
      icon: Stamp,
      labelKey: trademarkShelfLabelKey(shelf),
      labelNs: 'matters' as const,
      path: `/matters?matterType=trademark&${TRADEMARK_PROCEDURE_QUERY_KEY}=${shelf}`,
      id: `matters-trademark-${shelf}`,
    })),
  }
}
