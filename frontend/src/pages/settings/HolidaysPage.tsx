import { Navigate, useSearchParams } from 'react-router-dom'

/** Legacy route — jurisdiction hub owns holidays now. */
export function HolidaysPage() {
  const [params] = useSearchParams()
  const code = params.get('jurisdiction')
  if (code) {
    return (
      <Navigate to={`/settings/jurisdictions/${code}?tab=holidays`} replace />
    )
  }
  return <Navigate to="/settings/jurisdictions" replace />
}
