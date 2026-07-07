// One-off batch i18n helper - run from frontend/
import { readFileSync, writeFileSync } from 'fs'

const updates = [
  {
    file: 'src/pages/intake/IntakeListPage.tsx',
    replacements: [
      [`import { Plus, Search } from 'lucide-react'`, `import { Plus, Search } from 'lucide-react'\nimport { useTranslation } from 'react-i18next'`],
      [`import { INTAKE_STATUS_LABELS } from '@/features/intake/utils'`, `import { intakeStatusLabel } from '@/features/intake/utils'`],
      [`export function IntakeListPage() {\n  const [searchInput`, `export function IntakeListPage() {\n  const { t } = useTranslation(['intake', 'common'])\n  const [searchInput`],
      [`<h1 className="font-serif text-2xl text-foreground md:text-3xl">Intake queue</h1>`, `<h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('list.title')}</h1>`],
      [`New enquiries, conflict checks, and conversion to clients. {INTAKE_PAGE_SIZE} leads per\n            page.`, `{t('list.description')}`],
      [`New enquiry`, `{t('list.new')}`],
      [`placeholder="Search company, name, email…"`, `placeholder={t('list.searchPlaceholder')}`],
      [`<SelectValue placeholder="All statuses" />`, `<SelectValue placeholder={t('filters.allStatuses', { ns: 'common' })} />`],
      [`<SelectItem value={ALL_STATUSES}>All statuses</SelectItem>`, `<SelectItem value={ALL_STATUSES}>{t('filters.allStatuses', { ns: 'common' })}</SelectItem>`],
      [`(Object.keys(INTAKE_STATUS_LABELS) as IntakeStatus[]).map((status) => (\n              <SelectItem key={status} value={status}>\n                {INTAKE_STATUS_LABELS[status]}`, `(['new', 'reviewing', 'conflict_check', 'conflict_flagged', 'approved', 'rejected', 'converted'] as IntakeStatus[]).map((status) => (\n              <SelectItem key={status} value={status}>\n                {intakeStatusLabel(status)}`],
    ],
  },
  {
    file: 'src/pages/users/UsersLayout.tsx',
    replacements: [
      [`import { UsersRound } from 'lucide-react'`, `import { UsersRound } from 'lucide-react'\nimport { useTranslation } from 'react-i18next'`],
      [`export function UsersLayout() {\n  return (`, `export function UsersLayout() {\n  const { t } = useTranslation('users')\n  return (`],
      [`<h1 className="font-serif text-xl text-foreground">Access restricted</h1>`, `<h1 className="font-serif text-xl text-foreground">{t('layout.accessRestricted')}</h1>`],
      [`You do not have permission to view users and team members.`, `{t('layout.noPermission')}`],
      [`<h1 className="font-serif text-2xl text-foreground md:text-3xl">Users & team</h1>`, `<h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('layout.title')}</h1>`],
      [`Manage internal team members and external portal client accounts. SSO and\n              password-based sign-in are shown per user.`, `{t('layout.description')}`],
    ],
  },
  {
    file: 'src/components/users/UsersTabNav.tsx',
    replacements: [
      [`import { NavLink } from 'react-router-dom'`, `import { NavLink } from 'react-router-dom'\nimport { useTranslation } from 'react-i18next'`],
      [`const tabs = [\n  { to: '/users/team', label: 'Team', icon: UsersRound, description: 'Internal staff' },\n  { to: '/users/portal', label: 'Portal users', icon: UserRound, description: 'Client accounts' },\n] as const`, `const tabs = [\n  { to: '/users/team', labelKey: 'tabs.team.label', descKey: 'tabs.team.description', icon: UsersRound },\n  { to: '/users/portal', labelKey: 'tabs.portal.label', descKey: 'tabs.portal.description', icon: UserRound },\n] as const`],
      [`export function UsersTabNav() {\n  return (`, `export function UsersTabNav() {\n  const { t } = useTranslation('users')\n  return (`],
      [`<span>{tab.label}</span>\n          <span className="hidden text-xs text-muted-foreground sm:inline">· {tab.description}</span>`, `<span>{t(tab.labelKey)}</span>\n          <span className="hidden text-xs text-muted-foreground sm:inline">· {t(tab.descKey)}</span>`],
    ],
  },
  {
    file: 'src/pages/crm/clients/ClientLayout.tsx',
    replacements: [
      [`import { Outlet`, `import { useTranslation } from 'react-i18next'\nimport { Outlet`],
      [`export function ClientLayout()`, `export function ClientLayout()`],
    ],
  },
]

for (const { file, replacements } of updates) {
  let content = readFileSync(file, 'utf8')
  for (const [from, to] of replacements) {
    if (!content.includes(from)) {
      console.warn(`SKIP (not found) in ${file}:`, from.slice(0, 60))
      continue
    }
    content = content.replace(from, to)
  }
  writeFileSync(file, content)
  console.log('Updated', file)
}
