import {
  normalizeTrademarkProcedureShelfKey,
  trademarkProcedureFilter,
  trademarkShelfCountKey,
} from './trademark-procedure-filter.utils';

describe('trademarkProcedureFilter', () => {
  it('maps opposition shelf to legacy stored values', () => {
    const where = trademarkProcedureFilter('opposition');
    expect(where.matterType).toBe('trademark');
    expect(where.OR).toHaveLength(3);
  });

  it('maps marks shelf to new and registered stored values', () => {
    const where = trademarkProcedureFilter('marks');
    expect(where.matterType).toBe('trademark');
    expect(where.OR).toHaveLength(2);
  });

  it('normalizes legacy opposition keys to opposition shelf', () => {
    expect(normalizeTrademarkProcedureShelfKey('opposition_by_us')).toBe(
      'opposition',
    );
    expect(normalizeTrademarkProcedureShelfKey('revocation')).toBe('deletion');
    expect(normalizeTrademarkProcedureShelfKey('new')).toBe('new');
    expect(normalizeTrademarkProcedureShelfKey('registered')).toBe(
      'registered',
    );
  });

  it('normalizes unknown to null shelf when empty', () => {
    expect(normalizeTrademarkProcedureShelfKey(null)).toBeNull();
  });

  it('puts missing and legacy procedures on the Marks shelf', () => {
    expect(trademarkShelfCountKey(null)).toBe('marks');
    expect(trademarkShelfCountKey('new')).toBe('marks');
    expect(trademarkShelfCountKey('registered')).toBe('marks');
    expect(trademarkShelfCountKey('madrid')).toBe('marks');
    expect(trademarkShelfCountKey('objection')).toBe('objection');
    expect(trademarkShelfCountKey('revocation')).toBe('deletion');
  });
});
