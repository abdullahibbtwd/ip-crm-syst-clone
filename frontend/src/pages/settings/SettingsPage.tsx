import { MfaEnrollmentCard } from '@/features/auth/MfaEnrollmentCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account preferences and security.
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <CardTitle className="text-base">Security</CardTitle>
          </div>
          <CardDescription>
            Two-factor authentication protects your account even if your password is compromised.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaEnrollmentCard />
        </CardContent>
      </Card>
    </div>
  )
}
