import {
  asArray,
  dig,
  encodePublicationPathSegment,
  normalizeEpoNumber,
  pickEnglishOrFirst,
  textOf,
} from './epo.util';

describe('epo.util', () => {
  it('asArray wraps scalars and empties nullish', () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray('x')).toEqual(['x']);
    expect(asArray([1, 2])).toEqual([1, 2]);
  });

  it('textOf reads $, #text, and primitives', () => {
    expect(textOf('  hi  ')).toBe('hi');
    expect(textOf({ $: '  title  ' })).toBe('title');
    expect(textOf({ '#text': 'body' })).toBe('body');
    expect(textOf(12)).toBe('12');
    expect(textOf({})).toBeNull();
  });

  it('pickEnglishOrFirst prefers @lang=en', () => {
    expect(
      pickEnglishOrFirst([
        { '@lang': 'de', $: 'Deutsch' },
        { '@lang': 'en', $: 'English' },
      ]),
    ).toBe('English');
    expect(pickEnglishOrFirst([{ $: 'Only' }])).toBe('Only');
    expect(pickEnglishOrFirst([])).toBeNull();
  });

  it('dig walks nested paths', () => {
    expect(dig({ a: { b: 1 } }, ['a', 'b'])).toBe(1);
    expect(dig({ a: 1 }, ['a', 'b'])).toBeUndefined();
  });

  it('normalizeEpoNumber and encodePublicationPathSegment', () => {
    expect(normalizeEpoNumber('  ep 123  ')).toBe('EP123');
    expect(encodePublicationPathSegment('ep 123')).toBe('EP123');
  });
});
