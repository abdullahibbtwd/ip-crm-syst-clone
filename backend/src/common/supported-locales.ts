/** Supported UI locales — shared across team app and client portal. */
export const SUPPORTED_LOCALES = [
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
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export function isSupportedLocale(code: string): code is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(code)
}
