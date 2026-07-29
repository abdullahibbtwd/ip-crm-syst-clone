import { resolveAutomationLevel } from './jurisdictions.service';

describe('resolveAutomationLevel', () => {
  it('returns manual when there are no rules', () => {
    expect(resolveAutomationLevel(0, 0)).toBe('manual');
    expect(resolveAutomationLevel(0, 5)).toBe('manual');
  });

  it('returns partial when rules exist without holidays', () => {
    expect(resolveAutomationLevel(3, 0)).toBe('partial');
  });

  it('returns full when rules and holidays exist', () => {
    expect(resolveAutomationLevel(2, 1)).toBe('full');
  });
});
