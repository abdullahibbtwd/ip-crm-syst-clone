import type { NavItem, RoleView } from '../../config/role-views'

export function slugifyNav(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function navId(item: NavItem): string {
  return item.id ?? slugifyNav(item.label)
}

export function findNavItem(view: RoleView, id: string): NavItem | null {
  for (const section of view.nav) {
    const match = section.items.find((item) => navId(item) === id)
    if (match) return match
  }
  for (const item of view.footer) {
    if (navId(item) === id) return item
  }
  return null
}

export function getHomeNavId(view: RoleView): string {
  for (const section of view.nav) {
    for (const item of section.items) {
      if (item.isHome) return navId(item)
    }
  }
  return navId(view.nav[0]?.items[0] ?? { icon: () => null, label: 'dashboard' })
}

export function isHomeNav(view: RoleView, id: string): boolean {
  const item = findNavItem(view, id)
  return item?.isHome === true
}

export function withActiveNav(view: RoleView, activeNavId: string): RoleView {
  return {
    ...view,
    nav: view.nav.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        active: navId(item) === activeNavId,
      })),
    })),
    footer: view.footer.map((item) => ({
      ...item,
      active: navId(item) === activeNavId,
    })),
  }
}
