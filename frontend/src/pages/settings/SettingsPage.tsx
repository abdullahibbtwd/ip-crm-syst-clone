import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Shield } from 'lucide-react'
import { MfaEnrollmentCard } from '@/features/auth/MfaEnrollmentCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PermissionGate } from '@/components/permissions/PermissionGate'

export function SettingsPage() {
  const { t } = useTranslation('settings')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <PermissionGate resource="email" action="read">
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              <CardTitle className="text-base">Email integration</CardTitle>
            </div>
            <CardDescription>
              Connect Microsoft 365 or Google Workspace to sync inbox messages into the Email
              Queue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/settings/email" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Manage mailboxes
            </Link>
          </CardContent>
        </Card>
      </PermissionGate>

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <CardTitle className="text-base">{t('security.title')}</CardTitle>
          </div>
          <CardDescription>{t('security.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <MfaEnrollmentCard />
        </CardContent>
      </Card>
    </div>
  )
}
