import { isAllowedCorsOrigin, resolveCorsOrigins } from './cors-origins';

describe('resolveCorsOrigins', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('includes frontend URL and additional origins', () => {
    const origins = resolveCorsOrigins('http://localhost:5173');
    expect(origins).toContain('http://localhost:5173');
    expect(origins).toContain('http://187.127.233.163:5173');
  });

  it('adds localhost twin in non-production', () => {
    process.env.NODE_ENV = 'development';
    const origins = resolveCorsOrigins('http://localhost:5173');
    expect(origins).toContain('http://127.0.0.1:5173');
  });

  it('adds 127.0.0.1 twin in non-production', () => {
    process.env.NODE_ENV = 'test';
    const origins = resolveCorsOrigins('http://127.0.0.1:3000');
    expect(origins).toContain('http://localhost:3000');
  });

  it('does not add twins in production', () => {
    process.env.NODE_ENV = 'production';
    const origins = resolveCorsOrigins('http://localhost:5173');
    expect(origins).not.toContain('http://127.0.0.1:5173');
  });

  it('ignores malformed frontend URL', () => {
    process.env.NODE_ENV = 'development';
    const origins = resolveCorsOrigins('not-a-url');
    expect(origins).toEqual(
      expect.arrayContaining(['not-a-url', 'http://187.127.233.163:5173']),
    );
  });
});

describe('isAllowedCorsOrigin', () => {
  const allowed = ['http://localhost:5173', 'http://127.0.0.1:5173'];

  it('allows missing origin (same-origin / non-browser clients)', () => {
    expect(isAllowedCorsOrigin(undefined, allowed)).toBe(true);
  });

  it('allows exact matches', () => {
    expect(isAllowedCorsOrigin('http://localhost:5173', allowed)).toBe(true);
  });

  it('rejects unknown origins', () => {
    expect(isAllowedCorsOrigin('http://evil.example', allowed)).toBe(false);
  });
});
