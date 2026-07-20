# components/CLAUDE.md — Component Rules

Owner: VP Product. Cascade Level 1 (visual), Level 2 (data fetching).

## Theme (enforced everywhere)
Post-redesign warm ramp (Sessions 1–4c). Canonical tokens: `constants/colors.ts` → `LIGHT_THEME`.
- Page background: warm cream #F8F4EC (`background.page`, was #F5F1EA)
- Cards: white #FFFFFF (`background.card`), rounded 16px, warm border #EDE6D8 (`border.warm`), soft shadow
- Sidebar: deep emerald #1E3226 (`background.sidebar`, was #3D5247)
- Accent: earth green #4A7C5F (`accent.primary` / `text.accent` / `border.accent`, was #3D5247); teals `accent.tealMid` #2F8F6D, `accent.tealSoft` #9FD9C4
- Text: #211F1A primary, #8A8172 secondary, #A79E8E muted (`text.*`; retired #1A1F1C / #6B7B6E / #9CAF9F)
- Feedback: `feedback.danger` is `{ text, bg, border }` (not a flat hex) — danger/overdue text is `feedback.danger.text` #C0483A; `.bg`/`.border` are soft-tint values for error banners. Sibling groups: `feedback.pending.*` (unconfirmed AI-suggestion banners) and `feedback.info.*` (neutral info banners, e.g. Echo composer notices)
- Typography: Inter for all UI, Lora for editorial moments only
- BRT colors: Bud #4A7C5F, Rose #F59E0B, Thorn #EF4444

## Typography variants (components/ui/Typography.tsx)
Use the `Typography` component with a `variant` — do not hardcode font/size/color. Beyond the base set (`heading`, `title`, `body`, `label`, `caption`, `ai`/`ai-italic`, `eyebrow`, `greeting`, …), redesign added exact-spec variants: `card-title` (15.5px, ProjectCard title), `card-description` (12px/18, ProjectCard description), `goal-title` (14.5px/19, GoalRingCard title).

## Key Components
- GoalCard.tsx: shows title, status, progress, vault activity line, BRT micro-dots
- ProjectCard.tsx: teal status dot, project title + description, chevron toggle (collapsed by default); expands to a 2-column grid of GoalRingCards. Due-date color via `feedback.danger.text` when overdue.
- GoalRingCard.tsx: per-goal progress ring card (title, category, activity + due-date line) rendered inside expanded ProjectCard
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