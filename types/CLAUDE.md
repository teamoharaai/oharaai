# types/CLAUDE.md — Type Definition Rules

Owner: CEO (Ariel). Cascade Level 3.

## Files
- goals.ts: Goal, Measurable types
- activity.ts: ActivityItem discriminated union (kind field)
- vault.ts: Vault, VaultItem, VaultItemType
- space.ts: Space, SpaceType, SpaceRole, SpaceMember
- echo-link.ts: EchoGoalLink, EchoLinkSource
- brt.ts: EchoBrt (canonical Bud/Rose/Thorn shape, required string[] fields)

## Rules
- All property names: camelCase (DB columns are snake_case, map at service layer)
- ActivityItem: discriminated union on 'kind'. All variants share 'id' + 'timestamp'.
- VaultItem.metadata is a typed object, not generic Record. Known keys: url, annotation, fileType, aiConfidence, confirmed, tags.
- Do NOT modify existing type shapes. Only extend unions (add new variants).
- Every new type file must be importable with zero side effects (pure types, no logic).

Modal.tsx now has a confirm/cancel API. That means every future destructive action in the app — goal deletion, echo entry deletion, eventually account actions — should route through it. Make sure this is documented in the shared component or in CLAUDE.md for components so Codex doesn't build another inline modal six blocks from now. A one-line comment at the top of Modal.tsx is enough: // Supports optional confirm/cancel actions and destructive variant — use for all confirmation dialogs.