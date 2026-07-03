/** Matter hub tabs — `portalVisible` controls what portal_client users see. */
export const MATTER_TABS = [
  { to: 'overview', label: 'Overview', portalVisible: true },
  { to: 'timeline', label: 'Timeline', portalVisible: false },
  { to: 'documents', label: 'Documents', portalVisible: true },
  { to: 'correspondence', label: 'Correspondence', portalVisible: false },
  { to: 'deadlines', label: 'Deadlines', portalVisible: true },
  { to: 'tasks', label: 'Tasks', portalVisible: false },
  { to: 'billing', label: 'Billing', portalVisible: true },
  { to: 'ip-rights', label: 'IP rights', portalVisible: false },
] as const

export type MatterTabSlug = (typeof MATTER_TABS)[number]['to']

const PORTAL_TAB_SLUGS = MATTER_TABS.filter((t) => t.portalVisible).map((t) => t.to)

export function matterTabsForUser(isPortalClient: boolean) {
  return isPortalClient ? MATTER_TABS.filter((t) => t.portalVisible) : MATTER_TABS
}

export function isPortalMatterTab(tab: string): boolean {
  return (PORTAL_TAB_SLUGS as readonly string[]).includes(tab)
}

/** Extract the tab slug from `/matters/:id/:tab`, or `null` when on the index route. */
export function getMatterTabFromPath(pathname: string): string | null {
  const match = pathname.match(/\/matters\/[^/]+\/([^/]+)/)
  return match?.[1] ?? null
}
