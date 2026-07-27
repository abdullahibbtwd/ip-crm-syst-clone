/**
 * Copy English locale files to new locale folders (English placeholder until translated).
 * Usage: node scripts/i18n-scaffold.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesRoot = join(__dirname, '../public/locales')
const sourceLng = 'en'

const targetLocales = [
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

const sourceDir = join(localesRoot, sourceLng)
const files = readdirSync(sourceDir).filter((f) => f.endsWith('.json'))

let created = 0
let skipped = 0

for (const lng of targetLocales) {
  const targetDir = join(localesRoot, lng)
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  for (const file of files) {
    const dest = join(targetDir, file)
    if (existsSync(dest)) {
      skipped += 1
      continue
    }
    cpSync(join(sourceDir, file), dest)
    created += 1
  }
}

console.log(`Scaffold complete: ${created} files created, ${skipped} skipped (already exist).`)
