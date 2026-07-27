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
import { clientsApi } from '@/features/crm/api'
import { useInviteUser } from '@/features/users/hooks/useUserMutations'
import {
  TEAM_ASSIGNABLE_ROLES,
  formatUserRole,
  type TeamAssignableRole,
} from '@/features/users/utils'
import { SYSTEM_ROLES } from '@/lib/rbac'
import { getApiErrorMessage } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

type InviteType = 'team' | 'portal'

type InviteUserDrawerProps = {
  open: boolean
  onClose: () => void
}

export function InviteUserDrawer({ open, onClose }: InviteUserDrawerProps) {
  const { t } = useTranslation('users')
  const invite = useInviteUser()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteType, setInviteType] = useState<InviteType>('team')
  const [role, setRole] = useState<TeamAssignableRole>('ip_attorney')
  const [clientCode, setClientCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailWarning, setEmailWarning] = useState<string | null>(null)

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', 'invite-select'],
    queryFn: () => clientsApi.list({ limit: 100 }),
    enabled: open && inviteType === 'portal',
    staleTime: 60_000,
  })

  const clients = clientsData?.items ?? []

  useEffect(() => {
    if (!open) return
    setEmail('')
    setFullName('')
    setInviteType('team')
    setRole('ip_attorney')
    setClientCode('')
    setError(null)
    setEmailWarning(null)
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailWarning(null)

    const trimmedEmail = email.trim()
    const trimmedName = fullName.trim()
    if (!trimmedEmail || !trimmedName) {
      setError(t('invite.errors.required'))
      return
    }

    if (inviteType === 'portal' && !clientCode.trim()) {
      setError(t('invite.errors.clientRequired'))
      return
    }

    try {
      const result = await invite.mutateAsync({
        email: trimmedEmail,
        fullName: trimmedName,
        role:
          inviteType === 'portal'
            ? SYSTEM_ROLES.PORTAL_CLIENT
            : role,
        ...(inviteType === 'portal' ? { clientCode: clientCode.trim() } : {}),
      })

      if (result.inviteEmailSent === false) {
        setEmailWarning(
          result.inviteEmailError ?? t('invite.emailFailed'),
        )
        return
      }

      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('invite.errors.failed')))
    }
  }

  const handleCloseAfterWarning = () => {
    setEmailWarning(null)
    onClose()
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('invite.title')}>
      <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit}>
        <p className="text-sm text-muted-foreground">{t('invite.description')}</p>

        <div className="space-y-2">
          <Label>{t('invite.userType')}</Label>
          <Select
            value={inviteType}
            onValueChange={(v) => setInviteType(v as InviteType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team">{t('invite.typeTeam')}</SelectItem>
              <SelectItem value="portal">{t('invite.typePortal')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

        {inviteType === 'team' ? (
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
        ) : (
          <div className="space-y-2">
            <Label>{t('invite.clientRecord')}</Label>
            <Select
              value={clientCode}
              onValueChange={setClientCode}
              disabled={clientsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('invite.clientPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem
                    key={client.id}
                    value={client.internalCode ?? client.id}
                  >
                    {client.displayName}
                    {client.internalCode ? ` (${client.internalCode})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t('invite.emailHint')}
        </p>

        {emailWarning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>{t('invite.emailFailedTitle')}</p>
            <p className="mt-1 text-xs">{emailWarning}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleCloseAfterWarning}
            >
              {t('invite.emailFailedContinue')}
            </Button>
          </div>
        )}

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
