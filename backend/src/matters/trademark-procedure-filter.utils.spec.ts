import {
  normalizeTrademarkProcedureShelfKey,
  trademarkProcedureFilter,
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
});
