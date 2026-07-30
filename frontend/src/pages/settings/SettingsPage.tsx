import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Globe2, KeyRound, Mail, Plug, Server, Shield, ShieldCheck } from 'lucide-react'
import { MfaEnrollmentCard } from '@/features/auth/MfaEnrollmentCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { RoleGate } from '@/components/permissions/RoleGate'
import { SYSTEM_ROLES } from '@/lib/rbac'

/** Firm admin settings — matches backend @Roles on these endpoints. */
const FIRM_ADMIN_ROLES = [
  SYSTEM_ROLES.MANAGING_PARTNER,
  SYSTEM_ROLES.DOCKETING_ADMIN,
] as const

export function SettingsPage() {
  const { t } = useTranslation('settings')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <PermissionGate resource="email" action="read">
        <RoleGate roles={[...FIRM_ADMIN_ROLES, SYSTEM_ROLES.IP_ATTORNEY, SYSTEM_ROLES.TRADEMARK_ATTORNEY, SYSTEM_ROLES.COORDINATOR, SYSTEM_ROLES.PARALEGAL]}>
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
        </RoleGate>
      </PermissionGate>

      <PermissionGate resource="registry" action="read">
        <RoleGate roles={[...FIRM_ADMIN_ROLES, SYSTEM_ROLES.IP_ATTORNEY, SYSTEM_ROLES.TRADEMARK_ATTORNEY, SYSTEM_ROLES.IT_ADMIN]}>
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
        </RoleGate>
      </PermissionGate>

      <PermissionGate resource="role" action="read">
        <RoleGate roles={[SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN]}>
          <Card className="shadow-none">
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                <CardTitle className="text-base">{t('links.ssoMfa.title')}</CardTitle>
              </div>
              <CardDescription>{t('links.ssoMfa.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                to="/settings/sso-mfa"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {t('links.ssoMfa.action')}
              </Link>
            </CardContent>
          </Card>
        </RoleGate>
      </PermissionGate>

      <PermissionGate resource="role" action="read">
        <RoleGate roles={[SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN]}>
          <Card className="shadow-none">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <CardTitle className="text-base">{t('links.roles.title')}</CardTitle>
              </div>
              <CardDescription>{t('links.roles.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                to="/settings/roles"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {t('links.roles.action')}
              </Link>
            </CardContent>
          </Card>
        </RoleGate>
      </PermissionGate>

      <PermissionGate resource="role" action="read">
        <RoleGate roles={[SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN]}>
          <Card className="shadow-none">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="size-4 text-primary" />
                <CardTitle className="text-base">{t('links.systemHealth.title')}</CardTitle>
              </div>
              <CardDescription>{t('links.systemHealth.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                to="/settings/system-health"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                {t('links.systemHealth.action')}
              </Link>
            </CardContent>
          </Card>
        </RoleGate>
      </PermissionGate>

      <RoleGate roles={[...FIRM_ADMIN_ROLES]}>
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe2 className="size-4 text-primary" />
              <CardTitle className="text-base">{t('links.jurisdictions.title')}</CardTitle>
            </div>
            <CardDescription>{t('links.jurisdictions.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/settings/jurisdictions"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t('links.jurisdictions.action')}
            </Link>
          </CardContent>
        </Card>
      </RoleGate>

      <RoleGate roles={[...FIRM_ADMIN_ROLES]}>
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
      </RoleGate>

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
