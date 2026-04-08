# Constellation Conversation 3 — Vector DB & Embedding Pipeline
## Block Summary & Decision Map

**Governing document:** `ohara_constellation_spec.md` (root folder), Section 7  
**Date started:** April 8, 2026  
**Migration state at start:** Through `022_spaces_rename_owner_id.sql` → next is `023`

---

## Locked Decisions (apply to all blocks)

| Decision | Value | Rationale |
|----------|-------|-----------|
| Embedding model | `voyage-4-lite` | Anthropic-affiliated, shared V4 embedding space allows future upgrade without re-indexing |
| Dimensions | 1024 (default for V4 family) | Matryoshka support: can bump to 2048 later but requires re-embedding |
| Index type | HNSW | Better recall than IVFFlat at pilot scale (< 100k vectors), no retraining needed |
| HNSW params | `m = 16, ef_construction = 64` | Spec-defined, balanced for pilot scale |
| Distance metric | Cosine similarity (`vector_cosine_ops`, `<=>` operator) | Voyage embeddings are normalized to length 1, so cosine = dot product |
| Max tokens per embedding | 512 | Spec Section 7a: truncate to 512 tokens |
| Min word count for embedding | 40 words (~200 chars) | Spec Section 3: minimum for reliable semantic extraction |
| `embedding_text` contract | Every embeddable record stores the canonical text that was embedded | Field stays even after Qdrant migration (Phase 2) |
| `embedding_model` column | Stored per record for migration tracking | When model changes, old records retain their model string |
| `input_type` parameter | `document` for writes, `query` for reads | Voyage-specific: enables optimized retrieval vectors |
| Env var name | `VOYAGE_API_KEY` | Stored in `.env.local` and Vercel env vars |
| API endpoint | `https://api.voyageai.com/v1/embeddings` | REST, not SDK — keeps dependency surface minimal |
| Free tier | 200M tokens | More than enough for entire pilot |
| Data retention | Opt out in Voyage dashboard | Prevents training on user data |

---

## Block 1 — pgvector Setup (CC) ✅ IN PROGRESS

**Migration:** `023_pgvector_setup.sql`  
**Tool:** CC (Claude Code)  
**Owner:** CTO (schema) — CEO reviewed architecture

### Scope
- Enable `pgvector` extension (`CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions`)
- Add three columns to each of `echo_entries`, `goals`, `vault_items`:
  - `embedding vector(1024)` — the vector itself
  - `embedding_text text` — canonical text that was embedded
  - `embedding_model text` — model string for migration tracking
- Create HNSW indexes on all three tables
- Create partial index on `vault_items` for unembedded items with content > 200 chars
- Add embedding fields to TypeScript types in `schema.ts` (append only, no rewrites)
- Create embedding constants in `lib/ai/constants.ts`

### Decisions that carry forward
- The `extensions` schema for pgvector (Supabase convention) — Block 3 retrieval functions must reference this correctly
- Column names `embedding`, `embedding_text`, `embedding_model` are now locked across all tables
- 1024 dimensions locked — Block 2 pipeline must match exactly
- Partial index on `vault_items` uses `length(content) > 200` as proxy for 40-word floor

### What to verify in CC output
- Migration is `023`, not `022`
- `IF NOT EXISTS` on extension and all `ADD COLUMN`
- No modification of existing columns
- TypeScript types are appended, not rewritten
- Constants file doesn't conflict with existing `lib/ai/config.ts`

---

## Block 2 — Voyage AI Embedding Pipeline (Codex)

**Tool:** Codex  
**Owner:** CEO (AI layer, `lib/ai/`)

### Scope
- Create `lib/ai/embeddings.ts` — the embedding client module
- Single function: `generateEmbedding(text: string, inputType: 'document' | 'query'): Promise<number[]>`
- Calls Voyage AI REST API directly (no SDK dependency)
- Truncation logic: truncate input to 512 tokens before sending
- Error handling: typed errors consistent with `lib/ai/errors.ts` pattern
- Rate limiting awareness: Voyage has its own rate limits (separate from Ohara's per-user AI quota)
- **Does NOT consume Ohara's daily AI quota** — embeddings are infrastructure, not user-facing AI calls

### Key decisions needed before running
1. **Should embedding calls go through `lib/ai/client.ts` chokepoint?**
   - Argument FOR: single observability point, consistent error handling
   - Argument AGAINST: embeddings are not LLM completions, they don't consume the user's daily quota, and the chokepoint is designed for Anthropic API calls
   - **Recommended:** NO — create a separate `lib/ai/embeddings.ts` that follows the same error patterns but doesn't route through `callLLM`. Log at the same structured JSON format for Vercel.

2. **Token counting strategy:**
   - Option A: Use a tokenizer library (e.g., `tiktoken` or similar) for precise truncation
   - Option B: Estimate at ~4 chars per token (512 tokens ≈ 2048 chars) — simpler, slightly lossy
   - **Recommended:** Option B for pilot. Precise tokenization adds a dependency for marginal benefit at this scale.

3. **Batch vs. single embedding calls:**
   - Voyage supports batch embedding (up to 1000 texts per call)
   - Phase 1: single calls are fine (embeddings happen on write, not bulk)
   - Batch function can be added later for backfill scripts
   - **Recommended:** Build single-call now, add `generateEmbeddings` (plural) batch wrapper as a stretch goal

### Inputs from Block 1
- `EMBEDDING_DIMENSIONS`, `EMBEDDING_MODEL`, `EMBEDDING_MAX_TOKENS` constants from `lib/ai/constants.ts`
- TypeScript types with embedding fields

### What carries forward to Block 3
- The `generateEmbedding` function signature and error types
- The `inputType` parameter pattern (`document` for writes, `query` for reads)

---

## Block 3 — Retrieval Functions in `lib/db/` (Codex)

**Tool:** Codex  
**Owner:** CTO (lib/db/) — CEO reviews query patterns

### Scope
- Create `lib/db/embeddings.ts` — retrieval query functions
- Three Phase 1 retrieval use cases from spec Section 7a:

| Function | Query Pattern | Use Case |
|----------|--------------|----------|
| `findSimilarEchoEntries(goalEmbedding, userId, limit=5)` | `echo_entries ORDER BY embedding <=> $1 WHERE user_id = $2 LIMIT $3` | Echo Trail in Vault — find reflections relevant to a goal |
| `findEchoEntriesForCandidate(candidateEmbedding, userId, limit=10)` | Same pattern, different limit | Constellation detail — evidence for a candidate |
| `findContextForSummarization(queryEmbedding, userId, limit=10)` | Same pattern, limit=10 | Pre-summarization context selection — reduce token load |

- All queries must include `WHERE user_id = auth.uid()` (RLS enforces this, but defense in depth)
- All queries must handle `null` embeddings gracefully (skip rows where embedding IS NULL)
- Return type includes similarity score (`1 - (embedding <=> query_vector)` for cosine distance)

### Key decisions needed before running
1. **Supabase client pattern for vector queries:**
   - Supabase JS client doesn't natively support `<=>` operator in `.select()` builder
   - Must use `.rpc()` calling a Postgres function, OR raw SQL via `supabase.rpc('match_echo_entries', {...})`
   - **Recommended:** Create Postgres functions in a new migration (`024_embedding_match_functions.sql`) that Block 3's Codex prompt references. This keeps the query logic in SQL where pgvector operators work natively.
   - **Decision needed:** Should this migration be part of Block 3 or a separate sub-block?

2. **Similarity threshold:**
   - Spec mentions cosine similarity ≥ 0.80 for cross-season reactivation (Phase 2)
   - Phase 1 retrieval: return top-N without threshold, let the consuming layer decide
   - **Recommended:** No hard threshold in Phase 1 retrieval functions. Return results with scores.

### Inputs from Block 1 & 2
- Column names and types from migration 023
- `generateEmbedding` function from Block 2 (used to embed the query before calling retrieval)
- Constants for dimensions

### What carries forward
- These retrieval functions are consumed by:
  - Vault Echo Trail view (existing UI, currently uses `echo_goal_links` — will optionally augment with semantic retrieval)
  - Future Constellation detail view
  - Future summarization pipeline (`lib/ai/pipelines/summarize.ts`)

---

## Block 4 — Candidate Extraction `embedding_text` Population (CC)

**Tool:** CC (Claude Code)  
**Owner:** CEO (AI layer)

### Scope
- Populate `embedding_text` on existing records so they're ready for embedding
- This is the **write-path logic** — when should `embedding_text` be computed and stored?

| Table | When `embedding_text` is populated | Format |
|-------|-----------------------------------|--------|
| `echo_entries` | On every Echo save (after BRT analysis) | Full `entry_text`, truncated to 512 tokens |
| `goals` | On goal creation AND on milestone update | `"{title}. {description}. Milestones: {milestone_1}, {milestone_2}, ..."` |
| `vault_items` | On vault item create/update, only if `content` > 40 words | Raw `content` field, truncated to 512 tokens |

- **Constellation candidates** (JSONB in character profile): `embedding_text` is formatted at extraction time as `"{type}: {label} — {description}"` per spec Section 3b

### Key decisions needed before running
1. **Trigger vs. application-layer population:**
   - Option A: Postgres trigger on INSERT/UPDATE → sets `embedding_text` automatically
   - Option B: Application layer sets `embedding_text` at the same point it writes the record
   - **Recommended:** Option B (application layer). Triggers hide logic, are hard to test, and add overhead to every write even when embedding isn't needed. The trigger pattern was specifically burned in earlier migrations (see `handle_new_user_space()` race condition fixed in migration 021).

2. **Should `embedding_text` population also trigger embedding generation?**
   - Option A: Populate text AND call `generateEmbedding` synchronously on every write
   - Option B: Populate text on write, run embedding as async background job
   - Option C: Populate text on write, embeddings generated by a separate backfill/cron process
   - **Recommended:** Option B for Echo entries (most frequent write path — embedding shouldn't block the user). Option A for goals (rare writes, can afford synchronous). Option C for initial backfill of existing records.

3. **Backfill script for existing records:**
   - Existing `echo_entries` and `goals` have no `embedding_text`
   - Need `scripts/backfill-embedding-text.ts` that reads existing records and computes `embedding_text`
   - This is text-only (no API calls) — fast and free
   - A separate `scripts/backfill-embeddings.ts` would then call Voyage for each record (API calls, costs tokens)
   - **Recommended:** Two separate scripts. Text population first, embedding generation second.

### Inputs from Blocks 1–3
- Column names from Block 1
- Embedding pipeline from Block 2 (for the optional synchronous path)
- Constants for truncation limits

### Files likely modified
- `lib/ai/echo-client.ts` or the Echo service — to populate `embedding_text` after BRT analysis
- `lib/ai/pipelines/create-goal.ts` or goal creation service — to populate `embedding_text` on goal save
- Vault item creation path — to populate `embedding_text` on vault item save
- New: `scripts/backfill-embedding-text.ts`
- New: `scripts/backfill-embeddings.ts` (calls Voyage API)

### Critical preservation notes
- **Do NOT modify the BRT analysis pipeline** — `embedding_text` population happens AFTER BRT, not instead of it
- **Do NOT modify the goal creation conversation flow** — `embedding_text` is set at the final save, not during the chat
- **Echo entry saves must remain non-blocking** — if `embedding_text` computation fails, the entry still saves

---

## Block 5 — `profile_embeddings` Junction Table (GATED)

**Tool:** CC  
**Owner:** CTO decision pending  
**Status:** Do not begin until CTO confirms approach

### What this is
Character profile JSONB stores semantic units (e.g., `"resilience": "User consistently recovers from setbacks by..."`). Each key-value pair needs its own embedding for the "smarter candidate extraction context" retrieval use case (spec Section 7a, row 5).

These can't go as columns on the `profiles` table — there are N key-value pairs per user, not a fixed number. So the spec proposes a junction table:

```sql
profile_embeddings (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  profile_key text NOT NULL,        -- e.g., "resilience", "communication_style"
  embedding vector(1024),
  embedding_text text,
  embedding_model text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, profile_key)      -- one embedding per key per user
)
```

### Decision needed from CTO
1. **Dedicated table vs. staying in JSONB:**
   - The spec recommends the junction table
   - CTO may prefer deferring this entirely to Phase 2 (Qdrant migration)
   - If deferred: Block 5 becomes a no-op for now, and profile embeddings only ship when Qdrant does

2. **If table is approved:**
   - Migration `025_profile_embeddings.sql` (or whatever the next number is after Block 3)
   - RLS: `user_id = auth.uid()` on all operations
   - HNSW index on `embedding` column
   - Population logic: runs after every character profile update in `lib/ai/pipelines/summarize.ts`

3. **Spec says this retrieval use case is Phase 2 (Qdrant):**
   - If CTO agrees, skip this block entirely
   - The other 4 blocks deliver a fully functional embedding pipeline without profile embeddings

### Recommendation
Defer Block 5. The three Phase 1 retrieval use cases (Echo-for-goal, Echo-for-candidate, pre-summarization context) all work without profile embeddings. This table only powers "smarter candidate extraction context," which is explicitly marked Phase 2 in the spec.

---

## Dependency Chain

```
Block 1 (pgvector + columns)
    ↓
Block 2 (Voyage AI pipeline)
    ↓
Block 3 (retrieval functions) ← may need migration 024 for Postgres match functions
    ↓
Block 4 (embedding_text population + write-path wiring)
    ↓
Block 5 (profile_embeddings — GATED, likely deferred)
```

Blocks 2 and 3 could technically run in parallel since Block 2 is `lib/ai/` (Codex) and Block 3 is `lib/db/` + migration (Codex), but Block 3's retrieval functions call Block 2's `generateEmbedding` for the query vector. Safer to run sequentially.

---

## Environment Setup Checklist

- [ ] Voyage AI account created at dash.voyageai.com
- [ ] API key generated
- [ ] Data retention opted out (Terms of Service → Opted Out)
- [ ] `VOYAGE_API_KEY` added to `.env.local`
- [ ] `VOYAGE_API_KEY` added to Vercel environment variables
- [ ] Migration 023 reviewed and pushed (Block 1 output)

---

## Spec Deviations from Original

| Original Spec | This Implementation | Reason |
|---------------|-------------------|--------|
| `text-embedding-3-small` (OpenAI), 1536 dims | `voyage-4-lite` (Voyage AI), 1024 dims | Anthropic ecosystem alignment, shared V4 embedding space for future upgrades |
| `profile_embeddings` table in Phase 1 | Deferred to Phase 2 / CTO decision | Only powers Phase 2 retrieval use case |
| Embedding pipeline unspecified | Separate `lib/ai/embeddings.ts`, not through `callLLM` chokepoint | Embeddings are infrastructure, not user-facing AI quota |