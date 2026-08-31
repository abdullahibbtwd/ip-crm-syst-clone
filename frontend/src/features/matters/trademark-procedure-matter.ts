import type { MatterDetail } from './types'
import { TRADEMARK_PROCEDURE_QUERY_KEY } from './trademark-procedures-nav'

export type TrademarkProcedureView =
  | 'objection'
  | 'opposition'
  | 'cancellation'
  | 'deletion'

export function trademarkProcedureView(
  matter: Pick<MatterDetail, 'matterType' | 'attributes'>,
): TrademarkProcedureView | null {
  if (matter.matterType !== 'trademark') return null
  const procedure = matter.attributes?.attributes?.trademarkProcedure
  if (procedure === 'objection') return 'objection'
  if (
    procedure === 'opposition' ||
    procedure === 'opposition_against_us' ||
    procedure === 'opposition_by_us'
  ) {
    return 'opposition'
  }
  if (procedure === 'cancellation') return 'cancellation'
  if (procedure === 'deletion' || procedure === 'revocation') return 'deletion'
  return null
}

export function procedureViewRoutes(
  view: TrademarkProcedureView,
): readonly string[] {
  if (view === 'objection') return ['overview', 'objection-archive']
  if (view === 'cancellation') return ['overview', 'cancellation-archive', 'cancellation-notes']
  if (view === 'deletion') return ['overview', 'deletion-archive']
  return ['overview', 'opposition-archive', 'opposition-notes']
}

export function procedureListUrl(view: TrademarkProcedureView): string {
  return `/matters?matterType=trademark&${TRADEMARK_PROCEDURE_QUERY_KEY}=${view}`
}

export function procedurePageTitleKey(view: TrademarkProcedureView): string {
  if (view === 'objection') return 'objectionView.pageTitle'
  if (view === 'cancellation') return 'cancellationView.pageTitle'
  if (view === 'deletion') return 'deletionView.pageTitle'
  return 'oppositionView.pageTitle'
}
