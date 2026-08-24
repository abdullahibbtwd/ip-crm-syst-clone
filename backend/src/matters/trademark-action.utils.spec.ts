import {
  countSecondaryTrademarkActions,
  isIsoDateBefore,
  niceClassesFromGoods,
  normalizeGoodsAndServices,
  subtractReminderOffset,
} from './trademark-action.utils';

describe('trademark-action.utils', () => {
  it('subtracts months and days from an ISO date', () => {
    expect(subtractReminderOffset('2026-08-24', 'months', 1)).toBe('2026-07-24');
    expect(subtractReminderOffset('2026-08-24', 'days', 7)).toBe('2026-08-17');
  });

  it('compares ISO dates lexicographically', () => {
    expect(isIsoDateBefore('2026-07-24', '2026-08-24')).toBe(true);
    expect(isIsoDateBefore('2026-08-24', '2026-08-24')).toBe(false);
  });

  it('normalizes goods rows and derives Nice classes', () => {
    const rows = normalizeGoodsAndServices([
      { classNumber: 9, description: '  software  ' },
      { classNumber: 35, description: 'advertising' },
      { classNumber: 99, description: 'invalid' },
    ]);
    expect(rows).toEqual([
      { classNumber: 9, description: 'software' },
      { classNumber: 35, description: 'advertising' },
    ]);
    expect(niceClassesFromGoods(rows)).toEqual(['9', '35']);
  });

  it('counts secondary trademark actions and ignores scope corrections', () => {
    expect(
      countSecondaryTrademarkActions({
        trademarkActions: [
          { kind: 'scope_correction' },
          { kind: 'transfer' },
          { kind: 'license' },
        ],
      }),
    ).toBe(2);
    expect(countSecondaryTrademarkActions(null)).toBe(0);
  });
});
