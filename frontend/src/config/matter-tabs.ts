import type { LucideIcon } from 'lucide-react'
import {
  Award,
  CalendarClock,
  ClipboardCheck,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Mail,
  Receipt,
  Send,
  Shield,
  StickyNote,
} from 'lucide-react'
import type { MatterType } from '@/features/matters/types'

export type MatterTabCountKey =
  | 'documents'
  | 'correspondence'
  | 'deadlines'
  | 'tasks'
  | 'billing'
  | 'ipRights'
  | 'timeline'
  | 'instructions'
  | 'approvals'
  | 'customs'
  | 'secondaryActions'

/** Matter hub tabs - `portalVisible` controls what portal_client users see. */
export const MATTER_TABS = [
  { to: 'overview', labelKey: 'tabs.overview', icon: LayoutDashboard, portalVisible: true },
  { to: 'timeline', labelKey: 'tabs.timeline', icon: History, countKey: 'timeline', portalVisible: false },
  { to: 'documents', labelKey: 'tabs.documents', icon: FileText, countKey: 'documents', portalVisible: true },
  {
    to: 'correspondence',
    labelKey: 'tabs.correspondence',
    icon: Mail,
    countKey: 'correspondence',
    portalVisible: false,
  },
  {
    to: 'deadlines',
    labelKey: 'tabs.deadlines',
    icon: CalendarClock,
    countKey: 'deadlines',
    portalVisible: true,
  },
  { to: 'tasks', labelKey: 'tabs.tasks', icon: StickyNote, countKey: 'tasks', portalVisible: false },
  { to: 'billing', labelKey: 'tabs.billing', icon: Receipt, countKey: 'billing', portalVisible: true },
  { to: 'ip-rights', labelKey: 'tabs.ipRights', icon: Award, countKey: 'ipRights', portalVisible: false },
  {
    to: 'secondary-actions',
    labelKey: 'tabs.secondaryActions',
    icon: FolderOpen,
    countKey: 'secondaryActions',
    portalVisible: false,
    matterTypes: ['trademark'] as const satisfies readonly MatterType[],
  },
  {
    to: 'customs',
    labelKey: 'tabs.customs',
    icon: Shield,
    countKey: 'customs',
    portalVisible: false,
    matterTypes: ['border_measures'] as const satisfies readonly MatterType[],
  },
  {
    to: 'instructions',
    labelKey: 'tabs.instructions',
    icon: Send,
    countKey: 'instructions',
    portalVisible: false,
  },
  {
    to: 'approvals',
    labelKey: 'tabs.approvals',
    icon: ClipboardCheck,
    countKey: 'approvals',
    portalVisible: false,
  },
] as const satisfies readonly {
  to: string
  labelKey: string
  icon: LucideIcon
  countKey?: MatterTabCountKey
  portalVisible: boolean
  matterTypes?: readonly MatterType[]
}[]

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
