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
      <aside className="relative hidden w-[45%] overflow-hidden bg-brand-light lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-[0.12]">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-orange blur-3xl" />
          <div className="absolute bottom-12 left-12 h-64 w-64 rounded-full bg-brand-green blur-2xl" />
          <div className="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-orange/40 blur-xl" />
        </div>

        <div className="relative z-10 p-12">
          <img
            src="/logo.png"
            alt={t('brand.logoAlt')}
            className="h-16 w-auto"
          />
        </div>

        <div className="relative z-10 p-12">
          <p className="mb-2 text-sm font-medium tracking-widest text-brand-orange uppercase">
            {t('brand.eyebrow')}
          </p>
          <h1 className="mb-4 font-serif text-4xl leading-tight text-brand-green">
            {t('brand.headlineLine1')}
            <br />
            {t('brand.headlineLine2')}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-brand-green/70">
            {t('brand.description')}
          </p>
          <div className="mt-8 h-0.5 w-16 bg-brand-orange" />
        </div>

        <p className="relative z-10 p-12 text-xs text-brand-green/40">{t('brand.footer')}</p>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-brand-light px-6 py-12 lg:bg-brand-green">
        {/* Flashy background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-brand-orange/20 blur-[100px] lg:bg-brand-orange/20" />
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-brand-green/10 blur-[80px] lg:bg-white/5" />
        </div>

        <div className="relative z-10 mb-8 lg:hidden">
          <img
            src="/logo.png"
            alt={t('brand.logoAlt')}
            className="mx-auto h-12 w-auto"
          />
        </div>

        <div className="card relative z-10 w-full max-w-md border-none bg-brand-green shadow-xl lg:bg-white lg:shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
          <div className="mb-8">
            <h2 className="font-serif text-2xl text-white lg:text-brand-green">{title}</h2>
            <p className="mt-2 text-sm text-white/70 lg:text-brand-green/60">{subtitle}</p>
          </div>

          <div className="[&_.auth-label]:text-white/90 [&_.auth-input]:text-brand-green [&_svg]:text-brand-green/40 [&_button_svg]:text-brand-green/40 [&_.text-brand-green\/60]:text-white/60 [&_.text-brand-green]:text-white [&_span.bg-white]:bg-brand-green [&_span.bg-white]:text-white/50 lg:[&_.auth-label]:text-foreground/90 lg:[&_.auth-input]:text-foreground lg:[&_svg]:text-brand-green/40 lg:[&_button_svg]:text-brand-green/40 lg:[&_.text-brand-green\/60]:text-brand-green/60 lg:[&_.text-brand-green]:text-brand-green lg:[&_span.bg-white]:bg-white lg:[&_span.bg-white]:text-brand-green/50">
            {children}
          </div>

          {footer && (
            <div className="mt-6 border-t border-white/10 pt-6 text-center text-sm text-white/80 [&_a]:text-white [&_button]:text-white [&_p]:text-white/60 lg:border-brand-green/10 lg:text-inherit lg:[&_a]:text-brand-green lg:[&_button]:text-brand-green lg:[&_p]:text-inherit">
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
