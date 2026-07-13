import type { NavItem, RoleView } from '../../config/role-views'

export function slugifyNav(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function navId(item: NavItem): string {
  return item.id ?? slugifyNav(item.labelKey)
}

/** Split a nav `path` that may include a query string (e.g. `/matters?matterType=patent`). */
export function splitNavPath(path: string): { pathname: string; search: string } {
  const q = path.indexOf('?')
  if (q === -1) return { pathname: path, search: '' }
  return { pathname: path.slice(0, q), search: path.slice(q + 1) }
}

/**
 * True when the current location matches a nav path.
 * Query params on the nav item must all be present on the current search
 * (extra current params are allowed).
 */
export function isNavPathActive(
  itemPath: string,
  pathname: string,
  search: string,
): boolean {
  const { pathname: itemPathname, search: itemSearch } = splitNavPath(itemPath)
  if (itemPathname === '/dashboard') {
    return pathname === '/dashboard' && !itemSearch
  }
  const pathMatch =
    pathname === itemPathname || pathname.startsWith(`${itemPathname}/`)
  if (!pathMatch) return false
  if (!itemSearch) return true
  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const required = new URLSearchParams(itemSearch)
  for (const [key, value] of required.entries()) {
    if (current.get(key) !== value) return false
  }
  return true
}

/** Prefer the most specific matching nav item (more query constraints / longer path). */
export function navPathSpecificity(path: string): number {
  const { pathname, search } = splitNavPath(path)
  const paramCount = search ? new URLSearchParams(search).size : 0
  return pathname.length * 10 + paramCount
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
  return navId(
    view.nav[0]?.items[0] ?? { icon: () => null, labelKey: 'dashboard' },
  )
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
