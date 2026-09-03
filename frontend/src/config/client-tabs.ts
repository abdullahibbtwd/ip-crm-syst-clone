import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  History,
  LayoutDashboard,
  Mail,
  Receipt,
  Shield,
  StickyNote,
  Users,
} from 'lucide-react'
import type { ClientTabCounts } from '@/features/crm/types'

export type ClientTabCountKey = keyof ClientTabCounts

export type ClientTabDef = {
  to: string
  labelKey: string
  icon: LucideIcon
  countKey?: ClientTabCountKey
  complianceOnly?: boolean
}

export const CLIENT_TABS: ClientTabDef[] = [
  { to: 'overview', labelKey: 'tabs.overview', icon: LayoutDashboard },
  { to: 'offices', labelKey: 'tabs.offices', icon: Building2, countKey: 'offices' },
  { to: 'contacts', labelKey: 'tabs.contacts', icon: Users, countKey: 'contacts' },
  { to: 'related', labelKey: 'tabs.related', icon: GitBranch, countKey: 'related' },
  { to: 'history', labelKey: 'tabs.history', icon: History, countKey: 'history' },
  { to: 'matters', labelKey: 'tabs.matters', icon: FolderOpen, countKey: 'matters' },
  { to: 'documents', labelKey: 'tabs.documents', icon: FileText, countKey: 'documents' },
  { to: 'correspondence', labelKey: 'tabs.correspondence', icon: Mail, countKey: 'correspondence' },
  { to: 'watch', labelKey: 'tabs.watch', icon: Eye, countKey: 'watch' },
  { to: 'billing', labelKey: 'tabs.billing', icon: Receipt, countKey: 'billing' },
  { to: 'notes', labelKey: 'tabs.notes', icon: StickyNote, countKey: 'notes' },
  {
    to: 'access',
    labelKey: 'tabs.accessHistory',
    icon: Shield,
    countKey: 'access',
    complianceOnly: true,
  },
]

export function clientTabsForUser(showCompliance: boolean): ClientTabDef[] {
  return CLIENT_TABS.filter((tab) => (tab.complianceOnly ? showCompliance : true))
}

export function formatTabCount(count: number): string {
  return count > 99 ? '99+' : String(count)
}
