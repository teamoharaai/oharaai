# Ohara Constellation Spec

**Version:** 1.1
**Date:** July 2026
**Status:** Architecture & Governance Reference
**Audience:** Engineering, VP Product, AI coding agents (Claude Code, Codex)

> **Canonical contract:** `docs/constellation/DECISIONS.md` is authoritative for
> node taxonomy, annotations, manual Evidence Links, virtual BRT clusters, edge
> kinds/valence, the graph DTO, production-data rules, privacy, and phase
> boundaries. This spec remains authoritative for extraction, validation,
> scoring, and archival concepts only where it does not conflict with that
> decision record.

---

## 1. Constellation Philosophy

Constellation is a symbolic map of a person's identity, ambition, and growth — rendered as a visual graph. It is not a dashboard. It is not a gamification layer. It is not a social graph.

Nodes in Constellation are earned through sustained reflection and action, never generated from activity alone. A completed task does not produce a node. A pattern — observed across time, across goals, across reflections — does. The graph reflects who the user is becoming, not what they have done.

Constellation operates on a principle of honest restraint. It withholds nodes until meaning is proven. It surfaces tensions alongside strengths. It archives rather than deletes. The visual experience should feel like looking at yourself from a distance: calm, honest, and slightly surprising.

Every design decision downstream — extraction thresholds, visibility budgets, edge rules, season archival — must preserve this character. If a feature makes the graph busier without making it more meaningful, it does not belong.

---

## 2. Node Categories and Definitions

### 2a. Node Taxonomy

| Category | Definition | Source | Visual Identity | Cardinality | Visibility |
|----------|-----------|--------|----------------|-------------|------------|
| **Season** | The human anchor. Represents the user's current chapter of life — a temporal and emotional container for all other nodes. | System-generated at account creation; transitions triggered by user or by Season Archive graduation. | Largest node. Central position. Primary brand color. Circular. | Exactly 1 in active graph. | Always visible. User-visible. |
| **Ambition** | Project-level intent. Represents a sustained direction the user is pursuing — broader than any single goal. | Sourced from the `projects` table. One Ambition node per active project. | Medium-large node. Rounded rectangle. Secondary brand color. | Max 5 in active graph (matches reasonable active project limit). | User-visible. Subject to visibility scoring when exceeding budget. |
| **Goal** | Execution layer. Represents a specific SMART goal the user is actively working toward. | Sourced from the `goals` table. Goals with status `active` may generate nodes; `complete` goals remain eligible during the grace period. `draft`, `stagnant`, `discovered`, and `archived` goals are excluded from the active graph. | Medium node. Diamond shape. Goal-status accent color (active vs. near-complete vs. stalled). | Max 12 in active graph. Complete goals archive after the grace period. | User-visible. Eligible active-graph goals are always rendered. |
| **Reflection** | A proven pattern of meaning extracted from Echo entries. Not a mirror of any single entry — a distillation across multiple entries that passed full validation. | Candidate extraction pipeline over Echo entries (see Section 3). | Small node. Circle. Reflection accent color. Glow intensity scales with aggregated score. | Max 20 in active graph. Strictly governed by validation thresholds. | User-visible. |
| **Trait** | A durable characteristic proven across multiple seasons. Traits are the slowest-moving, highest-confidence nodes. | Derived from character profile JSONB. Requires evidence across ≥2 seasons. | Small-medium node. Hexagon. Trait accent color (distinct from Reflection). | Max 8 in active graph. | User-visible. |
| **Tension** | An unresolved contradiction between two patterns in the user's behavior or values. Tensions are not failures — they are complexity made visible. | Contradiction detection pipeline (see Section 3d). | Small node. Two overlapping circles (Venn shape). Tension accent color. | Max 5 in active graph. | User-visible. System-generated. |

### 2b. Notes on Taxonomy

- **Reflection vs. Trait distinction:** A Reflection node represents a pattern observed within the current season (or across a small number of recent entries). A Trait node represents a pattern that has persisted across season boundaries. Reflection nodes may graduate to Trait nodes over time; this is a promotion, not a duplication.
- **Tension nodes** are the only node type that requires two existing candidates as inputs. They cannot exist without at least two validated or near-validated Reflection or Trait candidates in opposition.
- **Goal nodes** are the only node type directly tied to a mutable application-level status. The canonical values from `lib/goals/schema.ts` are `active`, `draft`, `complete`, `stagnant`, `discovered`, and `archived`. When a goal transitions to `complete`, the node enters a 14-day grace period before archiving.
- All visual identity descriptions are semantic, not literal. Implementation will map these to the design system's token layer (colors, sizes, shapes). No hex values or pixel dimensions are specified here.

### 2c. Separate User-Authored and Organizational Domains

- The earned/system taxonomy is closed: Season, Ambition, Goal, Reflection,
  Trait, and Tension.
- User-authored notes and projections are `ConstellationAnnotation` records,
  always marked as user-authored draft material. They are not earned nodes and
  never participate in validation, scoring, promotion, edge weights, or earned
  counts.
- Manual Echo-to-goal organization is represented by
  `ConstellationEvidenceLink`, not by graph edges, `echo_entry_links`, or
  `echo_entries.brt_user`.
- Goal-level Bud/Rose/Thorn display clusters are virtual read models derived
  from Evidence Links. They are never persisted as graph nodes.

See `docs/constellation/DECISIONS.md` for the complete persistence and DTO
contracts.

---

## 3. Echo Node Rules

Echo entries are raw signal. The pipeline from entry to Reflection node is the most strictly governed process in Constellation. The goal is zero false positives at the cost of slower node emergence.

### 3a. Candidate Extraction

**Trigger:** Every Echo entry processed by the AI layer.

**What the AI extracts:** The AI layer receives the Echo entry text and the user's current character profile JSONB as context. It produces zero or more **candidates** — semantic units that may eventually become Reflection nodes.

**Candidate types:**

| Type | Definition | Example |
|------|-----------|---------|
| **Theme** | A recurring subject or concern the user returns to across entries. | "creative autonomy", "relationship with authority" |
| **Trait** | A behavioral pattern or disposition the user consistently demonstrates. | "defaults to caretaking under stress", "processes grief through physical activity" |
| **Tension** | Two opposing patterns or values observed in the same or nearby entries. | "wants deep collaboration" vs. "resists vulnerability in teams" |
| **Insight** | A novel self-observation the user articulates — something they realize about themselves. | "I avoid starting things I care about because finishing matters too much" |

**Extraction output schema (per candidate):**

```typescript
interface ConstellationCandidate {
  id: string;                      // UUID
  user_id: string;                 // FK to auth.users
  type: 'theme' | 'trait' | 'tension' | 'insight';
  label: string;                   // Human-readable short label (3-8 words)
  description: string;             // One-sentence description of the pattern
  valence: 'positive' | 'negative' | 'neutral' | 'mixed';
  raw_confidence: number;          // 0.0–1.0, AI-assigned per extraction
  source_echo_id: string;          // FK to echo_entries
  source_goal_ids: string[];       // FKs to goals, if echo linked via echo_goal_links
  extracted_at: string;            // ISO timestamp

  // --- Vector pipeline contract fields (do not populate yet) ---
  embedding_text: string;          // The text string to embed when vector infra is active
  embedding_model: string | null;  // null until pgvector phase
  embedding_vector: number[] | null; // null until pgvector phase
}
```

**Raw confidence scoring:** The AI assigns `raw_confidence` between 0.0 and 1.0 based on:
- Specificity of language (vague → low, precise self-observation → high)
- Novelty relative to character profile (restating known trait → lower, new pattern → higher)
- Emotional depth (surface mention → lower, sustained exploration → higher)

Candidates with `raw_confidence < 0.3` are discarded at extraction time and not stored.

**Vector pipeline contract fields:** `embedding_text`, `embedding_model`, and `embedding_vector` are included in the schema now to prevent future schema migration. They remain null until pgvector is active. `embedding_text` must be populated at extraction time — it is the canonical string that will be embedded. Format: `"{type}: {label} — {description}"`.

### 3b. Aggregation

Candidates do not live in their own table. They are aggregated into the character profile JSONB under a dedicated `constellation_candidates` key.

**Character profile JSONB structure for candidates:**

```typescript
interface CharacterProfile {
  // ... existing keys (traits, patterns, tensions, growth_edges) ...

  constellation_candidates: {
    [candidateLabel: string]: {
      type: 'theme' | 'trait' | 'tension' | 'insight';
      label: string;
      description: string;
      occurrences: number;
      first_seen: string;           // ISO timestamp
      last_seen: string;            // ISO timestamp
      source_echo_ids: string[];    // All echo entries contributing
      source_goal_ids: string[];    // All linked goals
      valence_history: Array<{ valence: string; echo_id: string; timestamp: string }>;
      aggregated_score: number;     // Computed via formula below
      status: 'active' | 'emerging' | 'promoted' | 'archived' | 'excluded';
      promoted_node_id: string | null;  // FK to constellation node if promoted
      embedding_text: string;       // Canonical text for future embedding
    };
  };
}
```

**Aggregated score formula:**

```
aggregated_score = (occurrence_weight × occurrences)
                 + (recency_weight × recency_factor)
                 + (cross_goal_bonus × unique_goal_count)
```

Where:
- `occurrence_weight` = 1.0 per occurrence
- `recency_weight` = 2.0
- `recency_factor` = `1.0 / (1 + days_since_last_seen / 30)` — decays over ~30 days
- `cross_goal_bonus` = 1.5 per unique goal linked (capped at 4 goals = 6.0 max bonus)

The aggregated score is recomputed on every new candidate match. It is not computed on a schedule.

### 3c. Validation Thresholds

A candidate is promoted to a Reflection node when **all** of the following are met:

| Threshold | Value | Rationale |
|-----------|-------|-----------|
| Minimum occurrences | ≥ 3 | Prevents single-mention noise from becoming nodes. |
| Aggregated score floor | ≥ 5.0 | Ensures sustained or cross-goal evidence. |
| Time spread minimum | First seen and last seen ≥ 7 days apart | Prevents burst activity (e.g., 3 entries in one day) from promoting prematurely. |
| Contradiction ratio ceiling | ≤ 0.4 | If > 40% of valence history entries contradict the dominant valence, the candidate is flagged for Tension review instead of Reflection promotion. |

**Pending state:** A candidate that meets **2 of 4** thresholds enters `emerging` status. Pending candidates are visible to the system (for aggregation, deduplication, and Tension detection) but are not rendered as nodes. Users do not see pending candidates.

### 3d. Contradiction Handling

**Detection:** When a new candidate is extracted with a valence that opposes the dominant valence of an existing candidate with the same or semantically similar label, a contradiction event is recorded in the `valence_history` array.

**Contradiction ratio:** `contradicting_entries / total_entries` for that candidate.

**Routing logic:**

| Condition | Action |
|-----------|--------|
| Contradiction ratio > 0.4 AND total occurrences ≥ 4 AND both valence directions have ≥ 2 entries each | Promote to **Tension node**. The Tension node references both the positive and negative evidence. |
| Contradiction ratio > 0.4 AND insufficient evidence on one side | Block Reflection promotion. Candidate remains `active`, continues accumulating. |
| Contradiction ratio ≤ 0.4 | Proceed with normal Reflection validation. Minority valence entries are noted but do not block. |

**Minimum evidence for Tension node:** Both sides of the tension must have ≥ 2 valence entries each, and total occurrences ≥ 4. This prevents premature Tension nodes from a single contradictory entry.

### 3e. Exclusion Rules

| Rule | Enforcement Stage | Rationale |
|------|-------------------|-----------|
| Raw emotion words (sad, anxious, angry, happy, excited, frustrated, scared, lonely, bored, overwhelmed) | **Extraction** — AI prompt instructs exclusion of state-level emotion labels as candidate labels. They may appear in descriptions. | States are not patterns. |
| Single-occurrence mentions | **Aggregation** — candidates with `occurrences = 1` never reach validation. They remain in JSONB for future accumulation. | One mention is not a pattern. |
| Echo entries below 40-word floor | **Extraction** — entries under 40 words are skipped entirely by the candidate extraction pipeline. Echo still processes them for journaling; Constellation ignores them. | Short entries lack sufficient signal for reliable extraction. |
| Proper nouns (people's names, place names, brand names) | **Extraction** — AI prompt instructs that candidate labels must not contain proper nouns. If a pattern involves a person or place, it must be abstracted ("relationship with mentor" not "relationship with Sarah"). | Privacy and generalizability. |
| Duplicate of existing promoted node | **Aggregation** — dedupe rules (Section 3f) catch this. Candidate score folds into existing node rather than creating parallel candidate. | Graph cleanliness. |
| Candidates with `raw_confidence < 0.3` | **Extraction** — discarded before storage. | Below-threshold confidence is noise. |

### 3f. Dedupe Rules

**Pre-vector baseline (Phase 1 — active during pgvector-absent period):**

1. **Exact label match:** Case-insensitive. New candidate folds into existing candidate's occurrence count and valence history.
2. **Lemma matching:** Both labels are lemmatized (e.g., "creating" → "create", "creative autonomy" → "creative autonomy"). Match after lemmatization folds into existing.
3. **Synonym map:** A maintained static map of common near-synonyms relevant to personal growth (e.g., "resilience" ↔ "grit", "self-doubt" ↔ "imposter syndrome", "discipline" ↔ "consistency"). Matches via synonym map fold into the candidate with the higher aggregated score. The losing label is stored as an alias.

**Post-vector upgrade (Phase 2 — when pgvector is active):**

4. **Cosine similarity on embeddings:** Candidates with `embedding_vector` cosine similarity ≥ 0.85 are flagged for merge. Merge follows same fold-into-higher-score logic.
5. Synonym map is retained as a fast pre-filter; vector similarity is the authoritative merge signal.

**Dedupe × edge interaction:** When two candidates merge, any edges referencing the absorbed candidate are transferred to the surviving candidate. Edge weights are summed (capped at maximum edge weight — see Section 4).

**Priority upgrade path:** Cosine-similarity-based deduplication is the first logic to upgrade when pgvector columns are populated. The synonym map is a stopgap.

---

## 4. Edge Construction Rules

Edges represent meaningful relationships between nodes. They are not created because two nodes coexist in the graph.

Every edge has a `GraphEdgeKind` describing why its endpoints are related and a
separate nullable `GraphEdgeValence` describing emotional/behavioral character.
Structural relationship kinds must never be encoded as valence values. Manual
Evidence Links are their own domain; the goal-to-virtual-BRT-cluster edge is a
derived presentation edge with no graph weight.

### 4a. Edge Creation Conditions

An edge between Node A and Node B is created when **at least one** of the following conditions is met:

| Condition | Description | Applicable Node Pairs |
|-----------|------------|----------------------|
| **Co-occurrence in Echo** | Both nodes trace back to candidates extracted from the same Echo entry (via `source_echo_ids` overlap). Minimum 2 shared Echo entries required. | Reflection ↔ Reflection, Reflection ↔ Tension |
| **Goal linkage** | Both nodes are linked to the same goal (via `source_goal_ids` overlap). | Goal ↔ Reflection, Goal ↔ Trait, Goal ↔ Ambition |
| **Hierarchical containment** | A Goal node belongs to a Project that maps to an Ambition node. | Ambition ↔ Goal |
| **Trait derivation** | A Reflection node was promoted to a Trait node. The original Reflection (now archived or still active) retains an edge to its Trait. | Reflection ↔ Trait |
| **Tension composition** | A Tension node is composed of two opposing candidates. Edges connect the Tension to each source. | Tension ↔ Reflection, Tension ↔ Trait |
| **Season containment** | All nodes in the active graph have an implicit edge to the Season node. This edge is rendered at low opacity and is not subject to decay. | Season ↔ all |

### 4b. Prohibited Edges

| Pair | Rationale |
|------|-----------|
| Ambition ↔ Ambition | Projects are independent directions. Cross-project relationships emerge through shared Reflections. |
| Trait ↔ Trait | Traits coexist but do not directly relate to each other in the graph. Relationships between traits are expressed through shared Reflections or Tensions. |
| Goal ↔ Goal | Goals relate through their parent Ambition, not directly. |

### 4c. Edge Weight Formula

```
edge_weight = (co_occurrence_count × 1.0)
            + (recency_factor × 1.5)
            + (goal_overlap_bonus × 2.0)
```

Where:
- `co_occurrence_count` = number of shared Echo entries or shared goals
- `recency_factor` = `1.0 / (1 + days_since_last_shared_activity / 30)`
- `goal_overlap_bonus` = 1.0 if both nodes share at least one goal, else 0.0

**Maximum edge weight:** 15.0 (hard cap). Prevents any single relationship from visually dominating.

### 4d. Edge Decay

- Edges lose `0.1` weight per 7-day period with no new shared activity.
- When edge weight reaches `0.0`, the edge is removed.
- Decay is computed lazily — on graph render, not on a schedule.
- Season ↔ node edges do not decay.

### 4e. Edge Budget

- **Maximum edges per node:** 6. When a 7th edge would be created, the lowest-weight existing edge is removed.
- This prevents high-activity nodes from becoming fully connected hubs that collapse the graph's visual structure.

---

## 5. Visibility Scoring

### 5a. Visibility Score Formula

Each node has a visibility score that determines its render priority:

```
visibility_score = (aggregated_score × 0.4)
                 + (edge_count × 0.2)
                 + (recency_factor × 0.3)
                 + (type_weight × 0.1)
```

Where:
- `aggregated_score` = the node's aggregated score (for Reflection/Trait nodes) or a fixed value for structural nodes (Goal = 5.0, Ambition = 7.0)
- `edge_count` = number of active edges on this node (0–6)
- `recency_factor` = `1.0 / (1 + days_since_last_activity / 30)`
- `type_weight` = per-type constant: Season = 10.0, Trait = 3.0, Tension = 2.5, Reflection = 2.0, Goal = 1.5, Ambition = 1.0

### 5b. Render Budget

**Maximum nodes in active graph:** 30.

This is a hard cap. If more than 30 nodes qualify for the active graph, the lowest-visibility-score nodes are deferred (not archived — they remain active but unrendered, and are shown in an overflow list accessible via the UI).

### 5c. Always-Rendered Nodes

The following nodes bypass visibility scoring and are always rendered:

| Node Type | Condition |
|-----------|-----------|
| Season | Always (exactly 1). |
| Goal | Status is `active`. `complete` goals within the 14-day grace period are also always rendered. `draft`, `stagnant`, `discovered`, and `archived` goals are excluded. |
| Tension | Always rendered while active. Tensions are high-signal and should never be hidden by budget constraints. |

Always-rendered nodes count against the 30-node budget. The remaining budget is filled by highest-visibility-score Reflection, Trait, and Ambition nodes.

### 5d. Score Decay

Visibility score decays naturally via the `recency_factor` component. No separate decay mechanism is needed. A node with no new activity will lose ~50% of its recency contribution within 30 days and ~90% within 90 days.

---

## 6. Season Archive

### 6a. Archival Threshold

A node is archived when **all** of the following are true:

| Condition | Value |
|-----------|-------|
| No new contributing Echo entry or goal activity | ≥ 60 days |
| Visibility score | < 2.0 |
| Node type | Not Season, not an active Goal |

Archival is evaluated lazily on graph render, not on a cron. The evaluation checks are inexpensive (timestamp comparison and score check).

### 6b. Graduation Process

When a node is archived:

1. Its `status` transitions to `archived`.
2. All edges connected to it are snapshotted (node pairs, weights at time of archival) and stored in the node's archive metadata.
3. The node's full state is preserved: label, description, type, aggregated score, valence history, source IDs, edge snapshot.
4. The node is removed from the active graph render.
5. If the archived node was a Reflection with evidence spanning ≥ 2 seasons, it is flagged as a **Trait candidate** for the next season's Trait evaluation.

**Archive metadata schema (stored in character profile JSONB under `constellation_archive`):**

```typescript
interface ArchivedNode {
  node_id: string;
  label: string;
  type: 'theme' | 'trait' | 'tension' | 'insight' | 'ambition' | 'goal';
  description: string;
  aggregated_score_at_archive: number;
  valence_history: Array<{ valence: string; echo_id: string; timestamp: string }>;
  source_echo_ids: string[];
  source_goal_ids: string[];
  edge_snapshot: Array<{ target_node_id: string; weight: number }>;
  archived_at: string;             // ISO timestamp
  season_label: string;            // Which season this node belonged to
  reactivation_count: number;      // How many times this node has been reactivated
  embedding_text: string;          // Preserved for vector pipeline

  // Goal-specific outcome signal (null for non-goal node types)
  completion_state: 'completed' | 'abandoned' | 'failed' | null;
  // 'completed'  — goal reached its target
  // 'abandoned'  — user disengaged without explicit resolution
  // 'failed'     — user explicitly marked as failed
  // Fine-tuning note: abandoned and failed states are high-signal training
  // data for understanding disengagement patterns. Preserve with priority.
}
```

### 6c. Season Archive as Product Surface

**What the user sees:**
- A navigable timeline of past seasons, each displayed as a static constellation snapshot.
- Each season shows: the Season node label, the date range, and all nodes that were active during that season (both those that archived within it and those that carried into the next season).
- Users can tap any archived node to see its full history: when it first appeared, which Echo entries contributed, which goals it connected to, and its valence trajectory.

**What the user can interact with:**
- Browse seasons chronologically.
- Tap nodes to view detail.
- Manually reactivate an archived node (see 6d).
- Users cannot delete archived nodes. The archive is append-only from the user's perspective.

**Season delineation:**
- A new season is created when the user explicitly declares one (via a "New Season" action in the UI), OR when the system detects that ≥70% of active Reflection nodes have been archived since the last season start. The latter is a soft suggestion surfaced to the user, not an automatic transition.

### 6d. Reactivation Rules

An archived node re-enters the active graph when:

1. **Automatic reactivation:** A new Echo candidate matches the archived node's label (via dedupe rules from Section 3f). The archived node is reactivated with its historical `aggregated_score` decayed by 50%, plus the new candidate's contribution. This rewards recurring patterns without giving full historical weight.
2. **Manual reactivation:** The user taps "Bring back" on an archived node in the Season Archive. The node re-enters with its historical `aggregated_score` decayed by 50%. No new evidence is required.

Reactivated nodes increment their `reactivation_count`. Nodes reactivated ≥ 2 times are strong Trait promotion candidates.

### 6e. Season Archive as Fine-Tuning Signal

Season Archive data represents longitudinal behavioral signal — the highest long-term value data Ohara produces.

**Data format for fine-tuning export:**

```json
{
  "user_id": "anonymized_hash",
  "season": {
    "label": "Season label",
    "start": "ISO timestamp",
    "end": "ISO timestamp"
  },
  "nodes": [
    {
      "type": "reflection",
      "label": "creative autonomy",
      "aggregated_score": 8.5,
      "occurrences": 7,
      "valence_trajectory": ["positive", "positive", "mixed", "positive", "positive", "positive", "positive"],
      "cross_goal_count": 3,
      "reactivation_count": 1,
      "was_promoted_to_trait": false
    }
  ],
  "edges": [
    {
      "source_label": "creative autonomy",
      "target_label": "avoiding external validation",
      "weight_at_archive": 6.2,
      "co_occurrence_count": 4
    }
  ],
  "profile_snapshot": { /* character profile JSONB at season end */ }
}
```

**Export considerations:**
- All `user_id` values are anonymized (one-way hash) before export.
- Proper nouns are already excluded at extraction (Section 3e), but a second-pass scrub should run before any training data leaves the platform.
- Season Archive data trains the model on: pattern recognition over time, appropriate node promotion timing, valence trajectory interpretation, and Tension identification. These are the core Constellation intelligence capabilities.

---

## 7. Vector DB Strategy

### 7a. Retrieval Use Cases

| Use Case | What Is Embedded | Query | Expected Output | Consuming Surface | Pipeline Phase |
|----------|-----------------|-------|-----------------|-------------------|---------------|
| **Echo reflections for a goal** | Echo entry `embedding_text` (full entry text, truncated to 512 tokens) | Goal description + milestone notes as query vector | Top-5 most semantically relevant Echo entries for that goal | Vault (Echo Trail view) | pgvector (Phase 1) |
| **Reflections tied to a candidate** | Candidate `embedding_text` ("{type}: {label} — {description}") | Candidate embedding as query vector against Echo entry embeddings | Echo entries that most strongly evidence a Constellation candidate | Constellation detail view | pgvector (Phase 1) |
| **Cross-season behavioral similarity** | Archived node `embedding_text` | New candidate embedding as query against archived node embeddings | Archived nodes with cosine similarity ≥ 0.80 — triggers reactivation review | Constellation reactivation pipeline | Qdrant (Phase 2) |
| **Pre-summarization context selection** | Echo entries (same as row 1) | "Summarize recent patterns for user X" — query composed from last 3 candidate labels | Top-10 most relevant Echo entries to include as summarization context (reduces token load) | AI summarization pipeline (`lib/ai/`) | pgvector (Phase 1) |
| **Smarter candidate extraction context** | Character profile semantic units (one embedding per JSONB key-value pair) | Current Echo entry text as query | Top-5 most relevant existing character profile facets — provided as context to extraction prompt | Candidate extraction pipeline | Qdrant (Phase 2) |

### 7b. Fine-Tuning Use Cases

| Surface | Data Format | Minimum Volume | Privacy Considerations | Behavioral Capability Trained | Season Archive Enrichment |
|---------|-------------|---------------|----------------------|------------------------------|--------------------------|
| **Echo + AI summaries** | `{ "input": "echo_entry_text", "output": "ai_summary_text", "metadata": { "user_hash", "timestamp", "linked_goals" } }` | ~500 paired examples across ≥50 users | Anonymize user IDs. Scrub proper nouns. Entries with `is_private` flag excluded. | Empathetic, growth-aware summarization voice. Pattern recognition in reflective text. | Archived season summaries add temporal depth — model learns how summary style should evolve as familiarity increases. |
| **Goal creation conversations** | `{ "input": "conversation_transcript", "output": "structured_smart_goal_json", "metadata": { "user_hash", "goal_category" } }` | ~300 paired examples across ≥30 users | Anonymize. Strip identifying details from conversation text. | SMART goal formulation from conversational input. Domain-aware goal structuring. | Not directly enriched by Season Archive. |
| **Character profile evolution** | `{ "profile_snapshots": [ { "timestamp": "T1", "profile": { ... } }, { "timestamp": "T2", "profile": { ... } } ], "delta_summary": "what changed and why" }` | ~100 users with ≥3 profile snapshots each | Entire profile is user data — anonymize fully. | Understanding personality evolution. Predicting which traits are durable vs. transient. | Season Archive provides the richest version of this — each season boundary is a natural snapshot point. Highest long-term training value. |
| **Season Archive (historical)** | See Section 6e export format. | ~50 users with ≥2 completed seasons each | Full anonymization. Second-pass proper noun scrub. | Longitudinal pattern recognition. Season-appropriate node promotion. Tension identification across time. Reactivation prediction. | **This is the Season Archive data.** Flagged as highest long-term training value. |
| **Summarization I/O pairs** | `{ "input_context": "echo_entries + profile_context", "output": "structured_summary", "metadata": { "user_hash", "timestamp" } }` | Preserve from day one — even 50 pairs have value for early fine-tuning experiments. | Same as Echo entries. | Core summarization capability. Most direct training signal for the hosted LLM's primary task. | Season-end summarizations are the densest signal — they synthesize an entire season's worth of growth. Preserve these with priority. |

**Critical note:** Summarization I/O pairs must be preserved in structured Vercel logs from pilot launch. This is the highest-priority fine-tuning signal and the easiest to lose if logging is not instrumented from day one.

### 7c. pgvector Implementation Notes

**Tables receiving vector columns (aligned with locked priority order):**

| Priority | Table | Column Name | What Is Embedded | Embedding Dimensions | Notes |
|----------|-------|------------|-----------------|---------------------|-------|
| 1 | `echo_entries` | `embedding` | Full entry text (truncated to 512 tokens) | 1536 | Highest retrieval value. Powers Echo Trail, pre-summarization context. |
| 2 | `goals` | `embedding` | Goal description + concatenated milestone notes | 1536 | Powers goal-Echo retrieval. |
| 3 | `character_profiles` (or equivalent JSONB host table) | N/A — embeddings stored per semantic unit in a separate `profile_embeddings` table | Individual JSONB key-value pairs (e.g., `"resilience": "User consistently recovers from setbacks by..."`) | 1536 | Requires a lightweight junction table: `profile_embeddings(user_id, profile_key, embedding)`. |
| 4 | `vault_items` | `embedding` | User-authored notes/reflections attached to vault items. Only items with text content > 40 words. | 1536 | Conditional — skip items that are pure file references without notes. |

**Embedding model for pilot scale:** `voyage-4-lite` (Voyage AI) at 1024 
dimensions. Rationale: 200M token free tier covers the entire pilot with zero 
embedding cost. Voyage 4 models share a single embedding space — documents 
embedded with `voyage-4-lite` are compatible with queries run against 
`voyage-4-large` or `voyage-4-nano` without re-indexing. When Ohara 
self-hosts, the target embedding model is `voyage-4-nano` (Apache 2.0, 
available on Hugging Face), which can run alongside the self-hosted LLM 
at zero additional vendor cost. The `embedding_text` field contract ensures 
re-embedding with any future model requires no application logic changes.

**Index type:** HNSW (`hnsw`). Rationale: HNSW provides better recall than IVFFlat at small-to-medium scale (pilot = < 100k vectors) and does not require periodic re-training. Supabase pgvector supports HNSW natively.

```sql
-- Example index creation (echo_entries)
CREATE INDEX ON echo_entries
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Query patterns:**

| Retrieval Use Case | Query Pattern |
|-------------------|---------------|
| Echo reflections for a goal | `SELECT * FROM echo_entries ORDER BY embedding <=> $goal_embedding LIMIT 5;` |
| Reflections tied to a candidate | `SELECT * FROM echo_entries ORDER BY embedding <=> $candidate_embedding LIMIT 10;` |
| Pre-summarization context | `SELECT * FROM echo_entries WHERE user_id = $uid ORDER BY embedding <=> $query_embedding LIMIT 10;` |

### 7d. Qdrant Migration Notes

**Collection mapping:**

| pgvector Table | Qdrant Collection | Notes |
|----------------|-------------------|-------|
| `echo_entries.embedding` | `echo_embeddings` | Payload includes `user_id`, `echo_id`, `created_at`, `goal_ids`. |
| `goals.embedding` | `goal_embeddings` | Payload includes `user_id`, `goal_id`, `status`. |
| `profile_embeddings` | `profile_embeddings` | Payload includes `user_id`, `profile_key`. |
| `vault_items.embedding` | `vault_embeddings` | Payload includes `user_id`, `vault_id`, `item_id`. |

**What changes:**
- Embedding generation moves from Supabase trigger / API route to a dedicated embedding service co-located with the self-hosted LLM.
- Retrieval queries switch from SQL to Qdrant's REST/gRPC API.
- Embedding model switches from `text-embedding-3-small` to the self-hosted model's embedding layer.
- Filtering by `user_id` moves from SQL `WHERE` clause to Qdrant payload filtering.

**What stays the same:**
- The `embedding_text` field on all source records remains the canonical input to the embedding function.
- Candidate extraction pipeline logic is unchanged.
- Cosine similarity is the distance metric in both systems.
- All retrieval use cases remain the same; only the query transport changes.

**Validation before decommissioning pgvector:**
1. Run parallel queries against both pgvector and Qdrant for 2 weeks. Compare top-5 results for each retrieval use case. Require ≥ 95% overlap before cutover.
2. Verify Qdrant payload filtering produces identical user-scoped results to pgvector `WHERE user_id = $uid`.
3. Confirm embedding dimension parity between old and new embedding models (may require re-embedding all vectors if dimensions change).
4. Run a full retrieval benchmark: latency p50/p95/p99 must meet or beat pgvector performance.

### 7e. Field Preservation Contracts

| Table | Field | Semantic Value | Transformation Needed | Pipeline Role |
|-------|-------|---------------|----------------------|---------------|
| `echo_entries` | `content` | Full reflection text | Truncate to 512 tokens for embedding | Both |
| `echo_entries` | `created_at` | Temporal ordering | None | Retrieval-only |
| `echo_entries` | `id` | FK reference | None | Both |
| `goals` | `description` | Goal intent | Concatenate with milestone notes for embedding | Both |
| `goals` | `milestones` (JSONB) | Milestone text | Extract text content, concatenate | Both |
| `goals` | `status` | Active/complete filter | None | Retrieval-only |
| `goals` | `id` | FK reference | None | Both |
| `character_profiles` | All JSONB keys | Individual semantic units | Each key-value pair embedded separately | Both |
| `vault_items` | `content` / `notes` | User-authored text | Only embed if > 40 words | Retrieval-only |
| `vault_items` | `vault_id` | Goal-vault linkage | None | Retrieval-only |
| `echo_goal_links` | `echo_id`, `goal_id` | Echo-goal association | None — used as join, not embedded | Both |
| `echo_goal_links` | `confidence` | Link strength | May be used as retrieval weight | Retrieval-only |
| `projects` | `description` | Project intent | Defer embedding to Phase 3 | Fine-tuning-only |
| `constellation_candidates` (JSONB) | `embedding_text` | Canonical embed string | Already formatted at extraction | Both |
| `constellation_archive` (JSONB) | `embedding_text` | Archived node embed string | Already formatted | Fine-tuning-only |

---

## 8. Terminology Recommendations

| Term | Recommendation | Rationale |
|------|---------------|-----------|
| **Current Season** | ✅ Retain as-is | "Current Season" is clear, maps to the Season Archive concept, and carries the right connotation of temporal chapters. It avoids "sprint" or "phase" vocabulary that would feel like project management. |
| **Constellation** | ✅ Retain as-is | Strong metaphorical resonance. Stars/nodes, connections/edges, looking up at a map of meaning. Well-differentiated from "graph", "network", or "map". Carries the right emotional weight. |
| **Echo** | ✅ Confirmed architecturally sound | Echo as a term maps cleanly to its function (reflection that returns to you) and its data role (source of Constellation signal). No rename needed. Locked per project governance. |
| **Ambition** | ✅ Retain as-is | "Ambition" elevates projects beyond task containers. It signals intent and direction, which aligns with Constellation's identity-first philosophy. Architecturally, it maps 1:1 to the `projects` table without confusion. |
| **Trait** | ✅ Retain as-is | "Trait" accurately describes durable, cross-season characteristics. It is the right psychological term and distinguishes clearly from "Reflection" (seasonal patterns). |
| **Season Archive** | ✅ Retain as-is | "Archive" is honest — it communicates preservation without loss. "Season Archive" as a compound term is self-documenting for engineers and intuitive for users. |
| **Emerging** | ✅ Locked | The candidate state before full validation. "Emerging" conveys that the pattern is forming but not yet proven — a growth metaphor consistent with Ohara's voice. Use `emerging` as the enum value in code and "Emerging" in any user-facing context. Do not use "pending" anywhere in the Constellation codebase. |

---

## 9. What Remains Deferred

### 9a. Canonical Delivery Phases

- **Initial:** honest empty states and a read-only graph backed by real owner
  data.
- **Next:** annotation creation, Evidence Link management, derived virtual BRT
  clusters, and owner-only inspectors.
- **Deferred:** force layout, pan/zoom, Timeline, Season Archive, arbitrary
  node-to-node manual topology, and sharing.

Mock graph data is development/test-only. Production must render real data, a
Season-only state, or an honest `patterns_forming` state. It must never fall
back to fixtures.

| Item | Status | Rationale |
|------|--------|-----------|
| **Force simulation and dynamic graph layout** | Deferred | This spec defines the data model and rules. Layout algorithms (force-directed, radial, hierarchical) remain outside the initial and next phases. |
| **Multi-model routing for candidate extraction** | Deferred to Phase 2 | Phase 1 uses Haiku for all AI interactions including candidate extraction. Sonnet or a larger model for extraction is a Phase 2 optimization once extraction quality can be measured against pilot data. |
| **Vector infrastructure implementation** | Deferred (field contracts are in scope; column additions and index creation are Conversation 3) | This spec defines the contracts and schemas. Actual `ALTER TABLE` statements, pgvector extension setup, and embedding pipeline code are implementation tasks. |
| **Swift/SwiftUI native Constellation** | Deferred pending codebase decision | Constellation Phase 1 renders in React Native Web. A native Swift implementation may be pursued for performance on iOS but requires a separate architecture decision about maintaining two rendering codebases. |
| **Embedding model selection beyond pilot** | Deferred to self-hosting timeline | Pilot uses `text-embedding-3-small`. The production embedding model will be the self-hosted LLM's embedding layer, which is not yet selected. |
| **Phase 3 features** | Deferred | Includes: Institutional and Community Space types, project description embedding, community-level Constellation aggregation, cross-user pattern analysis (requires explicit consent architecture). |
| **Constellation interactive manipulation** | Deferred | Selection and inspectors may ship in the next phase, but force layout, drag, pan/zoom, and arbitrary manual edge creation remain deferred. |
| **AI-generated season summaries** | Deferred to Phase 2 | The system could generate a narrative summary when a season closes. This requires summarization prompt design and is not necessary for the Phase 1 data model. |
| **Constellation sharing / public view** | Deferred | The goal visibility model already exists, but Constellation sharing still requires a separate consent, authorization, and excerpt-privacy design. |

---

*End of spec.*
