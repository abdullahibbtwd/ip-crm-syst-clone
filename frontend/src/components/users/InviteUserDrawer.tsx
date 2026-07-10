import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Drawer } from '@/components/crm/Drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInviteUser } from '@/features/users/hooks/useUserMutations'
import {
  TEAM_ASSIGNABLE_ROLES,
  formatUserRole,
  type TeamAssignableRole,
} from '@/features/users/utils'
import { getApiErrorMessage } from '@/lib/api-client'

type InviteUserDrawerProps = {
  open: boolean
  onClose: () => void
}

export function InviteUserDrawer({ open, onClose }: InviteUserDrawerProps) {
  const { t } = useTranslation('users')
  const invite = useInviteUser()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<TeamAssignableRole>('ip_attorney')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setFullName('')
    setRole('ip_attorney')
    setError(null)
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    const trimmedName = fullName.trim()
    if (!trimmedEmail || !trimmedName) {
      setError(t('invite.errors.required'))
      return
    }

    try {
      await invite.mutateAsync({
        email: trimmedEmail,
        fullName: trimmedName,
        role,
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('invite.errors.failed')))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('invite.title')}>
      <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit}>
        <p className="text-sm text-muted-foreground">{t('invite.description')}</p>

        <div className="space-y-2">
          <Label htmlFor="invite-email">{t('invite.email')}</Label>
          <Input
            id="invite-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('invite.emailPlaceholder')}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-name">{t('invite.fullName')}</Label>
          <Input
            id="invite-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('invite.fullNamePlaceholder')}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>{t('invite.role')}</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as TeamAssignableRole)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value) => formatUserRole(String(value ?? ''))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TEAM_ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {formatUserRole(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t('invite.ssoHint')}
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="mt-auto flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('invite.cancel')}
          </Button>
          <Button type="submit" disabled={invite.isPending}>
            {invite.isPending ? t('invite.submitting') : t('invite.submit')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}
