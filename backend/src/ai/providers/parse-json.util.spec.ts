import { ServiceUnavailableException } from '@nestjs/common';
import { parseJsonFromModelText } from './parse-json.util';

describe('parseJsonFromModelText', () => {
  it('parses clean JSON', () => {
    expect(parseJsonFromModelText('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonFromModelText('[1,2]')).toEqual([1, 2]);
  });

  it('extracts JSON embedded in prose', () => {
    const text = 'Here is the result:\n{"summary":"ok"}\nThanks';
    expect(parseJsonFromModelText<{ summary: string }>(text)).toEqual({
      summary: 'ok',
    });
  });

  it('throws when no JSON is present', () => {
    expect(() => parseJsonFromModelText('no json here')).toThrow(
      ServiceUnavailableException,
    );
  });
});
