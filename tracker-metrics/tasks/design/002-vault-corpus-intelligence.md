# Design 002 — Vaults ↔ Notes ↔ Intelligence corpus (brief)

- **Date:** 2026-09-16
- **Initiative:** #2 (separate from Tasks-salvage). **Not built in this
  initiative** — this is a design brief to hand to the Entries/Notes owner.
- **Status:** Direction settled (TD-008); internals to be designed WITH the
  Entries owner. L3 (spans Entries + Vaults + AI ownership).
- **Depends on / consumes:** L1 goal-activity (`design/001` Part B). Designing L1
  cleanly now is what unblocks this later.

---

## Why this exists

Ohara Intelligence is built **output-first and starved of input**:
`app/api/intelligence` reads `profiles.character_profile` and emits one
observational sentence (Haiku, ≤120 chars), but the summarization step that once
wrote `character_profile.patterns` was removed ("never adopted"), so the profile
is ~never populated. Meanwhile Vaults were scaffolded (per-goal `vault_items`
with embeddings, CRUD, API, `useVault`, `vault.tsx`) but have **no producer** for
the `insight` type and **no AI** (`lib/ai/vault-insights.ts`, referenced by
`lib/ai/CLAUDE.md`, does not exist). Separately, "Notes" (the Entries system) grew
the rich content + intelligence-reference UX that Vaults originally implied.

The user wants Vaults **revived** and **connected to Notes**, feeding
Intelligence.

## The tension (two content stores)

- **Notes = Entries** (`features/entries/`, `entry_type='note'`, migrations
  036/042): Tiptap editor; `goalReference` marks (one note → many goals);
  `intelligenceReference` marks (highlight + question — **no AI call in v1**);
  checkbox→goal **progress evidence**. This is the authoring + highlight surface.
- **Vaults** (`vault_items`: note/link/document/insight/action_update; one vault
  per goal; embeddings): older, mostly-unused, no rich editor, no AI.

## Settled model (TD-008): Vault-as-corpus

- The Vault is a goal's **aggregated corpus + workspace view**, **not** a rival
  editor. It aggregates what is already linked to the goal: goal-referenced
  note-Entries + Echo reflections + vault-native artifacts (**links, documents,
  confirmed insights**) + (optionally) the L1 engagement signal.
- **Notes stay authored in the Notes editor.** Their `goalReference` marks make
  them surface in the goal's Vault — this is "connect Notes to Vaults" without a
  data migration or a second editor.
- **Direction is Vaults → Intelligence:** the vault corpus is the **source** Ohara
  reads and renders into `IntelligencePanel` (which sits beneath `AnalyticsPanel`,
  per design/001). Embeddings already exist on `vault_items`; Entries have their
  own embedding path.
- **`insight` vault item = confirmable saved insight (option ii):** when Ohara
  derives something worth keeping, the user confirms it (`metadata.confirmed` —
  the existing AI rule) and it persists as an `insight` item, re-entering the
  corpus (feedback loop).

## Open questions for the design-with-owner session (do not assume)

1. **Corpus membership & retrieval.** Exactly which sources compose the corpus
   (vault_items only; + goal-linked Entries; + L1 engagement) and how retrieval
   works (embeddings/`match_vault_items` vs. structured reads). User said "all
   three" but wants to elaborate.
2. **Aggregation mechanics.** Does the Vault *store* references to goal-linked
   Entries, or compute the aggregation on read via `echo_entry_links` +
   `goalReference` marks? (Read-time aggregation avoids duplication.)
3. **`vault_items` role going forward.** Keep `link`/`document`/`insight` as
   vault-native artifacts (the "bookkeeping" the user wants); is `note` as a
   vault_item now superseded by note-Entries (legacy-only)?
4. **The producer.** Revive `lib/ai/vault-insights.ts` as the insight producer
   (Haiku, suggestions-only, user-confirms, rate-limited 1/goal/24h per
   `lib/ai/CLAUDE.md`). What inputs → what insight shape → written where.
5. **Relationship to L2 recap + `character_profile`.** Does the corpus feed the
   weekly-recap pipeline (TD-007) and/or repopulate `character_profile.patterns`?
   This is where #2 and the recap initiative intersect — coordinate.
6. **IntelligencePanel data contract.** The panel consumes `{ insight, stats[],
   sourceName }` and has `stub|disconnected|connected` states. Define the real
   `connected` payload (corpus-derived insight + stats). Note L1 can already fill
   `stats[]` before any corpus work.

## Sequencing note

Nothing here is built until it is designed with the Entries owner. The one hard
dependency in the other direction: **initiative #1 must emit L1 in a stable,
documented shape** (`design/001` Part B) so this initiative can consume it
without rework.
