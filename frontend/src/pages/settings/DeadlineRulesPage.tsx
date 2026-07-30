import { Navigate, useSearchParams } from 'react-router-dom'

/** Legacy route — jurisdiction hub owns rules now. */
export function DeadlineRulesPage() {
  const [params] = useSearchParams()
  const code = params.get('jurisdiction')
  if (code) {
    return <Navigate to={`/settings/jurisdictions/${code}?tab=rules`} replace />
  }
  return <Navigate to="/settings/jurisdictions" replace />
}
