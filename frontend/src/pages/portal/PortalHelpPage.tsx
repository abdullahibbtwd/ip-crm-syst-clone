import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HelpCircle, Inbox, ShieldCheck } from 'lucide-react'

export function PortalHelpPage() {
  const { t } = useTranslation('portal')

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('help.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('help.subtitle')}
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Inbox className="size-4 text-primary" />
          <h2 className="font-medium">
            {t('help.enquiriesTitle')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('help.enquiriesBody')}{' '}
          <Link to="/portal/intake" className="text-primary hover:underline">
            {t('help.openEnquiries')}
          </Link>
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="font-medium">
            {t('help.approvalsTitle')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('help.approvalsBody')}{' '}
          <Link to="/portal/approvals" className="text-primary hover:underline">
            {t('help.openApprovals')}
          </Link>
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-4 text-primary" />
          <h2 className="font-medium">
            {t('help.contactTitle')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('help.contactBody')}{' '}
          <Link to="/portal/messages" className="text-primary hover:underline">
            {t('help.openMessages')}
          </Link>
        </p>
      </section>
    </div>
  )
}
