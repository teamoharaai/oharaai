-- 023_pgvector_setup.sql
-- Constellation: pgvector extension, embedding columns, HNSW indexes
-- Spec ref: ohara_constellation_spec.md Section 7c

-- ═══════════════════════════════════════════
-- 1. Enable pgvector extension
-- ═══════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS vector
  WITH SCHEMA extensions;

-- ═══════════════════════════════════════════
-- 2. Add embedding + embedding_text columns
--    Dimension: 1024 (model: voyage-4-lite)
--    embedding_text = canonical text input to embedding function
--    embedding_model = model string for migration tracking
-- ═══════════════════════════════════════════

-- Priority 1: echo_entries
ALTER TABLE echo_entries
  ADD COLUMN IF NOT EXISTS embedding vector(1024),
  ADD COLUMN IF NOT EXISTS embedding_text text,
  ADD COLUMN IF NOT EXISTS embedding_model text;

-- Priority 2: goals
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS embedding vector(1024),
  ADD COLUMN IF NOT EXISTS embedding_text text,
  ADD COLUMN IF NOT EXISTS embedding_model text;

-- Priority 4: vault_items
ALTER TABLE vault_items
  ADD COLUMN IF NOT EXISTS embedding vector(1024),
  ADD COLUMN IF NOT EXISTS embedding_text text,
  ADD COLUMN IF NOT EXISTS embedding_model text;

-- ═══════════════════════════════════════════
-- 3. HNSW indexes (cosine similarity)
--    m=16, ef_construction=64 per spec
-- ═══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_echo_entries_embedding
  ON echo_entries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_goals_embedding
  ON goals
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_vault_items_embedding
  ON vault_items
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ═══════════════════════════════════════════
-- 4. Partial index: only embed vault_items with content
--    Spec: skip items that are pure file references without notes
-- ═══════════════════════════════════════════

-- This index helps the embedding pipeline query for
-- unembedded vault items that actually have embeddable content
CREATE INDEX IF NOT EXISTS idx_vault_items_needs_embedding
  ON vault_items (id)
  WHERE embedding IS NULL
    AND content IS NOT NULL
    AND length(content) > 200;
-- 200 chars ≈ 40 words at ~5 chars/word (spec: 40-word floor)
