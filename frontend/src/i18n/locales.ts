/**
 * Supported application locales — office staff, partner firms, and clients use the same set.
 */
export type AppLocaleCode =
  | 'en'
  | 'bg'
  | 'ru'
  | 'ro'
  | 'mk'
  | 'sr'
  | 'hr'
  | 'tr'
  | 'es'
  | 'sq'
  | 'bs'
  | 'hy'
  | 'ar'
  | 'et'
  | 'zh-CN'
  | 'ms'
  | 'de'
  | 'fr'
  | 'it'

export type AppLocale = {
  code: AppLocaleCode
  /** Name shown in the language switcher (native script). */
  nativeName: string
  /** English label for admin / fallback. */
  englishName: string
  rtl: boolean
}

export const APP_LOCALES: readonly AppLocale[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', rtl: false },
  { code: 'bg', nativeName: 'Български', englishName: 'Bulgarian', rtl: false },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', rtl: false },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian', rtl: false },
  { code: 'mk', nativeName: 'Македонски', englishName: 'Macedonian', rtl: false },
  { code: 'sr', nativeName: 'Српски', englishName: 'Serbian', rtl: false },
  { code: 'hr', nativeName: 'Hrvatski', englishName: 'Croatian', rtl: false },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', rtl: false },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', rtl: false },
  { code: 'sq', nativeName: 'Shqip', englishName: 'Albanian', rtl: false },
  { code: 'bs', nativeName: 'Bosanski', englishName: 'Bosnian', rtl: false },
  { code: 'hy', nativeName: 'Հայերեն', englishName: 'Armenian', rtl: false },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', rtl: true },
  { code: 'et', nativeName: 'Eesti', englishName: 'Estonian', rtl: false },
  { code: 'zh-CN', nativeName: '简体中文', englishName: 'Chinese (Simplified)', rtl: false },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay', rtl: false },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', rtl: false },
  { code: 'fr', nativeName: 'Français', englishName: 'French', rtl: false },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', rtl: false },
]

export const SUPPORTED_LOCALE_CODES: AppLocaleCode[] = APP_LOCALES.map((l) => l.code)

const localeByCode = new Map(APP_LOCALES.map((l) => [l.code, l]))

export function isSupportedLocale(code: string): code is AppLocaleCode {
  return localeByCode.has(code as AppLocaleCode)
}

export function getLocale(code: string): AppLocale | undefined {
  return localeByCode.get(code as AppLocaleCode)
}

export function isRtlLocale(code: string): boolean {
  return getLocale(code)?.rtl ?? false
}

export function applyDocumentDirection(locale: string): void {
  const root = document.documentElement
  const rtl = isRtlLocale(locale)
  root.setAttribute('dir', rtl ? 'rtl' : 'ltr')
  root.setAttribute('lang', locale)
}
