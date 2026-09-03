import type { MatterDetail } from './types'
import {
  DEFAULT_TRADEMARK_LIST_SHELF,
  TRADEMARK_PROCEDURE_QUERY_KEY,
} from './trademark-procedures-nav'
import { procedureListUrl, trademarkProcedureView } from './trademark-procedure-matter'

const RETURN_KEY = 'matterReturnTo'

export function rememberMatterReturnTo(from: string) {
  try {
    sessionStorage.setItem(RETURN_KEY, from)
  } catch {
    /* private mode */
  }
}

export function readMatterReturnTo(): string | null {
  try {
    return sessionStorage.getItem(RETURN_KEY)
  } catch {
    return null
  }
}

export function isMatterListReturnPath(path: string, matterId?: string): boolean {
  if (!path.startsWith('/matters')) return false
  if (matterId && (path === `/matters/${matterId}` || path.startsWith(`/matters/${matterId}/`))) {
    return false
  }
  return true
}

export function matterShelfUrl(
  matter: Pick<MatterDetail, 'matterType' | 'isArchived' | 'attributes'>,
): string {
  if (matter.isArchived) return '/matters?archived=1'
  const view = trademarkProcedureView(matter)
  if (view) return procedureListUrl(view)
  if (matter.matterType === 'trademark') {
    return `/matters?matterType=trademark&${TRADEMARK_PROCEDURE_QUERY_KEY}=${DEFAULT_TRADEMARK_LIST_SHELF}`
  }
  return `/matters?matterType=${matter.matterType}`
}

export function resolveMatterBackUrl(
  matter: Pick<MatterDetail, 'id' | 'matterType' | 'isArchived' | 'attributes'> | null | undefined,
  stateFrom?: string | null,
): string {
  const candidates = [stateFrom, readMatterReturnTo()]
  for (const path of candidates) {
    if (path && isMatterListReturnPath(path, matter?.id)) return path
  }
  if (!matter) return '/matters'
  return matterShelfUrl(matter)
}
