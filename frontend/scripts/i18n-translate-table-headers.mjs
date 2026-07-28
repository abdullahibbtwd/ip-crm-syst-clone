/**
 * Translate table-header strings in matters.json + finance.json where value still matches English.
 * Usage: node scripts/i18n-translate-table-headers.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import translate from 'google-translate-api-x'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesRoot = join(__dirname, '../public/locales')
const sourceLng = 'en'

const TARGET_LOCALES = [
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

const FILES = ['matters.json', 'finance.json']
const PATHS = [
  ['table', 'jurisdiction'],
  ['table', 'leadAttorney'],
  ['table', 'deadlines'],
  ['table', 'created'],
  ['invoices', 'table', 'invoice'],
  ['invoices', 'table', 'matter'],
  ['invoices', 'table', 'issueDate'],
  ['invoices', 'table', 'total'],
]

const GOOGLE_LOCALE = { 'zh-CN': 'zh-CN' }
const BATCH_DELAY_MS = 800

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getAtPath(obj, path) {
  let node = obj
  for (const key of path) {
    if (node == null || typeof node !== 'object') return undefined
    node = node[key]
  }
  return node
}

function setAtPath(obj, path, value) {
  let node = obj
  for (let i = 0; i < path.length - 1; i += 1) {
    if (node[path[i]] == null || typeof node[path[i]] !== 'object') {
      node[path[i]] = {}
    }
    node = node[path[i]]
  }
  node[path[path.length - 1]] = value
}

async function translateBatch(entries, locale) {
  if (entries.length === 0) return {}
  const payload = {}
  const originals = []
  for (let i = 0; i < entries.length; i += 1) {
    payload[`k${i}`] = entries[i].en
    originals.push(entries[i])
  }
  const result = await translate(payload, {
    from: 'en',
    to: GOOGLE_LOCALE[locale] ?? locale,
    client: 'gtx',
  })
  const out = {}
  for (let i = 0; i < originals.length; i += 1) {
    const text = result[`k${i}`]?.text ?? entries[i].en
    out[originals[i].key] = text
  }
  return out
}

for (const locale of TARGET_LOCALES) {
  const pending = []

  for (const file of FILES) {
    const enPath = join(localesRoot, sourceLng, file)
    const localePath = join(localesRoot, locale, file)
    if (!existsSync(localePath)) continue

    const enJson = JSON.parse(readFileSync(enPath, 'utf8'))
    const localeJson = JSON.parse(readFileSync(localePath, 'utf8'))

    for (const path of PATHS) {
      const enValue = getAtPath(enJson, path)
      const localeValue = getAtPath(localeJson, path)
      if (typeof enValue !== 'string' || typeof localeValue !== 'string') continue
      if (localeValue !== enValue) continue
      pending.push({ file, path, en: enValue, key: `${file}:${path.join('.')}` })
    }
  }

  if (pending.length === 0) {
    console.log(`${locale}: nothing to translate`)
    continue
  }

  console.log(`${locale}: translating ${pending.length} header(s)…`)
  let attempts = 0
  while (attempts < 4) {
    try {
      const translated = await translateBatch(pending, locale)
      for (const item of pending) {
        const localePath = join(localesRoot, locale, item.file)
        const localeJson = JSON.parse(readFileSync(localePath, 'utf8'))
        setAtPath(localeJson, item.path, translated[item.key])
        writeFileSync(localePath, `${JSON.stringify(localeJson, null, 2)}\n`, 'utf8')
      }
      console.log(`${locale}: done`)
      break
    } catch (err) {
      attempts += 1
      console.warn(`${locale}: failed (${attempts}/4)`, err.message)
      await sleep(BATCH_DELAY_MS * attempts * 2)
      if (attempts >= 4) throw err
    }
  }
  await sleep(BATCH_DELAY_MS)
}

console.log('Table header translation complete.')
