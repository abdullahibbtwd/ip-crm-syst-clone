import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HelpCircle, Inbox, ShieldCheck } from 'lucide-react'

export function PortalHelpPage() {
  const { t } = useTranslation('portal')

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('help.title', { defaultValue: 'Help' })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('help.subtitle', {
            defaultValue: 'How to use the client portal for your IP portfolio.',
          })}
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Inbox className="size-4 text-primary" />
          <h2 className="font-medium">
            {t('help.enquiriesTitle', { defaultValue: 'File an enquiry' })}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('help.enquiriesBody', {
            defaultValue:
              'Use Enquiries to submit a new matter request. The firm will review conflict checks and convert approved leads into matters.',
          })}{' '}
          <Link to="/portal/intake" className="text-primary hover:underline">
            {t('help.openEnquiries', { defaultValue: 'Open enquiries' })}
          </Link>
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="font-medium">
            {t('help.approvalsTitle', { defaultValue: 'Approvals' })}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('help.approvalsBody', {
            defaultValue:
              'When the firm requests your approval (for example renewals or instructions), respond from the Approvals page.',
          })}{' '}
          <Link to="/portal/approvals" className="text-primary hover:underline">
            {t('help.openApprovals', { defaultValue: 'Open approvals' })}
          </Link>
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-4 text-primary" />
          <h2 className="font-medium">
            {t('help.contactTitle', { defaultValue: 'Need more help?' })}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('help.contactBody', {
            defaultValue:
              'Contact your assigned attorney or coordinator through Messages, or reply to firm correspondence on a matter.',
          })}{' '}
          <Link to="/portal/messages" className="text-primary hover:underline">
            {t('help.openMessages', { defaultValue: 'Open messages' })}
          </Link>
        </p>
      </section>
    </div>
  )
}
