-- 024_embedding_match_functions.sql
-- Constellation: Postgres match functions for semantic retrieval
-- Spec ref: ohara_constellation_spec.md Section 7a
-- search_path includes extensions so pgvector <=> operator resolves correctly

-- ═══════════════════════════════════════════
-- 1. match_echo_entries
--    Returns echo entries semantically closest to a query embedding.
--    Ownership enforced by WHERE user_id = match_user_id (defense in depth on top of RLS).
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_echo_entries(
  query_embedding extensions.vector(1024),
  match_user_id uuid,
  match_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  goal_id uuid,
  brt jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    e.id,
    e.user_id,
    e.content,
    e.goal_id,
    e.brt,
    e.created_at,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM echo_entries e
  WHERE e.user_id = match_user_id
    AND e.embedding IS NOT NULL
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_limit;
$$;

-- ═══════════════════════════════════════════
-- 2. match_goals
--    Returns goals semantically closest to a query embedding.
--    description column exists (migration 003). Included for retrieval context.
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_goals(
  query_embedding extensions.vector(1024),
  match_user_id uuid,
  match_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  description text,
  category text,
  status text,
  smart_data jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    g.id,
    g.user_id,
    g.title,
    g.description,
    g.category,
    g.status,
    g.smart_data,
    g.created_at,
    1 - (g.embedding <=> query_embedding) AS similarity
  FROM goals g
  WHERE g.user_id = match_user_id
    AND g.embedding IS NOT NULL
  ORDER BY g.embedding <=> query_embedding
  LIMIT match_limit;
$$;

-- ═══════════════════════════════════════════
-- 3. match_vault_items
--    Returns vault items semantically closest to a query embedding.
--    vault_items uses created_by (not user_id) for ownership — see migration 017.
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION match_vault_items(
  query_embedding extensions.vector(1024),
  match_user_id uuid,
  match_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  vault_id uuid,
  item_type text,
  title text,
  content text,
  created_by uuid,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT
    v.id,
    v.vault_id,
    v.item_type,
    v.title,
    v.content,
    v.created_by,
    v.created_at,
    1 - (v.embedding <=> query_embedding) AS similarity
  FROM vault_items v
  WHERE v.created_by = match_user_id
    AND v.embedding IS NOT NULL
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_limit;
$$;
