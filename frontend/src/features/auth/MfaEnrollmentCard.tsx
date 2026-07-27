import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
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
      const messageKey = parsed.error.issues[0]?.message ?? 'validation.mfaCodeLength'
      setFieldError(t(messageKey))
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
            <p className="font-medium text-foreground">{t('mfa.enrollment.enabledTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('mfa.enrollment.enabledDescription')}
            </p>
            <Badge variant="secondary" className="mt-3 gap-1">
              <ShieldCheck className="size-3.5" />
              {t('mfa.enrollment.active')}
            </Badge>
          </div>
        </div>

        {backupCodes && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="font-medium text-foreground">{t('mfa.enrollment.backupCodesTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('mfa.enrollment.backupCodesDescription')}
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
              const nextCode = window.prompt(t('mfa.enrollment.regeneratePrompt'))
              if (!nextCode) return
              regenerateMutation.mutate({ code: nextCode })
            }}
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('mfa.enrollment.regenerating')}
              </>
            ) : (
              t('mfa.enrollment.regenerateBackupCodes')
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDisable((value) => !value)}
          >
            <ShieldOff className="size-4" />
            {t('mfa.enrollment.disable2FA')}
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
              {t('mfa.enrollment.disableConfirmDescription')}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-disable-password">{t('form.password')}</Label>
              <Input
                id="mfa-disable-password"
                type="password"
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-disable-code">{t('mfa.codeLabel')}</Label>
              <Input
                id="mfa-disable-code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder={t('mfa.enrollment.codeOrBackupPlaceholder')}
              />
            </div>
            {disableMutation.isError && (
              <p className="text-sm text-destructive" role="alert">
                {getApiErrorMessage(disableMutation.error, t('mfa.enrollment.disableFailed'))}
              </p>
            )}
            <Button type="submit" variant="destructive" disabled={disableMutation.isPending}>
              {disableMutation.isPending
                ? t('mfa.enrollment.disabling')
                : t('mfa.enrollment.confirmDisable')}
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
            {t('mfa.enrollment.requiredBanner')}
          </div>
        )}
        <p className="text-sm text-muted-foreground">{t('mfa.enrollment.introDescription')}</p>
        {setupMutation.isError && (
          <p className="text-sm text-destructive" role="alert">
            {getApiErrorMessage(setupMutation.error, t('mfa.enrollment.setupFailed'))}
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
              {t('mfa.enrollment.preparing')}
            </>
          ) : (
            <>
              <KeyRound className="size-4" />
              {t('mfa.enrollment.enable2FA')}
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t('mfa.enrollment.step1Title')}</h3>
        <p className="text-sm text-muted-foreground">{t('mfa.enrollment.step1Description')}</p>
        <div className="inline-flex rounded-lg border bg-white p-4">
          <QRCode value={setup.otpauthUrl} size={180} />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t('mfa.enrollment.manualKeyTitle')}</h3>
        <code className="block break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
          {setup.secret}
        </code>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t('mfa.enrollment.step2Title')}</h3>
        <p className="text-sm text-muted-foreground">{t('mfa.enrollment.step2Description')}</p>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="mfa-enroll-code">{t('mfa.codeLabel')}</Label>
          <Input
            id="mfa-enroll-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder={t('mfa.codePlaceholder')}
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
            t('mfa.enrollment.enableFailed'),
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
              {t('mfa.verifying')}
            </>
          ) : (
            t('mfa.enrollment.confirmEnable')
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
          {tCommon('actions.cancel')}
        </Button>
      </div>
    </div>
  )
}
