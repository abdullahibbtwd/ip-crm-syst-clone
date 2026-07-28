/**
 * Add missing keys from en locale files into all other locales (keeps existing translations).
 * Usage: node scripts/i18n-sync-keys.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesRoot = join(__dirname, '../public/locales')
const sourceLng = 'en'

function deepMergeMissing(source, target) {
  const out = target && typeof target === 'object' && !Array.isArray(target) ? { ...target } : {}
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMergeMissing(value, out[key])
    } else if (out[key] === undefined) {
      out[key] = value
    }
  }
  return out
}

const sourceDir = join(localesRoot, sourceLng)
const namespaces = readdirSync(sourceDir).filter((f) => f.endsWith('.json'))

const localeDirs = readdirSync(localesRoot).filter((d) => {
  if (d === sourceLng) return false
  return existsSync(join(localesRoot, d, namespaces[0]))
})

let updated = 0

for (const lng of localeDirs) {
  for (const ns of namespaces) {
    const sourcePath = join(sourceDir, ns)
    const targetPath = join(localesRoot, lng, ns)
    if (!existsSync(targetPath)) continue

    const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
    const target = JSON.parse(readFileSync(targetPath, 'utf8'))
    const merged = deepMergeMissing(source, target)
    const before = JSON.stringify(target)
    const after = JSON.stringify(merged)
    if (before !== after) {
      writeFileSync(targetPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
      updated += 1
      console.log(`[${lng}/${ns.replace('.json', '')}] synced missing keys`)
    }
  }
}

console.log(`Sync complete: ${updated} file(s) updated.`)
