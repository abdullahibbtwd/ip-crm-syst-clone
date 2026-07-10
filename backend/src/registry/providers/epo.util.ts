/** Helpers for EPO OPS JSON (XML-to-JSON shape with `$` text nodes). */

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function textOf(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === 'string') {
    const t = node.trim();
    return t || null;
  }
  if (typeof node === 'number' || typeof node === 'boolean') {
    return String(node);
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (typeof obj.$ === 'string') {
      const t = obj.$.trim();
      return t || null;
    }
    if (typeof obj['#text'] === 'string') {
      const t = (obj['#text'] as string).trim();
      return t || null;
    }
  }
  return null;
}

export function pickEnglishOrFirst(nodes: unknown): string | null {
  const list = asArray(nodes);
  if (list.length === 0) return null;
  const en = list.find((n) => {
    if (!n || typeof n !== 'object') return false;
    const lang = (n as Record<string, unknown>)['@lang'];
    return lang === 'en' || lang === 'EN';
  });
  return textOf(en ?? list[0]);
}

export function dig(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function normalizeEpoNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/** Build a DocDB-ish / epodoc-friendly publication id for URL path segments. */
export function encodePublicationPathSegment(number: string): string {
  return encodeURIComponent(normalizeEpoNumber(number));
}
