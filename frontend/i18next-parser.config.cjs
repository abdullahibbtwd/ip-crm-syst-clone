module.exports = {
  contextSeparator: '_',
  createOldCatalogs: false,
  defaultNamespace: 'common',
  defaultValue: (locale, _namespace, key) => (locale === 'en' ? key : ''),
  indentation: 2,
  keepRemoved: false,
  keySeparator: '.',
  lexers: {
    ts: ['JavascriptLexer'],
    tsx: ['JsxLexer'],
    js: ['JavascriptLexer'],
    jsx: ['JsxLexer'],
  },
  locales: ['en', 'bg'],
  namespaceSeparator: ':',
  output: 'public/locales/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{ts,tsx}'],
  sort: true,
  customValueTemplate: null,
  namespace: (filePath) => {
    const normalized = filePath.replace(/\\/g, '/')
    if (
      normalized.includes('/features/reports/') ||
      normalized.includes('/components/reports/') ||
      normalized.includes('/pages/reports/')
    ) {
      return 'reports'
    }
    if (
      normalized.includes('/features/renewals/') ||
      normalized.includes('/pages/renewals/') ||
      normalized.includes('/components/reports/Renewals')
    ) {
      return 'renewals'
    }
    if (
      normalized.includes('/features/deadlines/') ||
      normalized.includes('/pages/deadlines/') ||
      normalized.includes('/components/deadlines/')
    ) {
      return 'deadlines'
    }
    if (
      normalized.includes('/features/crm/') ||
      normalized.includes('/pages/crm/') ||
      normalized.includes('/components/crm/')
    ) {
      return 'crm'
    }
    if (
      normalized.includes('/features/matters/') ||
      normalized.includes('/pages/matters/') ||
      normalized.includes('/components/matters/')
    ) {
      return 'matters'
    }
    if (
      normalized.includes('/features/intake/') ||
      normalized.includes('/pages/intake/') ||
      normalized.includes('/components/intake/')
    ) {
      return 'intake'
    }
    if (
      normalized.includes('/features/billing/') ||
      normalized.includes('/features/invoices/') ||
      normalized.includes('/pages/finance/')
    ) {
      return 'finance'
    }
    if (normalized.includes('/pages/users/') || normalized.includes('/components/users/')) {
      return 'users'
    }
    if (normalized.includes('/pages/settings/') || normalized.includes('/features/auth/Mfa')) {
      return 'settings'
    }
    if (normalized.includes('/pages/portal/') || normalized.includes('/components/portal/')) {
      return 'portal'
    }
    if (normalized.includes('/pages/Login') || normalized.includes('/pages/ResetPassword')) {
      return 'auth'
    }
    if (
      normalized.includes('/components/dashboard/') ||
      normalized.includes('/pages/Dashboard')
    ) {
      return 'dashboard'
    }
    if (normalized.includes('/config/role-views')) {
      return 'nav'
    }
    if (normalized.includes('/components/layout/')) {
      return 'nav'
    }
    return 'common'
  },
}
