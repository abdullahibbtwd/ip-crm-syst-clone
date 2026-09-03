import { useLocation, useNavigate } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { rememberMatterReturnTo } from './matter-return'

export function useOpenMatter() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = `${location.pathname}${location.search}`
  const linkState = { from }

  const remember = () => rememberMatterReturnTo(from)

  const open = (matterId: string, tab = 'overview') => {
    remember()
    navigate(`/matters/${matterId}/${tab}`, { state: { from } })
  }

  const onLinkClick = (e: MouseEvent) => {
    e.stopPropagation()
    remember()
  }

  return { open, from, linkState, remember, onLinkClick }
}
