import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  Atom,
  Award,
  Banknote,
  BarChart3,
  Bell,
  BookMarked,
  // Briefcase, // mattersAll (commented out in workingFilesNavItem)
  Calendar,
  CalendarPlus,
  Building2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Eye,
  FileOutput,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FilePenLine,
  FolderOpen,
  Gavel,
  Globe2,
  Handshake,
  HelpCircle,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Layers,
  List,
  Lock,
  Mail,
  MapPinned,
  Megaphone,
  Palette,
  PieChart,
  Plug,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Stamp,
  Trash2,
  Upload,
  Users,
  UsersRound,
} from 'lucide-react'
import type { SystemRole } from '../lib/rbac'
import { PRIMARY_MATTER_TYPES } from '../features/matters/work-file-groups'
import { trademarkShelfNavItem } from '../features/matters/trademark-procedures-nav'

export type NavItem = {
  icon: LucideIcon
  labelKey: string
  /** i18n namespace for labelKey (default: nav). Use e.g. matters for type.* labels. */
  labelNs?: string
  id?: string
  path?: string
  isHome?: boolean
  isFooter?: boolean
  active?: boolean
  /** Nested items for expandable sidebar groups (e.g. Working files). */
  children?: NavItem[]
}

export type NavSection = {
  sectionKey: string
  items: NavItem[]
}

export type RoleView = {
  role: SystemRole
  external: boolean
  nav: NavSection[]
  footer: NavItem[]
  topbar: {
    breadcrumbKey: string
    showLanguage: boolean
    showTasks?: boolean
  }
  home: {
    homeKey: string
    comingSoon?: boolean
  }
}

const PRIMARY_TYPE_NAV: Array<{
  type: (typeof PRIMARY_MATTER_TYPES)[number]
  icon: LucideIcon
}> = [
  { type: 'trademark', icon: Stamp },
  { type: 'patent', icon: Atom },
  { type: 'utility_model', icon: Layers },
  { type: 'industrial_design', icon: Palette },
  { type: 'geographical_indication', icon: MapPinned },
  { type: 'cases', icon: Gavel },
]

/** Expandable Working files group shared across internal roles. */
export function workingFilesNavItem(opts?: {
  id?: string
  labelKey?: string
}): NavItem {
  const typeChildren = PRIMARY_TYPE_NAV.flatMap(({ type, icon }) => {
    const item =
      type === 'trademark'
        ? trademarkShelfNavItem()
        : {
            icon,
            labelKey: `type.${type}`,
            labelNs: 'matters',
            path: `/matters?matterType=${type}`,
            id: `matters-${type}`,
          }

    if (type === 'utility_model') {
      return [
        item,
        {
          icon: ShieldCheck,
          labelKey: 'spcShelf.title',
          labelNs: 'matters',
          path: '/matters?matterType=patent&spcOnly=1',
          id: 'matters-spc',
        },
      ]
    }

    return [item]
  })

  return {
    id: opts?.id ?? 'working-files',
    icon: FolderOpen,
    labelKey: opts?.labelKey ?? 'workingFiles',
    children: [
      /* Hidden — restore by uncommenting:
      {
        icon: Briefcase,
        labelKey: 'mattersAll',
        path: '/matters',
        id: 'matters-all',
      },
      */
      ...typeChildren,
      {
        icon: Layers,
        labelKey: 'mattersOthers',
        path: '/matters?group=others',
        id: 'matters-others',
      },
      {
        icon: FilePenLine,
        labelKey: 'mattersDrafts',
        path: '/matters?drafts=1',
        id: 'matters-drafts',
      },
      {
        icon: Archive,
        labelKey: 'mattersArchived',
        path: '/matters?archived=1',
        id: 'matters-archived',
      },
    ],
  }
}

/** Create File dropdown — type first, then subcategories on the page. */
export function createFileNavItem(): NavItem {
  return {
    id: 'create-file',
    icon: FilePlus,
    labelKey: 'createFile',
    children: [
      {
        icon: Stamp,
        labelKey: 'createFileTrademark',
        path: '/files/new/trademark',
        id: 'create-file-trademark',
      },
      {
        icon: Atom,
        labelKey: 'createFilePatent',
        path: '/files/new/patent',
        id: 'create-file-patent',
      },
      {
        icon: Palette,
        labelKey: 'createFile.kinds.design',
        labelNs: 'matters',
        path: '/files/new/design?procedure=registered',
        id: 'create-file-design',
      },
      {
        icon: Layers,
        labelKey: 'createFile.kinds.utilityModel',
        labelNs: 'matters',
        path: '/files/new/utility-model',
        id: 'create-file-utility-model',
      },
      {
        icon: MapPinned,
        labelKey: 'createFile.kinds.registeredGi',
        labelNs: 'matters',
        path: '/files/new/gi?procedure=registered',
        id: 'create-file-gi',
      },
      {
        icon: ShieldCheck,
        labelKey: 'createFile.kinds.spc',
        labelNs: 'matters',
        path: '/files/new/spc',
        id: 'create-file-spc',
      },
      {
        icon: Gavel,
        labelKey: 'createFile.kinds.case',
        labelNs: 'matters',
        path: '/files/new/case',
        id: 'create-file-case',
      },
      {
        icon: List,
        labelKey: 'createFile.otherFilesTitle',
        labelNs: 'matters',
        path: '/files/new/other',
        id: 'create-file-other',
      },
    ],
  }
}

const ROLE_VIEWS: Record<SystemRole, RoleView> = {
  managing_partner: {
    role: 'managing_partner',
    external: false,
    nav: [
      {
        sectionKey: 'overview',
        items: [
          { icon: LayoutDashboard, labelKey: 'dashboard', isHome: true, path: '/dashboard' },
          { icon: Calendar, labelKey: 'deadlines', path: '/deadlines' },
          { icon: Bell, labelKey: 'alerts', path: '/alerts' },
        ],
      },
      {
        sectionKey: 'clients',
        items: [
          { icon: Users, labelKey: 'clients', path: '/clients' },
          { icon: Building2, labelKey: 'holdingGroups', path: '/holding-groups' },
          { icon: UsersRound, labelKey: 'contacts', path: '/contacts' },
        ],
      },
      {
        sectionKey: 'matters',
        items: [
          createFileNavItem(),
          workingFilesNavItem({ labelKey: 'workingFiles' }),
          /* Hidden — restore by uncommenting:
          { icon: Inbox, labelKey: 'intakeQueue', path: '/intake' },
          */
          { icon: Handshake, labelKey: 'partners', path: '/partners' },
          { icon: BookMarked, labelKey: 'precedents', path: '/precedents' },
        ],
      },
      {
        sectionKey: 'ipRights',
        items: [
          { icon: Award, labelKey: 'rightsRegister', path: '/ip-rights' },
          { icon: RefreshCw, labelKey: 'renewals', path: '/renewals' },
          { icon: Eye, labelKey: 'watch', path: '/watch-alerts' },
        ],
      },
      {
        sectionKey: 'finance',
        items: [
          { icon: Receipt, labelKey: 'invoices', path: '/invoices' },
          { icon: FileSpreadsheet, labelKey: 'proformas', path: '/invoices?proforma=1' },
          { icon: CircleDollarSign, labelKey: 'billingOverview', path: '/billing-overview' },
          { icon: CreditCard, labelKey: 'rateCards', path: '/rate-cards' },
        ],
      },
      {
        sectionKey: 'reports',
        items: [
          { icon: BarChart3, labelKey: 'deadlineRisk', path: '/reports/deadline-risk' },
          { icon: FileOutput, labelKey: 'filingVolumes', path: '/reports/filing-volumes' },
          { icon: RefreshCw, labelKey: 'renewalsSummary', path: '/reports/renewals-summary' },
          { icon: PieChart, labelKey: 'revenueReceivables', path: '/reports/revenue-summary' },
          { icon: Search, labelKey: 'bpoOwners', path: '/reports/bpo-owners' },
        ],
      },
      {
        sectionKey: 'compliance',
        items: [
          { icon: List, labelKey: 'auditTrail', path: '/compliance/audit-trail' },
          { icon: FileOutput, labelKey: 'dataExportsLog', path: '/compliance/data-exports' },
          { icon: Trash2, labelKey: 'retentionRules', path: '/compliance/retention' },
        ],
      },
      {
        sectionKey: 'communication',
        items: [
          { icon: FileText, labelKey: 'documents', path: '/documents' },
          { icon: FileOutput, labelKey: 'generatePoa', path: '/documents/generate-poa' },
          { icon: Shield, labelKey: 'gdprRegister', path: '/compliance/consent' },
          { icon: Mail, labelKey: 'emailQueue', path: '/email-queue' },
          { icon: Megaphone, labelKey: 'broadcasts', path: '/broadcasts' },
        ],
      },
      {
        sectionKey: 'system',
        items: [
          { icon: Globe2, labelKey: 'jurisdictions', path: '/settings/jurisdictions' },
          { icon: FileText, labelKey: 'documentTemplates', path: '/settings/document-templates' },
          { icon: Plug, labelKey: 'integrations', path: '/settings/integrations' },
        ],
      },
    ],
    footer: [
      { icon: UsersRound, labelKey: 'team', path: '/users/team' },
      { icon: Settings, labelKey: 'settings', path: '/settings' },
    ],
    topbar: { breadcrumbKey: 'dashboard', showLanguage: true, showTasks: true },
    home: { homeKey: 'managing_partner' },
  },

  ip_attorney: {
    role: 'ip_attorney',
    external: false,
    nav: [
      {
        sectionKey: 'myWork',
        items: [
          { icon: LayoutDashboard, labelKey: 'myDashboard', isHome: true, path: '/dashboard' },
          { icon: Calendar, labelKey: 'myDeadlines', path: '/deadlines/my' },
        ],
      },
      {
        sectionKey: 'matters',
        items: [
          createFileNavItem(),
          workingFilesNavItem({ labelKey: 'myMatters' }),
          { icon: Upload, labelKey: 'officeActions', path: '/deadlines' },
          { icon: Handshake, labelKey: 'partners', path: '/partners' },
        ],
      },
      {
        sectionKey: 'rights',
        items: [
          { icon: Award, labelKey: 'rightsRegister', path: '/ip-rights' },
          { icon: RefreshCw, labelKey: 'renewals', path: '/renewals' },
        ],
      },
      {
        sectionKey: 'communication',
        items: [
          { icon: FileText, labelKey: 'documents', path: '/documents' },
          { icon: BookMarked, labelKey: 'precedents', path: '/precedents' },
          { icon: Mail, labelKey: 'emailQueue', path: '/email-queue' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'myDashboard', showLanguage: true, showTasks: true },
    home: { homeKey: 'myDashboard' },
  },

  trademark_attorney: {
    role: 'trademark_attorney',
    external: false,
    nav: [
      {
        sectionKey: 'myWork',
        items: [
          { icon: LayoutDashboard, labelKey: 'myDashboard', isHome: true, path: '/dashboard' },
          { icon: Calendar, labelKey: 'myDeadlines', path: '/deadlines/my' },
        ],
      },
      {
        sectionKey: 'trademarks',
        items: [
          createFileNavItem(),
          workingFilesNavItem({ labelKey: 'myTmMatters' }),
          { icon: RefreshCw, labelKey: 'renewals', path: '/renewals' },
          { icon: Eye, labelKey: 'watchAlerts', path: '/watch-alerts' },
          { icon: Handshake, labelKey: 'partners', path: '/partners' },
        ],
      },
      {
        sectionKey: 'rights',
        items: [{ icon: Award, labelKey: 'rightsRegister', path: '/ip-rights' }],
      },
      {
        sectionKey: 'communication',
        items: [
          { icon: FileText, labelKey: 'documents', path: '/documents' },
          { icon: BookMarked, labelKey: 'precedents', path: '/precedents' },
          { icon: Mail, labelKey: 'emailQueue', path: '/email-queue' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'myDashboard', showLanguage: true, showTasks: true },
    home: { homeKey: 'myDashboard' },
  },

  coordinator: {
    role: 'coordinator',
    external: false,
    nav: [
      {
        sectionKey: 'overview',
        items: [
          { icon: LayoutDashboard, labelKey: 'dashboard', isHome: true, path: '/dashboard' },
          /* Hidden — restore by uncommenting:
          { icon: Inbox, labelKey: 'intakeQueue', path: '/intake' },
          */
          { icon: Calendar, labelKey: 'deadlines', path: '/deadlines' },
        ],
      },
      {
        sectionKey: 'clients',
        items: [
          { icon: Users, labelKey: 'clients', path: '/clients' },
          { icon: Building2, labelKey: 'holdingGroups', path: '/holding-groups' },
          { icon: UsersRound, labelKey: 'contacts', path: '/contacts' },
          createFileNavItem(),
          workingFilesNavItem(),
          { icon: Handshake, labelKey: 'partners', path: '/partners' },
          { icon: RefreshCw, labelKey: 'renewals', path: '/renewals' },
          { icon: Search, labelKey: 'conflictCheck', path: '/intake?status=conflict_check' },
        ],
      },
      {
        sectionKey: 'communication',
        items: [
          { icon: FileText, labelKey: 'documents', path: '/documents' },
          { icon: Mail, labelKey: 'emailQueue', path: '/email-queue' },
          { icon: Megaphone, labelKey: 'broadcasts', path: '/broadcasts' },
        ],
      },
      {
        sectionKey: 'reports',
        items: [
          { icon: FileOutput, labelKey: 'filingVolumes', path: '/reports/filing-volumes' },
          { icon: RefreshCw, labelKey: 'renewalsSummary', path: '/reports/renewals-summary' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'dashboard', showLanguage: true, showTasks: true },
    home: { homeKey: 'coordinator' },
  },

  docketing_admin: {
    role: 'docketing_admin',
    external: false,
    nav: [
      {
        sectionKey: 'overview',
        items: [
          { icon: LayoutDashboard, labelKey: 'dashboard', isHome: true, path: '/dashboard' },
          { icon: Calendar, labelKey: 'allDeadlines', path: '/deadlines' },
          { icon: Bell, labelKey: 'escalations', path: '/deadlines?status=escalated' },
        ],
      },
      {
        sectionKey: 'deadlines',
        items: [
          createFileNavItem(),
          workingFilesNavItem(),
          { icon: Handshake, labelKey: 'partners', path: '/partners' },
          { icon: RefreshCw, labelKey: 'renewals', path: '/renewals' },
          { icon: Clock, labelKey: 'gracePeriods', path: '/deadlines?hasGrace=1' },
          { icon: CalendarPlus, labelKey: 'addDeadline', path: '/deadlines' },
          { icon: Globe2, labelKey: 'jurisdictions', path: '/settings/jurisdictions' },
        ],
      },
      {
        sectionKey: 'correspondence',
        items: [
          { icon: FileText, labelKey: 'documents', path: '/documents' },
          { icon: Mail, labelKey: 'incomingMail', path: '/email-queue' },
          { icon: Send, labelKey: 'outgoingMail', path: '/email-queue' },
        ],
      },
      {
        sectionKey: 'system',
        items: [
          { icon: FileText, labelKey: 'documentTemplates', path: '/settings/document-templates' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'dashboard', showLanguage: true, showTasks: true },
    home: { homeKey: 'docketing_admin' },
  },

  paralegal: {
    role: 'paralegal',
    external: false,
    nav: [
      {
        sectionKey: 'overview',
        items: [
          { icon: LayoutDashboard, labelKey: 'myTasks', isHome: true, path: '/dashboard' },
          { icon: Calendar, labelKey: 'myDeadlines', path: '/deadlines/my' },
        ],
      },
      {
        sectionKey: 'matters',
        items: [
          createFileNavItem(),
          workingFilesNavItem({ labelKey: 'assignedMatters' }),
          { icon: Users, labelKey: 'clients', path: '/clients' },
          { icon: Handshake, labelKey: 'partners', path: '/partners' },
        ],
      },
      {
        sectionKey: 'documentsAndMail',
        items: [
          { icon: FileText, labelKey: 'documents', path: '/documents' },
          { icon: BookMarked, labelKey: 'precedents', path: '/precedents' },
          { icon: Mail, labelKey: 'correspondence', path: '/email-queue' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'myTasks', showLanguage: true, showTasks: true },
    home: { homeKey: 'myTasks' },
  },

  finance: {
    role: 'finance',
    external: false,
    nav: [
      {
        sectionKey: 'overview',
        items: [
          { icon: LayoutDashboard, labelKey: 'financeDashboard', isHome: true, path: '/dashboard' },
        ],
      },
      {
        sectionKey: 'billing',
        items: [
          { icon: Receipt, labelKey: 'invoices', path: '/invoices' },
          { icon: FileSpreadsheet, labelKey: 'proformas', path: '/invoices?proforma=1' },
          { icon: CircleDollarSign, labelKey: 'timeEntries', path: '/time-entries' },
          { icon: Banknote, labelKey: 'payments', path: '/invoices?paymentStatus=unpaid' },
          { icon: CreditCard, labelKey: 'rateCards', path: '/rate-cards' },
        ],
      },
      {
        sectionKey: 'reports',
        items: [
          { icon: PieChart, labelKey: 'revenueReceivables', path: '/reports/revenue-summary' },
          { icon: FileSpreadsheet, labelKey: 'disbursements', path: '/disbursements' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'financeDashboard', showLanguage: true },
    home: { homeKey: 'finance' },
  },

  dpo_compliance: {
    role: 'dpo_compliance',
    external: false,
    nav: [
      {
        sectionKey: 'overview',
        items: [
          { icon: LayoutDashboard, labelKey: 'complianceDashboard', isHome: true, path: '/dashboard' },
        ],
      },
      {
        sectionKey: 'gdpr',
        items: [
          { icon: Shield, labelKey: 'personalDataRegister', path: '/clients' },
          { icon: FileOutput, labelKey: 'dataExportsLog', path: '/compliance/data-exports' },
          { icon: Trash2, labelKey: 'retentionRules', path: '/compliance/retention' },
          { icon: Lock, labelKey: 'consentRecords', path: '/compliance/consent' },
        ],
      },
      {
        sectionKey: 'audit',
        items: [
          { icon: List, labelKey: 'auditTrail', path: '/compliance/audit-trail' },
          { icon: Eye, labelKey: 'accessLog', path: '/clients' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'complianceDashboard', showLanguage: true },
    home: { homeKey: 'compliance' },
  },

  it_admin: {
    role: 'it_admin',
    external: false,
    nav: [
      {
        sectionKey: 'overview',
        items: [
          {
            icon: LayoutDashboard,
            labelKey: 'systemDashboard',
            isHome: true,
            path: '/dashboard',
          },
        ],
      },
      {
        sectionKey: 'usersAndAccess',
        items: [
          { icon: Users, labelKey: 'users', path: '/users' },
          { icon: ShieldCheck, labelKey: 'rolesPermissions', path: '/settings/roles' },
          { icon: KeyRound, labelKey: 'ssoMfaConfig', path: '/settings/sso-mfa' },
        ],
      },
      {
        sectionKey: 'system',
        items: [
          { icon: Plug, labelKey: 'integrations', path: '/settings/integrations' },
          { icon: Server, labelKey: 'systemHealth', path: '/settings/system-health' },
          { icon: History, labelKey: 'auditLog', path: '/compliance/audit-trail' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'systemDashboard', showLanguage: true },
    home: { homeKey: 'systemDashboard' },
  },

  portal_client: {
    role: 'portal_client',
    external: true,
    nav: [
      {
        sectionKey: 'myPortfolio',
        items: [
          { icon: LayoutDashboard, labelKey: 'overview', isHome: true, path: '/dashboard' },
          { icon: Inbox, labelKey: 'enquiries', path: '/portal/intake' },
          { icon: Calendar, labelKey: 'myDeadlines', path: '/deadlines/my' },
        ],
      },
      {
        sectionKey: 'myMatters',
        items: [
          { icon: FolderOpen, labelKey: 'myMatters', path: '/matters' },
          { icon: FileText, labelKey: 'myDocuments', path: '/portal/documents' },
          { icon: Receipt, labelKey: 'myInvoices', path: '/portal/invoices' },
          { icon: RefreshCw, labelKey: 'renewals', path: '/portal/renewals' },
        ],
      },
      {
        sectionKey: 'communication',
        items: [
          { icon: Mail, labelKey: 'messages', path: '/portal/messages' },
          { icon: ShieldCheck, labelKey: 'approvals', path: '/portal/approvals' },
        ],
      },
    ],
    footer: [
      { icon: HelpCircle, labelKey: 'help', path: '/portal/help' },
      { icon: Settings, labelKey: 'settings', path: '/settings' },
    ],
    topbar: { breadcrumbKey: 'myPortfolio', showLanguage: true },
    home: { homeKey: 'portal_client' },
  },
}

export function getRoleView(role: SystemRole): RoleView {
  return ROLE_VIEWS[role]
}
