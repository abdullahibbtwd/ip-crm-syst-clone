import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useTranslation('auth')

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <aside className="relative hidden w-[45%] overflow-hidden bg-brand-green lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-orange" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-brand-orange" />
        </div>

        <div className="relative z-10 p-12">
          <img
            src="/logo.png"
            alt={t('brand.logoAlt')}
            className="h-16 w-auto brightness-0 invert"
          />
        </div>

        <div className="relative z-10 p-12">
          <p className="mb-2 text-sm font-medium tracking-widest text-brand-orange uppercase">
            {t('brand.eyebrow')}
          </p>
          <h1 className="mb-4 font-serif text-4xl leading-tight text-white">
            {t('brand.headlineLine1')}
            <br />
            {t('brand.headlineLine2')}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/70">
            {t('brand.description')}
          </p>
          <div className="mt-8 h-0.5 w-16 bg-brand-orange" />
        </div>

        <p className="relative z-10 p-12 text-xs text-white/40">{t('brand.footer')}</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col items-center justify-center bg-brand-light px-6 py-12">
        <div className="mb-8 lg:hidden">
          <img
            src="/logo.png"
            alt={t('brand.logoAlt')}
            className="mx-auto h-12 w-auto"
          />
        </div>

        <div className="card w-full max-w-md border border-brand-green/5 shadow-[0_8px_40px_rgba(26,60,52,0.08)]">
          <div className="mb-8">
            <h2 className="font-serif text-2xl text-brand-green">{title}</h2>
            <p className="mt-2 text-sm text-brand-green/60">{subtitle}</p>
          </div>

          {children}

          {footer && (
            <div className="mt-6 border-t border-brand-green/10 pt-6 text-center text-sm">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export function AuthFooterLink({
  to,
  children,
}: {
  to: string
  children: ReactNode
}) {
  return (
    <Link to={to} className="nav-link inline-block font-medium text-brand-green">
      {children}
    </Link>
  )
}
