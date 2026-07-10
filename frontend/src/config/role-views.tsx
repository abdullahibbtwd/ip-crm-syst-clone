import type { LucideIcon } from 'lucide-react'
import {
  Atom,
  Award,
  Banknote,
  BarChart3,
  Bell,
  Calendar,
  CalendarPlus,
  Building2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Eye,
  FileOutput,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HelpCircle,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  List,
  Lock,
  Mail,
  Megaphone,
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
  Trash2,
  Upload,
  Users,
  UsersRound,
} from 'lucide-react'
import type { SystemRole } from '../lib/rbac'

export type NavItem = {
  icon: LucideIcon
  labelKey: string
  id?: string
  path?: string
  isHome?: boolean
  isFooter?: boolean
  active?: boolean
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
        ],
      },
      {
        sectionKey: 'matters',
        items: [
          { icon: FolderOpen, labelKey: 'allMatters', path: '/matters' },
          { icon: Inbox, labelKey: 'intakeQueue', path: '/intake' },
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
        items: [{ icon: Receipt, labelKey: 'billingOverview', path: '/billing-overview' }],
      },
      {
        sectionKey: 'reports',
        items: [
          { icon: BarChart3, labelKey: 'deadlineRisk', path: '/reports/deadline-risk' },
          { icon: FileOutput, labelKey: 'filingVolumes', path: '/reports/filing-volumes' },
          { icon: RefreshCw, labelKey: 'renewalsSummary', path: '/reports/renewals-summary' },
          { icon: PieChart, labelKey: 'revenueReceivables', path: '/reports/revenue-summary' },
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
          { icon: Mail, labelKey: 'emailQueue', path: '/email-queue' },
          { icon: Megaphone, labelKey: 'broadcasts', path: '/broadcasts' },
        ],
      },
      {
        sectionKey: 'system',
        items: [
          { icon: CalendarPlus, labelKey: 'deadlineRules', path: '/settings/deadline-rules' },
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
          { icon: FolderOpen, labelKey: 'myMatters', path: '/matters' },
          { icon: Atom, labelKey: 'patentFilings' },
          { icon: Upload, labelKey: 'officeActions' },
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
          { icon: FileText, labelKey: 'documents' },
          { icon: Mail, labelKey: 'emailQueue', path: '/email-queue' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'myDashboard', showLanguage: true, showTasks: true },
    home: { homeKey: 'myDashboard', comingSoon: true },
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
          { icon: ShieldCheck, labelKey: 'myTmMatters', path: '/matters' },
          { icon: Upload, labelKey: 'oppositions' },
          { icon: RefreshCw, labelKey: 'renewals', path: '/renewals' },
          { icon: Eye, labelKey: 'watchAlerts', path: '/watch-alerts' },
        ],
      },
      {
        sectionKey: 'rights',
        items: [{ icon: Award, labelKey: 'rightsRegister', path: '/ip-rights' }],
      },
      {
        sectionKey: 'communication',
        items: [
          { icon: FileText, labelKey: 'documents' },
          { icon: Mail, labelKey: 'emailQueue', path: '/email-queue' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'myDashboard', showLanguage: true, showTasks: true },
    home: { homeKey: 'myDashboard', comingSoon: true },
  },

  coordinator: {
    role: 'coordinator',
    external: false,
    nav: [
      {
        sectionKey: 'overview',
        items: [
          { icon: LayoutDashboard, labelKey: 'dashboard', isHome: true, path: '/dashboard' },
          { icon: Inbox, labelKey: 'intakeQueue', path: '/intake' },
          { icon: Calendar, labelKey: 'deadlines', path: '/deadlines' },
        ],
      },
      {
        sectionKey: 'clients',
        items: [
          { icon: Users, labelKey: 'clients', path: '/clients' },
          { icon: Building2, labelKey: 'holdingGroups', path: '/holding-groups' },
          { icon: FolderOpen, labelKey: 'matters', path: '/matters' },
          { icon: RefreshCw, labelKey: 'renewals', path: '/renewals' },
          { icon: Search, labelKey: 'conflictCheck' },
        ],
      },
      {
        sectionKey: 'communication',
        items: [
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
          { icon: Bell, labelKey: 'escalations' },
        ],
      },
      {
        sectionKey: 'deadlines',
        items: [
          { icon: FolderOpen, labelKey: 'matters', path: '/matters' },
          { icon: RefreshCw, labelKey: 'renewals', path: '/renewals' },
          { icon: Clock, labelKey: 'gracePeriods' },
          { icon: CalendarPlus, labelKey: 'addDeadline', path: '/deadlines' },
          { icon: List, labelKey: 'deadlineRules', path: '/settings/deadline-rules' },
        ],
      },
      {
        sectionKey: 'correspondence',
        items: [
          { icon: Mail, labelKey: 'incomingMail', path: '/email-queue' },
          { icon: Send, labelKey: 'outgoingMail' },
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
          { icon: FolderOpen, labelKey: 'assignedMatters', path: '/matters' },
          { icon: Users, labelKey: 'clients', path: '/clients' },
        ],
      },
      {
        sectionKey: 'documentsAndMail',
        items: [
          { icon: FileText, labelKey: 'documents' },
          { icon: Mail, labelKey: 'correspondence' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'myTasks', showLanguage: true, showTasks: true },
    home: { homeKey: 'myTasks', comingSoon: true },
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
          { icon: CircleDollarSign, labelKey: 'timeEntries' },
          { icon: Banknote, labelKey: 'payments', path: '/invoices?paymentStatus=unpaid' },
          { icon: CreditCard, labelKey: 'rateCards', path: '/rate-cards' },
        ],
      },
      {
        sectionKey: 'reports',
        items: [
          { icon: PieChart, labelKey: 'revenueReceivables', path: '/reports/revenue-summary' },
          { icon: FileSpreadsheet, labelKey: 'disbursements' },
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
          { icon: Lock, labelKey: 'consentRecords' },
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
        items: [{ icon: LayoutDashboard, labelKey: 'systemDashboard', isHome: true }],
      },
      {
        sectionKey: 'usersAndAccess',
        items: [
          { icon: Users, labelKey: 'users', path: '/users' },
          { icon: ShieldCheck, labelKey: 'rolesPermissions' },
          { icon: KeyRound, labelKey: 'ssoMfaConfig' },
        ],
      },
      {
        sectionKey: 'system',
        items: [
          { icon: Plug, labelKey: 'integrations', path: '/settings/integrations' },
          { icon: Server, labelKey: 'systemHealth' },
          { icon: History, labelKey: 'auditLog', path: '/compliance/audit-trail' },
        ],
      },
    ],
    footer: [{ icon: Settings, labelKey: 'settings', path: '/settings' }],
    topbar: { breadcrumbKey: 'systemDashboard', showLanguage: true },
    home: { homeKey: 'systemDashboard', comingSoon: true },
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
        items: [{ icon: Mail, labelKey: 'messages' }],
      },
    ],
    footer: [{ icon: HelpCircle, labelKey: 'help' }],
    topbar: { breadcrumbKey: 'myPortfolio', showLanguage: true },
    home: { homeKey: 'portal_client' },
  },
}

export function getRoleView(role: SystemRole): RoleView {
  return ROLE_VIEWS[role]
}
