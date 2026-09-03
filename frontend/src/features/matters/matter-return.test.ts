import { describe, expect, it } from 'vitest'
import { isMatterListReturnPath, matterShelfUrl, resolveMatterBackUrl } from './matter-return'

describe('matter return navigation', () => {
  it('sends regular trademarks back to the Marks shelf', () => {
    expect(
      matterShelfUrl({
        matterType: 'trademark',
        isArchived: false,
        attributes: {
          matterId: 'm1',
          attributes: { trademarkProcedure: 'national' },
          updatedAt: '2026-01-01',
        },
      }),
    ).toBe('/matters?matterType=trademark&trademarkProcedure=marks')
  })

  it('sends opposition files to the opposition shelf', () => {
    expect(
      matterShelfUrl({
        matterType: 'trademark',
        attributes: {
          matterId: 'm1',
          attributes: { trademarkProcedure: 'opposition' },
          updatedAt: '2026-01-01',
        },
      }),
    ).toBe('/matters?matterType=trademark&trademarkProcedure=opposition')
  })

  it('prefers the list URL the user came from', () => {
    expect(
      resolveMatterBackUrl(
        {
          id: 'm1',
          matterType: 'trademark',
          attributes: {
            matterId: 'm1',
            attributes: {},
            updatedAt: '2026-01-01',
          },
        },
        '/matters?matterType=trademark&trademarkProcedure=marks&trademarkName=exo',
      ),
    ).toBe('/matters?matterType=trademark&trademarkProcedure=marks&trademarkName=exo')
  })

  it('ignores a return path that is the matter itself', () => {
    expect(isMatterListReturnPath('/matters/m1/overview', 'm1')).toBe(false)
    expect(isMatterListReturnPath('/matters?matterType=trademark', 'm1')).toBe(true)
  })
})
