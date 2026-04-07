# types/CLAUDE.md — Type Definition Rules

Owner: CEO (Ariel). Cascade Level 3.

## Files
- goals.ts: Goal, Measurable types
- activity.ts: ActivityItem discriminated union (kind field)
- vault.ts: Vault, VaultItem, VaultItemType
- space.ts: Space, SpaceType, SpaceRole, SpaceMember
- echo-link.ts: EchoGoalLink, EchoLinkSource

## Rules
- All property names: camelCase (DB columns are snake_case, map at service layer)
- ActivityItem: discriminated union on 'kind'. All variants share 'id' + 'timestamp'.
- VaultItem.metadata is a typed object, not generic Record. Known keys: url, annotation, fileType, aiConfidence, confirmed, tags.
- Do NOT modify existing type shapes. Only extend unions (add new variants).
- Every new type file must be importable with zero side effects (pure types, no logic).