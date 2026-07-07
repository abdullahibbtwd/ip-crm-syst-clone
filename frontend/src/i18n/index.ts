import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

export const I18N_NAMESPACES = [
  'common',
  'nav',
  'auth',
  'dashboard',
  'deadlines',
  'renewals',
  'crm',
  'matters',
  'intake',
  'finance',
  'users',
  'settings',
  'portal',
  'reports',
] as const

export type I18nNamespace = (typeof I18N_NAMESPACES)[number]

void i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'bg'],
    ns: [...I18N_NAMESPACES],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
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

export default i18n
