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
  label: string
  id?: string
  path?: string
  isHome?: boolean
  isFooter?: boolean
  active?: boolean
}

export type NavSection = {
  section: string
  items: NavItem[]
}

export type RoleView = {
  role: SystemRole
  external: boolean
  nav: NavSection[]
  footer: NavItem[]
  topbar: {
    breadcrumb: string
    showLanguage?: boolean
    showTasks?: boolean
  }
  home: {
    title: string
    description: string
  }
}

const COMING_SOON =
  'Coming soon - this area will show live data once the module is connected.'

function home(title: string): RoleView['home'] {
  return { title, description: COMING_SOON }
}

const ROLE_VIEWS: Record<SystemRole, RoleView> = {
  managing_partner: {
    role: 'managing_partner',
    external: false,
    nav: [
      {
        section: 'Overview',
        items: [
          { icon: LayoutDashboard, label: 'Dashboard', isHome: true, path: '/dashboard' },
          { icon: Calendar, label: 'Deadlines', path: '/deadlines' },
          { icon: Bell, label: 'Alerts' },
        ],
      },
      {
        section: 'Clients',
        items: [
          { icon: Users, label: 'Clients', path: '/clients' },
          { icon: Building2, label: 'Holding groups', path: '/holding-groups' },
        ],
      },
      {
        section: 'Matters',
        items: [
          { icon: FolderOpen, label: 'All matters', path: '/matters' },
          { icon: Inbox, label: 'Intake queue', path: '/intake' },
        ],
      },
      {
        section: 'IP Rights',
        items: [
          { icon: Award, label: 'Rights register' },
          { icon: RefreshCw, label: 'Renewals', path: '/renewals' },
          { icon: Eye, label: 'Watch' },
        ],
      },
      {
        section: 'Finance',
        items: [
          { icon: Receipt, label: 'Billing overview' },
          { icon: BarChart3, label: 'Reports' },
        ],
      },
    ],
    footer: [
      { icon: UsersRound, label: 'Team', path: '/users/team' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
    topbar: { breadcrumb: 'Dashboard', showLanguage: true, showTasks: true },
    home: home('Firm overview'),
  },

  ip_attorney: {
    role: 'ip_attorney',
    external: false,
    nav: [
      {
        section: 'My work',
        items: [
          { icon: LayoutDashboard, label: 'My dashboard', isHome: true, path: '/dashboard' },
          { icon: Calendar, label: 'My deadlines', path: '/deadlines/my' },
        ],
      },
      {
        section: 'Matters',
        items: [
          { icon: FolderOpen, label: 'My matters', path: '/matters' },
          { icon: Atom, label: 'Patent filings' },
          { icon: Upload, label: 'Office actions' },
        ],
      },
      {
        section: 'Rights',
        items: [
          { icon: Award, label: 'Rights register' },
          { icon: RefreshCw, label: 'Renewals', path: '/renewals' },
        ],
      },
      {
        section: 'Communication',
        items: [
          { icon: FileText, label: 'Documents' },
          { icon: Mail, label: 'Correspondence' },
        ],
      },
    ],
    footer: [{ icon: Settings, label: 'Settings', path: '/settings' }],
    topbar: { breadcrumb: 'My dashboard', showTasks: true },
    home: home('My dashboard'),
  },

  trademark_attorney: {
    role: 'trademark_attorney',
    external: false,
    nav: [
      {
        section: 'My work',
        items: [
          { icon: LayoutDashboard, label: 'My dashboard', isHome: true, path: '/dashboard' },
          { icon: Calendar, label: 'My deadlines', path: '/deadlines/my' },
        ],
      },
      {
        section: 'Trademarks',
        items: [
          { icon: ShieldCheck, label: 'My TM matters', path: '/matters' },
          { icon: Upload, label: 'Oppositions' },
          { icon: RefreshCw, label: 'Renewals', path: '/renewals' },
          { icon: Eye, label: 'Watch alerts' },
        ],
      },
      {
        section: 'Rights',
        items: [{ icon: Award, label: 'Rights register' }],
      },
      {
        section: 'Communication',
        items: [
          { icon: FileText, label: 'Documents' },
          { icon: Mail, label: 'Correspondence' },
        ],
      },
    ],
    footer: [{ icon: Settings, label: 'Settings', path: '/settings' }],
    topbar: { breadcrumb: 'My dashboard', showTasks: true },
    home: home('My dashboard'),
  },

  coordinator: {
    role: 'coordinator',
    external: false,
    nav: [
      {
        section: 'Overview',
        items: [
          { icon: LayoutDashboard, label: 'Dashboard', isHome: true, path: '/dashboard' },
          { icon: Inbox, label: 'Intake queue', path: '/intake' },
          { icon: Calendar, label: 'Deadlines', path: '/deadlines' },
        ],
      },
      {
        section: 'Clients',
        items: [
          { icon: Users, label: 'Clients', path: '/clients' },
          { icon: Building2, label: 'Holding groups', path: '/holding-groups' },
          { icon: FolderOpen, label: 'Matters', path: '/matters' },
          { icon: RefreshCw, label: 'Renewals', path: '/renewals' },
          { icon: Search, label: 'Conflict check' },
        ],
      },
      {
        section: 'Communication',
        items: [{ icon: Mail, label: 'Correspondence' }],
      },
    ],
    footer: [{ icon: Settings, label: 'Settings', path: '/settings' }],
    topbar: { breadcrumb: 'Dashboard', showTasks: true },
    home: home('Intake & coordination'),
  },

  docketing_admin: {
    role: 'docketing_admin',
    external: false,
    nav: [
      {
        section: 'Overview',
        items: [
          { icon: LayoutDashboard, label: 'Dashboard', isHome: true, path: '/dashboard' },
          { icon: Calendar, label: 'All deadlines', path: '/deadlines' },
          { icon: Bell, label: 'Escalations' },
        ],
      },
      {
        section: 'Deadlines',
        items: [
          { icon: FolderOpen, label: 'Matters', path: '/matters' },
          { icon: RefreshCw, label: 'Renewals', path: '/renewals' },
          { icon: Clock, label: 'Grace periods' },
          { icon: CalendarPlus, label: 'Add deadline', path: '/deadlines' },
        ],
      },
      {
        section: 'Correspondence',
        items: [
          { icon: Mail, label: 'Incoming mail' },
          { icon: Send, label: 'Outgoing mail' },
        ],
      },
    ],
    footer: [{ icon: Settings, label: 'Settings', path: '/settings' }],
    topbar: { breadcrumb: 'Dashboard', showTasks: true },
    home: home('Deadline board'),
  },

  paralegal: {
    role: 'paralegal',
    external: false,
    nav: [
      {
        section: 'Overview',
        items: [
          { icon: LayoutDashboard, label: 'My tasks', isHome: true, path: '/dashboard' },
          { icon: Calendar, label: 'My deadlines', path: '/deadlines/my' },
        ],
      },
      {
        section: 'Matters',
        items: [
          { icon: FolderOpen, label: 'Assigned matters', path: '/matters' },
          { icon: Users, label: 'Clients', path: '/clients' },
        ],
      },
      {
        section: 'Documents & mail',
        items: [
          { icon: FileText, label: 'Documents' },
          { icon: Mail, label: 'Correspondence' },
        ],
      },
    ],
    footer: [{ icon: Settings, label: 'Settings', path: '/settings' }],
    topbar: { breadcrumb: 'My tasks', showTasks: true },
    home: home('My tasks'),
  },

  finance: {
    role: 'finance',
    external: false,
    nav: [
      {
        section: 'Overview',
        items: [{ icon: LayoutDashboard, label: 'Finance dashboard', isHome: true }],
      },
      {
        section: 'Billing',
        items: [
          { icon: Receipt, label: 'Invoices', path: '/invoices' },
          { icon: CircleDollarSign, label: 'Time entries' },
          { icon: Banknote, label: 'Payments', path: '/invoices?paymentStatus=unpaid' },
          { icon: CreditCard, label: 'Rate cards', path: '/rate-cards' },
        ],
      },
      {
        section: 'Receivables',
        items: [
          { icon: PieChart, label: 'Receivables' },
          { icon: FileSpreadsheet, label: 'Disbursements' },
        ],
      },
    ],
    footer: [{ icon: Settings, label: 'Settings', path: '/settings' }],
    topbar: { breadcrumb: 'Finance dashboard' },
    home: home('Finance overview'),
  },

  dpo_compliance: {
    role: 'dpo_compliance',
    external: false,
    nav: [
      {
        section: 'Overview',
        items: [{ icon: LayoutDashboard, label: 'Compliance dashboard', isHome: true }],
      },
      {
        section: 'GDPR',
        items: [
          { icon: Shield, label: 'Personal data register' },
          { icon: FileOutput, label: 'Data exports log' },
          { icon: Trash2, label: 'Retention rules' },
          { icon: Lock, label: 'Consent records' },
        ],
      },
      {
        section: 'Audit',
        items: [
          { icon: List, label: 'Audit trail' },
          { icon: Eye, label: 'Access log' },
        ],
      },
    ],
    footer: [{ icon: Settings, label: 'Settings', path: '/settings' }],
    topbar: { breadcrumb: 'Compliance dashboard' },
    home: home('Compliance'),
  },

  it_admin: {
    role: 'it_admin',
    external: false,
    nav: [
      {
        section: 'Overview',
        items: [{ icon: LayoutDashboard, label: 'System dashboard', isHome: true }],
      },
      {
        section: 'Users & access',
        items: [
          { icon: Users, label: 'Users', path: '/users' },
          { icon: ShieldCheck, label: 'Roles & permissions' },
          { icon: KeyRound, label: 'SSO / MFA config' },
        ],
      },
      {
        section: 'System',
        items: [
          { icon: Plug, label: 'Integrations' },
          { icon: Server, label: 'System health' },
          { icon: History, label: 'Audit log' },
        ],
      },
    ],
    footer: [{ icon: Settings, label: 'Settings', path: '/settings' }],
    topbar: { breadcrumb: 'System dashboard' },
    home: home('System dashboard'),
  },

  portal_client: {
    role: 'portal_client',
    external: true,
    nav: [
      {
        section: 'My portfolio',
        items: [
          { icon: LayoutDashboard, label: 'Overview', isHome: true, path: '/dashboard' },
          { icon: Inbox, label: 'Enquiries', path: '/portal/intake' },
          { icon: Calendar, label: 'My deadlines', path: '/deadlines/my' },
        ],
      },
      {
        section: 'My matters',
        items: [
          { icon: FolderOpen, label: 'My matters', path: '/matters' },
          { icon: FileText, label: 'My documents', path: '/portal/documents' },
          { icon: Receipt, label: 'My invoices', path: '/portal/invoices' },
          { icon: RefreshCw, label: 'Renewals', path: '/portal/renewals' },
        ],
      },
      {
        section: 'Communication',
        items: [{ icon: Mail, label: 'Messages' }],
      },
    ],
    footer: [{ icon: HelpCircle, label: 'Help' }],
    topbar: { breadcrumb: 'My portfolio' },
    home: {
      title: 'My portfolio',
      description: 'Submit filing enquiries and track matters for your organisation.',
    },
  },
}

export function getRoleView(role: SystemRole): RoleView {
  return ROLE_VIEWS[role]
}
