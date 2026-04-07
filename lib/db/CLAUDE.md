# components/CLAUDE.md — Component Rules

Owner: VP Product. Cascade Level 1 (visual), Level 2 (data fetching).

## Theme (enforced everywhere)
- Page background: cream #F5F1EA
- Cards: white #FFFFFF, rounded 12px, shadow (0 2px 8px rgba(0,0,0,0.06))
- Accent: forest green #3D5247
- Text: #1A1A1A body, #6B7280 muted/secondary
- Typography: Inter for all UI, Lora for editorial moments only
- BRT colors: Bud #22C55E, Rose #F59E0B, Thorn #EF4444

## Key Components
- GoalCard.tsx: shows title, status, progress, vault activity line, BRT micro-dots
- ProjectCard.tsx: shows project title, description, child goal count, aggregate progress
- VaultItemCard.tsx: renders vault items by type (note/link/insight/action_update/document)
- EchoTrail.tsx: filtered echo entries for a goal, read-only, tap navigates to Echo
- ConstellationPreview.tsx: sample SVG graph + progress indicator (Phase 1 preview)
- Typography.tsx: shared typography component (components/ui/Typography.tsx)

## Rules
- NativeWind for all styling. No inline style objects unless NativeWind cannot express it.
- fontFamily: 'Inter' must be set explicitly on any Text not using Typography component.
- No heavy third-party UI libraries. Lightweight custom components preferred.
- Bottom sheets: simple Modal or custom component. No react-native-bottom-sheet.
- All components must work on both web and mobile (Platform-aware when needed).
- Optimistic UI for mutations. Update state immediately, revert on error.