-- Composite pg_trgm score for conflict checks.
-- Full-string similarity() misses shared tokens (e.g. "Acme Dron" vs "Acme Group BV" ~0.26).
-- word_similarity() catches shared words (~0.5 for "Acme").

CREATE OR REPLACE FUNCTION conflict_trgm_score(a text, b text)
RETURNS float8
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT GREATEST(
    similarity(a, b),
    word_similarity(a, b),
    word_similarity(b, a)
  );
$$;
