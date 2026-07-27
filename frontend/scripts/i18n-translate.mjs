/**
 * Machine-translate locale JSON files from English (same structure as en/bg).
 * Partners can edit the output JSON files manually later.
 *
 * Usage:
 *   node scripts/i18n-translate.mjs              # all target locales
 *   node scripts/i18n-translate.mjs --locale de  # single locale
 *   node scripts/i18n-translate.mjs --locale ru --force
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import translate from 'google-translate-api-x'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesRoot = join(__dirname, '../public/locales')
const cacheDir = join(__dirname, '.i18n-translate-cache')
const sourceLng = 'en'

const TARGET_LOCALES = [
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

const GOOGLE_LOCALE = {
  'zh-CN': 'zh-CN',
}

const CHUNK_SIZE = 35
const BATCH_DELAY_MS = 900
const TRANSLATE_OPTIONS = { from: 'en', client: 'gtx' }

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g
const SKIP_RE = /^[\s\d\W]+$/

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function protectPlaceholders(text) {
  const tokens = []
  const protectedText = text.replace(PLACEHOLDER_RE, (match) => {
    const token = `__I18N_PH_${tokens.length}__`
    tokens.push({ token, value: match })
    return token
  })
  return { protectedText, tokens }
}

function restorePlaceholders(text, tokens) {
  let result = text
  for (const { token, value } of tokens) {
    result = result.split(token).join(value)
  }
  return result
}

function collectStrings(value, path, entries) {
  if (typeof value === 'string') {
    entries.push({ path, value })
    return
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, [...path, key], entries)
    }
  }
}

function setAtPath(root, path, newValue) {
  let node = root
  for (let i = 0; i < path.length - 1; i += 1) {
    node = node[path[i]]
  }
  node[path[path.length - 1]] = newValue
}

function loadCache(locale) {
  const path = join(cacheDir, `${locale}.json`)
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return {}
  }
}

function saveCache(locale, cache) {
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
  writeFileSync(join(cacheDir, `${locale}.json`), JSON.stringify(cache, null, 2), 'utf8')
}

async function translateChunk(strings, to) {
  const payload = {}
  const meta = []

  for (const str of strings) {
    const { protectedText, tokens } = protectPlaceholders(str)
    const key = `k${meta.length}`
    payload[key] = protectedText
    meta.push({ key, tokens, original: str })
  }

  const result = await translate(payload, {
    ...TRANSLATE_OPTIONS,
    to: GOOGLE_LOCALE[to] ?? to,
  })

  const out = {}
  for (const item of meta) {
    const translated = result[item.key]?.text ?? result[item.key] ?? item.original
    const text = typeof translated === 'string' ? translated : String(translated ?? item.original)
    out[item.original] = restorePlaceholders(text, item.tokens)
  }
  return out
}

async function translateStrings(strings, locale, cache) {
  const pending = strings.filter((s) => !SKIP_RE.test(s) && !cache[s])
  const uniquePending = [...new Set(pending)]

  console.log(`  ${locale}: ${uniquePending.length} new strings (${strings.length} total)`)

  for (let i = 0; i < uniquePending.length; i += CHUNK_SIZE) {
    const chunk = uniquePending.slice(i, i + CHUNK_SIZE)
    let attempts = 0
    while (attempts < 4) {
      try {
        const translated = await translateChunk(chunk, locale)
        Object.assign(cache, translated)
        saveCache(locale, cache)
        const done = Math.min(i + CHUNK_SIZE, uniquePending.length)
        process.stdout.write(`\r  ${locale}: translated ${done}/${uniquePending.length}`)
        break
      } catch (err) {
        attempts += 1
        const wait = BATCH_DELAY_MS * attempts * 2
        console.warn(`\n  ${locale}: batch failed (attempt ${attempts}), waiting ${wait}ms…`)
        await sleep(wait)
        if (attempts >= 4) throw err
      }
    }
    await sleep(BATCH_DELAY_MS)
  }
  if (uniquePending.length > 0) process.stdout.write('\n')

  const map = {}
  for (const s of strings) {
    if (SKIP_RE.test(s)) {
      map[s] = s
    } else {
      map[s] = cache[s] ?? s
    }
  }
  return map
}

async function translateLocale(locale) {
  const sourceDir = join(localesRoot, sourceLng)
  const files = readdirSync(sourceDir).filter((f) => f.endsWith('.json'))
  const structures = {}
  const allEntries = []

  for (const file of files) {
    const ns = file.replace('.json', '')
    structures[ns] = JSON.parse(readFileSync(join(sourceDir, file), 'utf8'))
    const entries = []
    collectStrings(structures[ns], [], entries)
    for (const entry of entries) {
      allEntries.push({ ns, path: entry.path, value: entry.value })
    }
  }

  const uniqueValues = [...new Set(allEntries.map((e) => e.value))]
  const cache = loadCache(locale)
  const translationMap = await translateStrings(uniqueValues, locale, cache)

  for (const { ns, path, value } of allEntries) {
    setAtPath(structures[ns], path, translationMap[value] ?? value)
  }

  const targetDir = join(localesRoot, locale)
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })

  for (const file of files) {
    const ns = file.replace('.json', '')
    writeFileSync(
      join(targetDir, file),
      `${JSON.stringify(structures[ns], null, 2)}\n`,
      'utf8',
    )
  }

  console.log(`  ${locale}: wrote ${files.length} files`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  let locales = [...TARGET_LOCALES]
  if (args.includes('--locale')) {
    const idx = args.indexOf('--locale')
    const code = args[idx + 1]
    if (!code) throw new Error('Missing --locale value')
    locales = [code]
  }
  return locales
}

const locales = parseArgs()
console.log(`Translating ${locales.length} locale(s) from en…`)

for (const locale of locales) {
  console.log(`\n→ ${locale}`)
  await translateLocale(locale)
}

console.log('\nDone.')
