import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import {
  disableMfaRequest,
  enableMfaRequest,
  regenerateBackupCodesRequest,
  startMfaSetupRequest,
} from '@/features/auth/api'
import { useAuth } from '@/features/auth/AuthProvider'
import { mfaVerifySchema } from '@/features/auth/schemas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getApiErrorMessage } from '@/lib/api-client'

type SetupState = {
  otpauthUrl: string
  secret: string
} | null

export function MfaEnrollmentCard() {
  const { user, setUser } = useAuth()
  const mfaEnabled = user?.mfaEnabled ?? false
  const [setup, setSetup] = useState<SetupState>(null)
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [showDisable, setShowDisable] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')

  const setupMutation = useMutation({
    mutationFn: startMfaSetupRequest,
    onSuccess: (data) => {
      setSetup(data)
      setCode('')
      setFieldError(null)
      setBackupCodes(null)
    },
  })

  const enableMutation = useMutation({
    mutationFn: enableMfaRequest,
    onSuccess: (data) => {
      setUser(data.user)
      setSetup(null)
      setCode('')
      setFieldError(null)
      setBackupCodes(data.backupCodes)
    },
  })

  const disableMutation = useMutation({
    mutationFn: disableMfaRequest,
    onSuccess: (data) => {
      setUser(data.user)
      setShowDisable(false)
      setDisablePassword('')
      setDisableCode('')
      setBackupCodes(null)
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: regenerateBackupCodesRequest,
    onSuccess: (codes) => {
      setCode('')
      setBackupCodes(codes)
    },
  })

  if (!user) return null

  const handleEnable = () => {
    setFieldError(null)
    const parsed = mfaVerifySchema.safeParse({ code })
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Invalid code')
      return
    }
    enableMutation.mutate(parsed.data)
  }

  if (mfaEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Two-factor authentication is enabled</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account requires a code from your authenticator app when signing in.
            </p>
            <Badge variant="secondary" className="mt-3 gap-1">
              <ShieldCheck className="size-3.5" />
              Active
            </Badge>
          </div>
        </div>

        {backupCodes && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="font-medium text-foreground">Save your backup codes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Each code works once if you lose access to your authenticator app. Store them
              securely — they will not be shown again.
            </p>
            <ul className="mt-3 grid gap-1 font-mono text-sm sm:grid-cols-2">
              {backupCodes.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={regenerateMutation.isPending}
            onClick={() => {
              const nextCode = window.prompt('Enter your current 6-digit authenticator code')
              if (!nextCode) return
              regenerateMutation.mutate({ code: nextCode })
            }}
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Regenerating…
              </>
            ) : (
              'Regenerate backup codes'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDisable((value) => !value)}
          >
            <ShieldOff className="size-4" />
            Disable 2FA
          </Button>
        </div>

        {showDisable && (
          <form
            className="space-y-3 rounded-lg border p-4"
            onSubmit={(e) => {
              e.preventDefault()
              disableMutation.mutate({ password: disablePassword, code: disableCode })
            }}
          >
            <p className="text-sm text-muted-foreground">
              Confirm your password and a current authenticator or backup code to disable 2FA.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-disable-password">Password</Label>
              <Input
                id="mfa-disable-password"
                type="password"
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-disable-code">Authentication code</Label>
              <Input
                id="mfa-disable-code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="000000 or XXXX-XXXX"
              />
            </div>
            {disableMutation.isError && (
              <p className="text-sm text-destructive" role="alert">
                {getApiErrorMessage(disableMutation.error, 'Failed to disable 2FA')}
              </p>
            )}
            <Button type="submit" variant="destructive" disabled={disableMutation.isPending}>
              {disableMutation.isPending ? 'Disabling…' : 'Confirm disable'}
            </Button>
          </form>
        )}
      </div>
    )
  }

  if (!setup) {
    return (
      <div className="space-y-4">
        {user.mfaEnrollmentRequired && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            Your organization requires two-factor authentication. Enable it below to continue
            using the system.
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Add an extra layer of security by requiring a 6-digit code from an authenticator app
          (Google Authenticator, Authy, etc.) when you sign in.
        </p>
        {setupMutation.isError && (
          <p className="text-sm text-destructive" role="alert">
            {getApiErrorMessage(setupMutation.error, 'Failed to start 2FA setup')}
          </p>
        )}
        <Button
          type="button"
          onClick={() => setupMutation.mutate()}
          disabled={setupMutation.isPending}
        >
          {setupMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Preparing…
            </>
          ) : (
            <>
              <KeyRound className="size-4" />
              Enable 2FA
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">1. Scan this QR code</h3>
        <p className="text-sm text-muted-foreground">
          Open your authenticator app and scan the code below.
        </p>
        <div className="inline-flex rounded-lg border bg-white p-4">
          <QRCode value={setup.otpauthUrl} size={180} />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Or enter this key manually</h3>
        <code className="block break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
          {setup.secret}
        </code>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">2. Confirm with a 6-digit code</h3>
        <p className="text-sm text-muted-foreground">
          Enter the code shown in your app to verify setup.
        </p>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="mfa-enroll-code">Authentication code</Label>
          <Input
            id="mfa-enroll-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="tracking-[0.3em]"
            aria-invalid={Boolean(fieldError)}
          />
          {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
        </div>
      </div>

      {(enableMutation.isError || setupMutation.isError) && (
        <p className="text-sm text-destructive" role="alert">
          {getApiErrorMessage(
            enableMutation.error ?? setupMutation.error,
            'Failed to enable 2FA',
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleEnable}
          disabled={enableMutation.isPending || code.length !== 6}
        >
          {enableMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Verifying…
            </>
          ) : (
            'Confirm & enable 2FA'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSetup(null)
            setCode('')
            setFieldError(null)
          }}
          disabled={enableMutation.isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
