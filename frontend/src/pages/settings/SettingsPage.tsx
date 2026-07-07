import { useTranslation } from 'react-i18next'
import { MfaEnrollmentCard } from '@/features/auth/MfaEnrollmentCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export function SettingsPage() {
  const { t } = useTranslation('settings')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

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
