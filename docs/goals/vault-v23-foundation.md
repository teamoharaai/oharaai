# Vault V2.3 foundation

Vault is a workspace presentation contract, not a second content store. `VaultWorkspace` accepts an explicit parent descriptor and renders filters, canonical linked entries, source material, private Sticky Notes, and evidence-backed activity. Goal fetching remains Goal-specific in V2.3; a future Project adapter can supply the same presentation contract.

## Storage decisions

- Sticky Notes remain `vault_items` with `item_type = 'note'` and now carry immutable `content_kind = 'sticky_note'`.
- Generic Vault notes retain `content_kind = 'generic'`. Text, title, or `item_type` are never used to guess identity.
- Migration 070 backfills only rows proven by migration 062 provenance (`migratedFrom = goal_notes` plus `legacyId`). Unproven records remain generic.
- Echo Notes and Reflections remain canonical Echo Entries linked to the Goal. Vault does not copy their content.
- Media stays in the existing metadata/storage path. Updating metadata cannot alter `content_kind`.

## Project-parent decision

Project-owned Vault schema is deferred to Projects V1.0. Adding a second parent now would change the existing `vaults.goal_id` non-null/unique contract, ownership triggers, RLS, RPCs, and aggregation behavior without a Project Vault consumer. That is not a safe additive release change. The parent-neutral UI contract avoids a presentation rewrite while preserving current Goal ownership enforcement.

## Study Card readiness

Study Cards are intentionally absent. A future note presentation mode belongs in a separate constrained field on an explicitly classified Sticky Note (for example, a `note_mode` adjacent to `content_kind`), with its own migration and validation. It should not overload `item_type`, infer from content, or change canonical ownership.
