# Ohara — Project Intelligence

## What is Ohara?

Ohara is a personal operating system for becoming. A mobile-first app (React Native / Expo) that helps users explore hobbies, set SMART goals through conversation, track milestones, and reflect through journaling.

**Tagline:** "Explore hobbies, track your goals."

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo (SDK 55) + TypeScript (strict) |
| Routing | expo-router v4 (file-based) |
| Styling | NativeWind v4 (Tailwind for RN) |
| Database | Supabase (Postgres + Auth + RLS) |
| State | Zustand |
| AI | Anthropic Claude (server-side) |

---

## Design Tokens (tailwind.config.js)

```js
cream:          '#FAF9F6'   // background
near-black:     '#1A1A1A'   // text, buttons
earth-green:    '#2D6A4F'   // accent, CTA sections
amber:          '#E09F3E'   // quotes, highlights
card-bg:        '#F3F1EC'   // card surfaces
muted:          '#6B6B6B'   // secondary text
```

Typography: System font. Headings use Instrument Serif on web via inline style.

---

## Folder Structure

```
app/
  index.tsx                  ← Landing page (DO NOT TOUCH)
  _layout.tsx                ← Root layout + auth guard
  (auth)/
    _layout.tsx
    login.tsx
    signup.tsx
  (tabs)/
    _layout.tsx              ← Bottom tab navigator
    dashboard.tsx
    goals/
      index.tsx
    starlog.tsx
    explore.tsx

lib/
  db/
    client.ts               ← Supabase client (AsyncStorage session)
  types/
    index.ts                ← All TypeScript types
  store/
    index.ts                ← Zustand stores (auth + goals)

constants/
  index.ts                  ← GOAL_CATEGORIES, FEATURES flags

supabase/
  migrations/
    001_initial_schema.sql
    002_enable_rls.sql
```

---

## Database Schema

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | FK → auth.users(id), PK |
| display_name | text | |
| character_profile | jsonb | AI-generated character data |
| created_at | timestamptz | |
| updated_at | timestamptz | auto-updated |

### `goals`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| title | text | |
| category | GoalCategory | body/mind/money/create/connect/contribute |
| mode | GoalMode | exploration/commitment |
| status | GoalStatus | active/complete/stagnant/discovered |
| smart_data | jsonb | SMART framework fields |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `milestones`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| goal_id | uuid | FK → goals |
| user_id | uuid | FK → auth.users |
| title | text | |
| is_complete | boolean | |
| created_at | timestamptz | |

### `conversation_summaries`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| goal_id | uuid | FK → goals |
| user_id | uuid | FK → auth.users |
| summary | text | |
| created_at | timestamptz | |

### `starlog_entries`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| title | text | |
| body | text | |
| brt_classification | BRTClassification | bud/rose/thorn |
| created_at | timestamptz | |

### `interests`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| name | text | |
| created_at | timestamptz | |

---

## Key Types

```typescript
GoalCategory = 'body' | 'mind' | 'money' | 'create' | 'connect' | 'contribute'
GoalMode     = 'exploration' | 'commitment'
GoalStatus   = 'active' | 'complete' | 'stagnant' | 'discovered'
BRTClassification = 'bud' | 'rose' | 'thorn'
```

---

## Feature Flags (`constants/index.ts`)

```typescript
STARLOG_ENABLED:      false  // Pillar 2
INTELLIGENCE_ENABLED: false  // Pillar 3
DISCOVERY_ENABLED:    false  // Pillar 4
SOCIAL_ENABLED:       false  // Phase 2
COLLAGE_ENABLED:      false  // Phase 2
```

---

## Auth Flow

1. Root `_layout.tsx` checks session via `supabase.auth.getSession()` on mount
2. Subscribes to `onAuthStateChange`
3. `useSegments` + `useRouter` guard:
   - Unauthenticated user hitting `(tabs)` → redirect to `/(auth)/login`
   - Authenticated user hitting `(auth)` → redirect to `/(tabs)/dashboard`
4. Landing page (`/`) always accessible

---

## Product Pillars

| Pillar | Name | Status |
|---|---|---|
| 1 | Goal Creation (conversational SMART goals) | 🔲 Not built |
| 2 | Starlog (BRT journaling) | 🔲 Not built |
| 3 | Intelligence (AI insights) | 🔲 Not built |
| 4 | Discovery (interest exploration) | 🔲 Not built |

---

## What exists right now

- [x] Repo scaffolded
- [x] Landing page (`app/index.tsx`) — polished, NativeWind
- [x] Auth flow (signup/login/session) — Supabase
- [x] Root layout with auth guard
- [x] Tab layout (4 placeholder screens)
- [x] Supabase client (`lib/db/client.ts`)
- [x] TypeScript types (`lib/types/index.ts`)
- [x] Zustand stores (`lib/store/index.ts`)
- [x] Database migrations (`supabase/migrations/`)
- [x] Constants + feature flags (`constants/index.ts`)
- [ ] Goal creation chat UI (Pillar 1)
- [ ] SMART goal storage + display
- [ ] Milestone tracking
- [ ] Starlog (Pillar 2)
- [ ] AI pipeline (Pillar 3)
- [ ] Discovery / Explore (Pillar 4)

---

## Current session context

**Session 1 (2026-03-25):** Project scaffold + auth foundation

Files created/modified:
- `app/_layout.tsx` — replaced with auth guard using useSegments + useRouter
- `app/(auth)/_layout.tsx` — new
- `app/(auth)/login.tsx` — new, email/password login with Supabase
- `app/(auth)/signup.tsx` — new, email/password/name signup + profile insert
- `app/(tabs)/_layout.tsx` — replaced with 4-tab navigator (Dashboard, Goals, Starlog, Explore)
- `app/(tabs)/dashboard.tsx` — new placeholder
- `app/(tabs)/goals/index.tsx` — new placeholder
- `app/(tabs)/starlog.tsx` — new placeholder
- `app/(tabs)/explore.tsx` — new placeholder
- `lib/db/client.ts` — Supabase client with AsyncStorage
- `lib/types/index.ts` — all domain types
- `lib/store/index.ts` — Zustand auth + goals stores
- `constants/index.ts` — GOAL_CATEGORIES + FEATURES flags
- `supabase/migrations/001_initial_schema.sql` — full schema
- `supabase/migrations/002_enable_rls.sql` — RLS policies
- `.env.local` — placeholder env vars (gitignored)
- `.env.example` — committed empty template

Packages added: `@supabase/supabase-js`, `zustand`, `@react-native-async-storage/async-storage`

**Next session:** Goal creation UI — conversational SMART goal flow (Pillar 1)
