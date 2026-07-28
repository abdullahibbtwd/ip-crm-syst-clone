import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

import {
  applyDocumentDirection,
  isSupportedLocale,
  SUPPORTED_LOCALE_CODES,
} from './locales'

export const I18N_NAMESPACES = [
  'common',
  'nav',
  'auth',
  'dashboard',
  'deadlines',
  'alerts',
  'renewals',
  'watch',
  'crm',
  'matters',
  'intake',
  'finance',
  'users',
  'settings',
  'partners',
  'portal',
  'reports',
  'emailQueue',
  'broadcasts',
  'compliance',
  'precedents',
  'documents',
] as const

export type I18nNamespace = (typeof I18N_NAMESPACES)[number]

const fallbackLng: Record<string, string[]> = {
  'zh-CN': ['en'],
  bs: ['sr', 'en'],
  hr: ['sr', 'en'],
  mk: ['bg', 'en'],
  default: ['en'],
}

void i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng,
    supportedLngs: [...SUPPORTED_LOCALE_CODES],
    ns: [...I18N_NAMESPACES],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json?v=20260728a',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
    react: {
      useSuspense: false,
    },
  })

i18n.on('initialized', () => {
  const lng = isSupportedLocale(i18n.language) ? i18n.language : 'en'
  applyDocumentDirection(lng)
})

i18n.on('languageChanged', (lng) => {
  applyDocumentDirection(isSupportedLocale(lng) ? lng : 'en')
})

export default i18n
