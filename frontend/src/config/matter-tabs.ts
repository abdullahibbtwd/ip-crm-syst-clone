import type { MatterType } from '@/features/matters/types'

/** Matter hub tabs - `portalVisible` controls what portal_client users see. */
export const MATTER_TABS = [
  { to: 'overview', labelKey: 'tabs.overview', portalVisible: true },
  { to: 'timeline', labelKey: 'tabs.timeline', portalVisible: false },
  { to: 'documents', labelKey: 'tabs.documents', portalVisible: true },
  { to: 'correspondence', labelKey: 'tabs.correspondence', portalVisible: false },
  { to: 'deadlines', labelKey: 'tabs.deadlines', portalVisible: true },
  { to: 'tasks', labelKey: 'tabs.tasks', portalVisible: false },
  { to: 'billing', labelKey: 'tabs.billing', portalVisible: true },
  { to: 'ip-rights', labelKey: 'tabs.ipRights', portalVisible: false },
  {
    to: 'customs',
    labelKey: 'tabs.customs',
    portalVisible: false,
    matterTypes: ['border_measures'] as const satisfies readonly MatterType[],
  },
  { to: 'instructions', labelKey: 'tabs.instructions', portalVisible: false },
  { to: 'approvals', labelKey: 'tabs.approvals', portalVisible: false },
] as const

export type MatterTabSlug = (typeof MATTER_TABS)[number]['to']

const PORTAL_TAB_SLUGS = MATTER_TABS.filter((t) => t.portalVisible).map((t) => t.to)

export function matterTabsForUser(
  isPortalClient: boolean,
  matterType?: MatterType | string | null,
) {
  const base = isPortalClient ? MATTER_TABS.filter((t) => t.portalVisible) : MATTER_TABS
  return base.filter((tab) => {
    if (!('matterTypes' in tab) || !tab.matterTypes) return true
    if (!matterType) return false
    return (tab.matterTypes as readonly string[]).includes(matterType)
  })
}

export function isPortalMatterTab(tab: string): boolean {
  return (PORTAL_TAB_SLUGS as readonly string[]).includes(tab)
}

/** Extract the tab slug from `/matters/:id/:tab`, or `null` when on the index route. */
export function getMatterTabFromPath(pathname: string): string | null {
  const match = pathname.match(/\/matters\/[^/]+\/([^/]+)/)
  return match?.[1] ?? null
}
