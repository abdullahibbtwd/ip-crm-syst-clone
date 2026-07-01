import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { enableMfaRequest, startMfaSetupRequest } from '@/features/auth/api'
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

  const setupMutation = useMutation({
    mutationFn: startMfaSetupRequest,
    onSuccess: (data) => {
      setSetup(data)
      setCode('')
      setFieldError(null)
    },
  })

  const enableMutation = useMutation({
    mutationFn: enableMfaRequest,
    onSuccess: (data) => {
      setUser(data.user)
      setSetup(null)
      setCode('')
      setFieldError(null)
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
      <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div>
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
    )
  }

  if (!setup) {
    return (
      <div className="space-y-4">
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
