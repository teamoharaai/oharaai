# CLAUDE.md — Ohara

> Paste this at the start of every Claude Code session.
> Last updated: 2026-03-25

## What is Ohara

Ohara is a goal-first social operating system. Users set SMART goals through a conversational AI, reflect via free-write journaling, and build a personal collage profile of documented effort over time. The AI learns each user through conversation summarization — never raw chat storage.

This is a **Phase 1 pilot build** for friends and family, shipping through the App Store.

## Tech stack (locked)

- **Expo (React Native Web)** — single codebase for web + iOS + Android
- **Supabase** — auth, database, row-level security, file storage
- **Anthropic API** — called directly from server-side, no middleware frameworks
- **NativeWind** — Tailwind-style utility classes for React Native
- **Zustand** — lightweight client state management
- **TypeScript** — strict mode, all files

## The four pillars (build order)

Phase 1 has four pillars built sequentially. Each depends on the one before it.

### Pillar 1: Goals (build FIRST)
SMART goal creation through conversational AI.
```
app/goals/create.tsx        — chat UI for goal creation
app/goals/[id].tsx          — individual goal view (milestones, progress, status)
lib/ai/goal-creation.ts     — orchestrator + SMART specialist pipeline
lib/db/goals.ts             — Supabase queries for goals + milestones
```

### Pillar 2: Reflection (build SECOND — requires Goals)
Free-write journaling with AI guide responses. Product name: Starlog.
```
app/starlog.tsx             — journal/reflection entry point
lib/ai/guides.ts            — three guide personalities (warm / direct / playful)
lib/ai/summarizer.ts        — converts journal entries to structured profile updates
lib/db/starlog.ts           — Supabase queries for reflection entries
```

### Pillar 3: Intelligence (build THIRD — requires Reflection)
Background AI engine that updates user understanding over time.
```
lib/ai/profile-updater.ts   — consumes summarizer output, updates character_profile
lib/ai/thorn-detector.ts    — identifies recurring negative patterns across reflections
lib/db/profile.ts           — Supabase queries for character profile
app/dashboard.tsx           — surfaces profile insights, goal health, patterns
```

### Pillar 4: Discovery (build FOURTH — requires Intelligence)
Converts recurring thorns into short-term exploration goals.
```
lib/ai/hobby-recommender.ts — suggests interests based on thorn patterns + profile
app/explore.tsx             — browse/accept suggested exploration goals
lib/db/interests.ts         — Supabase queries for interest tracking
lib/db/goals.ts             — ↑ extends (promoted discoveries become goals)
```

## What exists right now

<!-- UPDATE THIS SECTION AFTER EACH SESSION -->
- [ ] Repo scaffolded
- [ ] Supabase project created + schema applied
- [ ] Auth flow (signup/login/session)
- [ ] Goal creation conversation UI
- [ ] SMART specialist pipeline
- [ ] Goal saved to database
- [ ] Starlog reflection UI
- [ ] Guide responses
- [ ] Summarizer → profile updates
- [ ] Thorn detection
- [ ] Dashboard
- [ ] Explore/Discovery
- [ ] App Store build (Expo EAS)

## What does NOT exist yet (do not build unless asked)

- Social/community features (Phase 2)
- Public goal sharing / peer validation (Phase 2)
- Collage profile display (Phase 2 — schema-ready only)
- Digital Towns / civic layer (Phase 3)
- Affiliate recommendations (post-revenue)
- Push notifications
- Third-party integrations (Nike Run, HealthKit, etc.)

## Database schema (Supabase)

```sql
-- Extends Supabase auth.users
create table public.profiles (
  id uuid references auth.users(id) primary key,
  display_name text,
  created_at timestamptz default now(),
  character_profile jsonb default '{}'::jsonb,
  onboarding_complete boolean default false
);

-- Goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  title text not null,
  smart_data jsonb not null,
  mode text check (mode in ('exploration', 'commitment')) default 'exploration',
  status text check (status in ('active', 'complete', 'stagnant', 'discovered')) default 'active',
  category text check (category in ('body', 'mind', 'money', 'create', 'connect', 'contribute')),
  is_private boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Milestones
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade,
  title text not null,
  due_date date,
  complete boolean default false,
  created_at timestamptz default now()
);

-- Conversation summaries (NEVER raw chat — only structured summaries)
create table public.conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  goal_id uuid references public.goals(id),
  summary jsonb not null,
  created_at timestamptz default now()
);

-- Starlog entries (reflection journal)
create table public.starlog_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  goal_id uuid references public.goals(id),
  entry_text text not null,
  guide_response jsonb,
  brt_classification text check (brt_classification in ('bud', 'rose', 'thorn')),
  created_at timestamptz default now()
);

-- Interests / discovery tracking
create table public.interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) not null,
  source_thorn_id uuid references public.starlog_entries(id),
  promoted_goal_id uuid references public.goals(id),
  name text not null,
  status text check (status in ('suggested', 'exploring', 'promoted', 'dismissed')) default 'suggested',
  created_at timestamptz default now()
);
```

**RLS is mandatory on every table from day one.** Users can only read/write their own rows.

## AI architecture

### Goal creation pipeline
1. User sends message in chat UI
2. Orchestrator (Claude Sonnet) receives message + character_profile + conversation history
3. Five SMART specialists (Claude Haiku) run in parallel — same model, five different system prompts
4. Each specialist returns: `{satisfied: boolean, question?: string, flag?: string}`
5. Orchestrator reads all 5 verdicts, picks the most important gap, asks ONE natural question
6. Loop repeats until all 5 specialists return satisfied
7. Orchestrator synthesizes a proposed SMART goal, user confirms
8. Summarizer extracts key insights, updates character_profile — raw chat is NOT stored

### Reflection pipeline
1. User writes free-form in Starlog
2. AI classifies as bud/rose/thorn (internal only — user never sees this taxonomy)
3. One of three Guide personalities responds (warm / direct / playful)
4. Summarizer updates character_profile with new insights
5. Thorn detector checks for recurring patterns across entries

### Cost control
- Orchestrator: Claude Sonnet (reasoning-heavy, one call per turn)
- Specialists: Claude Haiku (focused evaluation, five parallel calls per turn)
- Target: < $0.01 per goal creation session
- NEVER call Sonnet where Haiku is sufficient

### Key AI rules
- Summarization over storage — never persist raw conversations
- BRT taxonomy (bud/rose/thorn) is internal only, never shown to users
- Character profile is the single source of personalization truth
- AI calls happen server-side only — API keys never reach the client
- Guide personalities: warm (Clo), direct (Lach), playful (Atri) — placeholder names

## Architecture rules (non-negotiable)

1. **TypeScript strict mode** — no `any` types, no implicit returns
2. **RLS on every table** — row-level security from day one, not retrofitted
3. **Server-side AI calls only** — Anthropic API key never reaches client
4. **Summarization, not storage** — raw chat is transient, only structured summaries persist
5. **Single source of types** — all shared types live in one file, imported everywhere
6. **Mobile-first design** — every screen designed for 390px viewport first
7. **No hardcoded roles or limits** — use config/constants that can extend for Phase 2
8. **Feature flags over deletion** — disable features with flags, never delete code paths
9. **One branch per feature** — never commit directly to main

## Scalability constraints

Things that MUST be designed now even though they ship later:

- `goals.is_private` exists now → enables public sharing in Phase 2
- `goals.category` uses a check constraint → extendable enum for new categories
- `profiles.character_profile` is jsonb → schema evolves without migrations
- `conversation_summaries.goal_id` is nullable → supports general (non-goal) conversations later
- `starlog_entries.goal_id` is nullable → supports standalone reflection in Phase 2
- File storage paths: `{user_id}/goals/{goal_id}/` → ready for collage assembly later

## Folder structure

```
ohara/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth screens
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (tabs)/                   # Main app tabs (protected)
│   │   ├── _layout.tsx           # Tab navigation layout
│   │   ├── dashboard.tsx         # Home/dashboard (Pillar 3)
│   │   ├── goals/
│   │   │   ├── index.tsx         # Goal list
│   │   │   ├── create.tsx        # Goal creation chat (Pillar 1)
│   │   │   └── [id].tsx          # Individual goal view
│   │   ├── starlog.tsx           # Reflection journal (Pillar 2)
│   │   └── explore.tsx           # Discovery (Pillar 4)
│   ├── _layout.tsx               # Root layout + auth guard
│   └── index.tsx                 # Landing/onboarding (public)
│
├── lib/
│   ├── ai/
│   │   ├── goal-creation.ts      # Orchestrator + specialist pipeline
│   │   ├── specialists/          # One file per SMART specialist
│   │   │   ├── specific.ts
│   │   │   ├── measurable.ts
│   │   │   ├── achievable.ts
│   │   │   ├── relevant.ts
│   │   │   └── timebound.ts
│   │   ├── guides.ts             # Three reflection guide personalities
│   │   ├── summarizer.ts         # Conversation → character profile update
│   │   ├── profile-updater.ts    # Writes summarizer output to profile
│   │   ├── thorn-detector.ts     # Pattern detection across reflections
│   │   └── hobby-recommender.ts  # Thorn → discovery suggestions
│   ├── db/
│   │   ├── client.ts             # Supabase client init
│   │   ├── goals.ts              # Goal CRUD + milestone queries
│   │   ├── starlog.ts            # Reflection entry queries
│   │   ├── profile.ts            # Character profile queries
│   │   └── interests.ts          # Interest/discovery tracking queries
│   ├── store/
│   │   └── index.ts              # Zustand stores
│   └── types/
│       └── index.ts              # ALL shared types — single source of truth
│
├── components/
│   ├── ui/                       # Generic reusable (Button, Input, Card)
│   ├── chat/                     # Goal creation chat components
│   ├── goals/                    # Goal display components
│   ├── starlog/                  # Reflection/journal components
│   └── explore/                  # Discovery components
│
├── constants/
│   └── index.ts                  # App-wide constants, feature flags, categories
│
├── supabase/
│   └── migrations/               # SQL migration files (schema versioned)
│
├── CLAUDE.md                     # This file
├── CONTEXT.md                    # Weekly session context (update every session)
├── app.json                      # Expo config
├── package.json
└── tsconfig.json
```

## Current session context

<!-- UPDATE THIS BLOCK AT THE START OF EVERY SESSION -->
```
Current task: [what you're building this session]
Branch: [git branch name]
Files touched last session: [list]
Blockers: [any]
```

## Exit criteria for Phase 1

All of these must be true before Phase 2 begins:
1. A real user (not team) can sign up, create a SMART goal through conversation, and see it on dashboard
2. User can write a Starlog reflection and receive a guide response
3. Character profile updates after each conversation and reflection
4. Returning user's next session reflects what the AI learned about them
5. App runs on iOS via Expo (EAS build) and web simultaneously
6. Zero crashes for 2 consecutive weeks