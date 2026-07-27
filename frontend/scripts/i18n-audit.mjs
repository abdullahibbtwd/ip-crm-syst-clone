/**
 * Compare locale JSON keys against English source.
 * Usage: node scripts/i18n-audit.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesRoot = join(__dirname, '../public/locales')
const sourceLng = 'en'

function collectKeys(obj, prefix = '') {
  const keys = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectKeys(value, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

const sourceDir = join(localesRoot, sourceLng)
const namespaces = readdirSync(sourceDir).filter((f) => f.endsWith('.json'))
const sourceKeys = new Map()

for (const ns of namespaces) {
  const json = JSON.parse(readFileSync(join(sourceDir, ns), 'utf8'))
  sourceKeys.set(ns.replace('.json', ''), new Set(collectKeys(json)))
}

const localeDirs = readdirSync(localesRoot).filter((d) => {
  const path = join(localesRoot, d)
  return d !== sourceLng && existsSync(join(path, namespaces[0]))
})

let hasErrors = false

for (const lng of localeDirs) {
  for (const ns of namespaces) {
    const nsName = ns.replace('.json', '')
    const path = join(localesRoot, lng, ns)
    if (!existsSync(path)) {
      console.error(`[${lng}] missing file: ${ns}`)
      hasErrors = true
      continue
    }
    const json = JSON.parse(readFileSync(path, 'utf8'))
    const keys = new Set(collectKeys(json))
    const expected = sourceKeys.get(nsName)
    const missing = [...expected].filter((k) => !keys.has(k))
    const extra = [...keys].filter((k) => !expected.has(k))
    if (missing.length) {
      hasErrors = true
      console.error(`[${lng}/${nsName}] missing ${missing.length} keys (e.g. ${missing.slice(0, 3).join(', ')})`)
    }
    if (extra.length) {
      console.warn(`[${lng}/${nsName}] extra ${extra.length} keys`)
    }
  }
}

if (!hasErrors) {
  console.log('All locales have key parity with en.')
} else {
  process.exit(1)
}
