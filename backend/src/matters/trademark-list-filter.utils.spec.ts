import { trademarkListFilterWhere, hasTrademarkListFilters } from './trademark-list-filter.utils';

describe('trademarkListFilterWhere', () => {
  it('returns undefined when no filters set', () => {
    expect(trademarkListFilterWhere({})).toBeUndefined();
    expect(hasTrademarkListFilters({})).toBe(false);
  });

  it('filters by mark name and territory', () => {
    const where = trademarkListFilterWhere({
      trademarkName: 'ACME',
      trademarkTerritory: 'national',
    });
    expect(where).toEqual({
      AND: [
        { title: { contains: 'ACME', mode: 'insensitive' } },
        {
          attributes: {
            is: {
              attributes: {
                path: ['territory'],
                equals: 'national',
              },
            },
          },
        },
      ],
    });
    expect(hasTrademarkListFilters({ trademarkName: 'x' })).toBe(true);
  });

  it('filters incoming number across attribute paths', () => {
    const where = trademarkListFilterWhere({ trademarkIncoming: 'BG-123' });
    expect(where?.OR).toHaveLength(5);
  });
});
