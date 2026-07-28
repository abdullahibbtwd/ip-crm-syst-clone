/**
 * Export all locale files into one master JSON for translators.
 * Each entry = one UI string with English description + every language side by side.
 *
 * Usage: node scripts/i18n-export-master.mjs
 * Output: public/locales/i18n-master.json
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesRoot = join(__dirname, '../public/locales')
const outputPath = join(localesRoot, 'i18n-master.json')

const LOCALE_CODES = [
  'en',
  'bg',
  'ru',
  'ro',
  'mk',
  'sr',
  'hr',
  'tr',
  'es',
  'sq',
  'bs',
  'hy',
  'ar',
  'et',
  'zh-CN',
  'ms',
  'de',
  'fr',
  'it',
]

const NAMESPACE_HINTS = {
  common: 'Shared UI (buttons, filters, loading)',
  nav: 'Navigation and menus',
  auth: 'Login, MFA, password, invites',
  dashboard: 'Dashboard home screens',
  deadlines: 'Deadlines module',
  alerts: 'Alerts',
  renewals: 'Renewals',
  watch: 'Trademark watch',
  crm: 'CRM / clients',
  matters: 'Matters and case work',
  intake: 'Intake / new business',
  finance: 'Billing and finance',
  users: 'Users and team',
  settings: 'Settings and admin',
  partners: 'Partner firms',
  portal: 'Client portal',
  reports: 'Reports',
  emailQueue: 'Email queue',
  broadcasts: 'Broadcasts',
  compliance: 'Compliance and GDPR',
  precedents: 'Precedents library',
  documents: 'Documents',
}

function flattenStrings(obj, prefix = '') {
  const out = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...flattenStrings(value, path))
    } else if (typeof value === 'string') {
      out.push({ path, value })
    }
  }
  return out
}

function humanKey(path) {
  return path
    .split('.')
    .map((part) =>
      part
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    )
    .join(' → ')
}

function describe(namespace, path, en) {
  const area = NAMESPACE_HINTS[namespace] ?? namespace
  return `${area}. Field: ${humanKey(path)}. English text: "${en}".`
}

const enDir = join(localesRoot, 'en')
const namespaces = readdirSync(enDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''))

const entries = []

for (const ns of namespaces) {
  const enFile = join(enDir, `${ns}.json`)
  const enJson = JSON.parse(readFileSync(enFile, 'utf8'))
  const flat = flattenStrings(enJson)

  for (const { path, value: enValue } of flat) {
    const id = `${ns}.${path}`
    const entry = {
      id,
      namespace: ns,
      key: path,
      description: describe(ns, path, enValue),
      en: enValue,
    }

    for (const locale of LOCALE_CODES) {
      if (locale === 'en') continue
      const filePath = join(localesRoot, locale, `${ns}.json`)
      if (!existsSync(filePath)) {
        entry[locale] = ''
        continue
      }
      const json = JSON.parse(readFileSync(filePath, 'utf8'))
      let node = json
      for (const part of path.split('.')) {
        node = node?.[part]
      }
      entry[locale] = typeof node === 'string' ? node : ''
    }

    entries.push(entry)
  }
}

entries.sort((a, b) => a.id.localeCompare(b.id))

const master = {
  meta: {
    purpose:
      'Master translation sheet. Each entry is one UI string: English reference, short English explanation, and all locale values. Edit locale columns and import back with i18n-import-master.mjs (when available).',
    generatedAt: new Date().toISOString(),
    locales: LOCALE_CODES,
    namespaces,
    totalEntries: entries.length,
  },
  entries,
}

writeFileSync(outputPath, `${JSON.stringify(master, null, 2)}\n`, 'utf8')
console.log(`Written ${entries.length} entries to ${outputPath}`)
