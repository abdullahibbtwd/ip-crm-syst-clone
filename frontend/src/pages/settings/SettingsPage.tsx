import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, FileText, Mail, Plug, Shield } from 'lucide-react'
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
              <CardTitle className="text-base">{t('links.email.title')}</CardTitle>
            </div>
            <CardDescription>{t('links.email.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/settings/email" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              {t('links.email.action')}
            </Link>
          </CardContent>
        </Card>
      </PermissionGate>

      <PermissionGate resource="registry" action="read">
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plug className="size-4 text-primary" />
              <CardTitle className="text-base">{t('links.integrations.title')}</CardTitle>
            </div>
            <CardDescription>{t('links.integrations.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/settings/integrations"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t('links.integrations.action')}
            </Link>
          </CardContent>
        </Card>
      </PermissionGate>

      <PermissionGate resource="deadline" action="read">
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarPlus className="size-4 text-primary" />
              <CardTitle className="text-base">{t('links.deadlineRules.title')}</CardTitle>
            </div>
            <CardDescription>{t('links.deadlineRules.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/settings/deadline-rules"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t('links.deadlineRules.action')}
            </Link>
          </CardContent>
        </Card>
      </PermissionGate>

      <PermissionGate resource="document" action="read">
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <CardTitle className="text-base">{t('links.documentTemplates.title')}</CardTitle>
            </div>
            <CardDescription>{t('links.documentTemplates.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/settings/document-templates"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t('links.documentTemplates.action')}
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
