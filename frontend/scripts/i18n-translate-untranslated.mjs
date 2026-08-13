/**
 * Translate only strings that still match English (new / untranslated keys).
 * Preserves existing locale translations. Uses same Google client as i18n-translate.mjs.
 *
 * Usage (from frontend/):
 *   node scripts/i18n-translate-untranslated.mjs
 *   node scripts/i18n-translate-untranslated.mjs --ns matters,nav
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
  'ru', 'ro', 'mk', 'sr', 'hr', 'tr', 'es', 'sq', 'bs', 'hy', 'ar', 'et',
  'zh-CN', 'ms', 'de', 'fr', 'it',
]

const GOOGLE_LOCALE = { 'zh-CN': 'zh-CN' }
const CHUNK_SIZE = 35
const BATCH_DELAY_MS = 900
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
  for (const { token, value } of tokens) result = result.split(token).join(value)
  return result
}

function collectLeaves(obj, path = [], out = []) {
  if (typeof obj === 'string') {
    out.push({ path, value: obj })
    return out
  }
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) collectLeaves(v, [...path, k], out)
  }
  return out
}

function getAt(obj, path) {
  let n = obj
  for (const p of path) {
    if (n == null || typeof n !== 'object') return undefined
    n = n[p]
  }
  return n
}

function setAt(obj, path, value) {
  let n = obj
  for (let i = 0; i < path.length - 1; i += 1) {
    if (!n[path[i]] || typeof n[path[i]] !== 'object') n[path[i]] = {}
    n = n[path[i]]
  }
  n[path[path.length - 1]] = value
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
    from: 'en',
    client: 'gtx',
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

async function translatePending(strings, locale, cache) {
  const pending = [...new Set(strings.filter((s) => !SKIP_RE.test(s) && !cache[s]))]
  console.log(`  ${locale}: ${pending.length} new / ${strings.length} still-EN`)
  for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
    const chunk = pending.slice(i, i + CHUNK_SIZE)
    let attempts = 0
    while (attempts < 4) {
      try {
        Object.assign(cache, await translateChunk(chunk, locale))
        saveCache(locale, cache)
        process.stdout.write(`\r  ${locale}: ${Math.min(i + CHUNK_SIZE, pending.length)}/${pending.length}`)
        break
      } catch (err) {
        attempts += 1
        await sleep(BATCH_DELAY_MS * attempts * 2)
        if (attempts >= 4) throw err
      }
    }
    await sleep(BATCH_DELAY_MS)
  }
  if (pending.length) process.stdout.write('\n')
}

function parseNs() {
  const args = process.argv.slice(2)
  if (args.includes('--ns')) {
    return args[args.indexOf('--ns') + 1].split(',').map((s) => s.trim())
  }
  return ['matters', 'nav']
}

const namespaces = parseNs()
const en = {}
for (const ns of namespaces) {
  en[ns] = JSON.parse(readFileSync(join(localesRoot, sourceLng, `${ns}.json`), 'utf8'))
}

console.log(`Translating still-English strings in: ${namespaces.join(', ')}`)

for (const locale of TARGET_LOCALES) {
  console.log(`\n→ ${locale}`)
  const cache = loadCache(locale)
  const need = []
  const jobs = []

  for (const ns of namespaces) {
    const targetPath = join(localesRoot, locale, `${ns}.json`)
    if (!existsSync(targetPath)) continue
    const target = JSON.parse(readFileSync(targetPath, 'utf8'))
    const leaves = collectLeaves(en[ns])
    for (const { path, value } of leaves) {
      const current = getAt(target, path)
      // Only translate when missing or still identical to English
      if (current === undefined || current === value) {
        if (!SKIP_RE.test(value)) need.push(value)
        jobs.push({ ns, path, value, target })
      }
    }
    // stash target on jobs via ns map below
    jobs._targets = jobs._targets || {}
    jobs._targets[ns] = target
  }

  await translatePending(need, locale, cache)

  const targets = {}
  for (const ns of namespaces) {
    const targetPath = join(localesRoot, locale, `${ns}.json`)
    if (!existsSync(targetPath)) continue
    targets[ns] = JSON.parse(readFileSync(targetPath, 'utf8'))
  }

  let changed = 0
  for (const ns of namespaces) {
    if (!targets[ns]) continue
    const leaves = collectLeaves(en[ns])
    for (const { path, value } of leaves) {
      const current = getAt(targets[ns], path)
      if (current === undefined || current === value) {
        const translated = SKIP_RE.test(value) ? value : (cache[value] ?? value)
        if (translated !== current) {
          setAt(targets[ns], path, translated)
          changed += 1
        }
      }
    }
    writeFileSync(
      join(localesRoot, locale, `${ns}.json`),
      `${JSON.stringify(targets[ns], null, 2)}\n`,
      'utf8',
    )
  }
  console.log(`  ${locale}: updated ${changed} string(s)`)
}

console.log('\nDone.')
