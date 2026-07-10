export const AI_MODULE = 'ai';

/** Cached AI summaries / explanations older than this are regenerated. */
export const AI_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const AI_SUMMARIZE_SYSTEM_PROMPT =
  'You are an assistant for an intellectual property law firm. Summarise emails for busy attorneys. Be precise, neutral, and omit fluff.';

export const AI_RULE_EXPLAIN_SYSTEM_PROMPT =
  'You are an IP docketing assistant. Explain deadline rules in plain English for busy attorneys. Keep answers short and actionable.';

export const AI_DRAFT_SYSTEM_PROMPT =
  'You are a senior IP attorney drafting professional client email replies. Be concise, polite, and actionable. Do not invent facts not present in the context.';
