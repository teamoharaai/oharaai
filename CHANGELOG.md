# Changelog

All notable changes to Ohara are documented here.

---

## [0.2.0] — 2026-03-25

### Landing page + auth guard wiring

Built the public-facing landing page and connected the root layout to Supabase auth, completing the full unauthenticated → authenticated routing loop.

---

## What was built

### 1. Landing page (`app/index.tsx`)

Five-section marketing page in the Hims.com design style. No images — typography and spacing do the work.

| Section | Content |
|---|---|
| Nav | Sticky wordmark + "Log in" / "Get started" links to `/(auth)/login` and `/(auth)/signup` |
| Hero | Tagline "Explore hobbies, track your goals.", sub-headline, single CTA button, trust line |
| What is Ohara | 3 value cards: goals, reflection, progress |
| How it works | 3 numbered steps, horizontal on desktop / stacked on mobile |
| Social proof | 3 placeholder testimonial cards (to be replaced post-pilot) |
| Final CTA | Repeat headline + CTA on `earth-green` background |
| Footer | Copyright + About / Privacy / Terms placeholder links |

Design tokens used: `cream` background, `near-black` text, `earth-green` accent, `amber` pull-quote marks, `card-bg` card surfaces. Instrument Serif injected via Google Fonts on web; system font fallback on native.

### 2. Auth guard in root layout (`app/_layout.tsx`)

Root layout now handles session bootstrapping and enforces routing rules:

- On mount, calls `supabase.auth.getSession()` — renders a fullscreen spinner until resolved
- `onAuthStateChange` subscription keeps session state live for the entire app lifetime
- Guard logic (via `useSegments` + `useRouter`):
  - Unauthenticated user on `(tabs)` → `/(auth)/login`
  - Authenticated user on `(auth)` → `/(tabs)/dashboard`
  - Landing page `/` always accessible
- Stack registers `index`, `(auth)`, `(tabs)`, `+not-found` screens

### 3. Web HTML shell (`app/+html.tsx`)

- Injects `Instrument Serif` from Google Fonts (preconnect + stylesheet)
- Sets page `<title>` and `<meta description>`
- Base CSS: `#FAF9F6` background, `box-sizing: border-box`, subtle button hover transitions

### 4. NativeWind + Tailwind config

| File | Purpose |
|---|---|
| `tailwind.config.js` | Custom color tokens, NativeWind preset |
| `global.css` | `@tailwind` directives entry point |
| `babel.config.js` | NativeWind babel preset + `jsxImportSource` |
| `metro.config.js` | `withNativeWind` plugin wired to `global.css` |
| `nativewind-env.d.ts` | TypeScript types for `className` prop |

---

## [0.1.0] — 2026-03-25

### Project scaffold + auth foundation

This is the initial commit. It establishes the full project skeleton, authentication flow, database schema, and placeholder navigation — everything a new team member needs to run the app locally and understand how it fits together.

---

## What was built

### 1. Dependencies added

| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | ^2.100.0 | Backend client: auth, database, realtime |
| `zustand` | ^5.0.12 | Lightweight client-side state management |
| `@react-native-async-storage/async-storage` | ^3.0.1 | Persists Supabase auth session across app restarts |

Pre-existing (from boilerplate): `expo`, `expo-router`, `nativewind`, `react-native`, `typescript`.

---

### 2. Folder structure

```
app/
  index.tsx              ← Public landing page (marketing, links to signup/login)
  _layout.tsx            ← Root layout — auth guard lives here
  (auth)/
    _layout.tsx          ← Stack layout wrapper for auth screens
    login.tsx            ← Email + password login
    signup.tsx           ← Email + password + display name signup
  (tabs)/
    _layout.tsx          ← Bottom tab bar (Dashboard, Goals, Starlog, Explore)
    dashboard.tsx        ← Placeholder
    goals/
      index.tsx          ← Placeholder
    starlog.tsx          ← Placeholder
    explore.tsx          ← Placeholder

lib/
  db/
    client.ts            ← Supabase singleton client
  types/
    index.ts             ← All domain types (Profile, Goal, Milestone, etc.)
  store/
    index.ts             ← Zustand stores (auth + goals)

constants/
  index.ts               ← GOAL_CATEGORIES array + FEATURES feature flags

supabase/
  migrations/
    001_initial_schema.sql   ← All table definitions
    002_enable_rls.sql       ← Row-level security policies
```

---

### 3. Authentication flow

**How it works end-to-end:**

1. App opens → `app/_layout.tsx` calls `supabase.auth.getSession()` to check for an existing session (stored in AsyncStorage from a previous login).
2. While checking, a fullscreen spinner renders.
3. Once resolved, `useSegments` + `useRouter` enforce routing rules:
   - Unauthenticated user on a `(tabs)` route → redirected to `/login`
   - Authenticated user on an `(auth)` route → redirected to `/dashboard`
   - Landing page `/` is always accessible (no redirect)
4. `onAuthStateChange` subscription keeps session state live — logout from any screen takes effect immediately across the whole app.

**Signup flow:**
1. User fills display name, email, password in `app/(auth)/signup.tsx`
2. `supabase.auth.signUp()` creates the user in `auth.users`
3. On success, a row is inserted into `public.profiles` with the display name
4. User is redirected to `/(tabs)/dashboard`

**Login flow:**
1. User fills email + password in `app/(auth)/login.tsx`
2. `supabase.auth.signInWithPassword()` authenticates
3. On success, user is redirected to `/(tabs)/dashboard`

**Logout:** Any screen can call `supabase.auth.signOut()`. The `onAuthStateChange` listener in the root layout picks this up and `useSegments` redirects to login.

---

### 4. Database schema

Run these against your Supabase project in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_enable_rls.sql
```

**Tables:**

| Table | Description |
|---|---|
| `profiles` | One row per user. Linked to `auth.users`. Stores display name and AI-generated character profile (jsonb). |
| `goals` | User's goals. Each has a category, mode (exploration/commitment), status, and SMART data (jsonb). |
| `milestones` | Checkable steps within a goal. Belong to both a goal and a user. |
| `conversation_summaries` | AI conversation summaries attached to goals. |
| `starlog_entries` | Journal entries classified as bud/rose/thorn (BRT framework). |
| `interests` | User interest tags, used by the Explore/Discovery pillar. |

**Row-level security:** Every table has RLS enabled. All policies follow the same rule: users can only read/write rows where `user_id = auth.uid()` (or `id = auth.uid()` for `profiles`). No row from one user is ever accessible to another.

---

### 5. TypeScript types (`lib/types/index.ts`)

All database tables have matching TypeScript interfaces. Union types for constrained columns:

```typescript
GoalCategory    = 'body' | 'mind' | 'money' | 'create' | 'connect' | 'contribute'
GoalMode        = 'exploration' | 'commitment'
GoalStatus      = 'active' | 'complete' | 'stagnant' | 'discovered'
BRTClassification = 'bud' | 'rose' | 'thorn'
```

---

### 6. State management (`lib/store/index.ts`)

Two Zustand stores:

**`useAuthStore`** — session + loading state. Updated by `onAuthStateChange` in the root layout. Any component that needs to know who's logged in reads from here.

**`useGoalsStore`** — goals array + loading state + `fetchGoals` / `createGoal` / `updateGoal` actions. Actions are stubbed with `TODO` comments — they will be implemented in the Pillar 1 (goal creation) session.

---

### 7. Constants + feature flags (`constants/index.ts`)

```typescript
GOAL_CATEGORIES = ['body', 'mind', 'money', 'create', 'connect', 'contribute']

FEATURES = {
  STARLOG_ENABLED:      false,  // Pillar 2
  INTELLIGENCE_ENABLED: false,  // Pillar 3
  DISCOVERY_ENABLED:    false,  // Pillar 4
  SOCIAL_ENABLED:       false,  // Phase 2
  COLLAGE_ENABLED:      false,  // Phase 2
}
```

Wrap unreleased UI in `FEATURES.X_ENABLED` checks rather than deleting or commenting out code.

---

### 8. Styling

NativeWind v4 (Tailwind for React Native). Classes are applied via `className` prop. Custom design tokens are defined in `tailwind.config.js`:

| Token | Value | Use |
|---|---|---|
| `cream` | `#FAF9F6` | App background |
| `near-black` | `#1A1A1A` | Primary text, buttons |
| `earth-green` | `#2D6A4F` | Accent colour, CTA sections |
| `amber` | `#E09F3E` | Pull quotes, highlights |
| `card-bg` | `#F3F1EC` | Card + input surfaces |
| `muted` | `#6B6B6B` | Secondary / placeholder text |

On web, section headings use `Instrument Serif` via inline `fontFamily` style. On native, the system font is used.

---

## Getting started (new team member)

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli` (or use `npx expo`)
- A Supabase project (free tier is fine)

### Setup

```bash
# 1. Clone and install
git clone <repo>
cd oharaai
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your Supabase URL and anon key from the Supabase dashboard
# (Settings → API → Project URL + anon public key)

# 3. Run database migrations
# Paste 001_initial_schema.sql then 002_enable_rls.sql
# into your Supabase project's SQL editor (supabase.com → SQL Editor)

# 4. Start the dev server
npx expo start --web    # browser
npx expo start --ios    # iOS simulator
npx expo start          # Expo Go on device
```

### Environment variables

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → anon public key |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys (used by the Anthropic Messages API client) |

`EXPO_PUBLIC_` prefix is required for Expo to expose variables to the client bundle.

---

## What's NOT built yet

| Feature | Pillar | Notes |
|---|---|---|
| Goal creation chat UI | Pillar 1 | Conversational SMART goal flow — next session |
| Milestone tracking UI | Pillar 1 | Depends on goal creation |
| Starlog (BRT journaling) | Pillar 2 | Schema exists, UI not started |
| AI insights / intelligence | Pillar 3 | Client wiring exists; UI and job integration still pending |
| Discovery / Explore | Pillar 4 | Interest tagging, suggestions |
| Social features | Phase 2 | Not scoped |
| Collage / profile visual | Phase 2 | Not scoped |

Placeholder screens (Dashboard, Goals, Starlog, Explore) each show a title and a "Log out" button. They exist purely to confirm tab navigation and auth redirect work correctly before building real content into them.

---

## Key decisions & rationale

**Why expo-router groups `(auth)` and `(tabs)`?**
Route groups (`(name)`) let us apply different layouts to different parts of the app without the group name appearing in the URL. `/login` not `/(auth)/login`. It also makes the auth guard clean: checking `segments[0] === '(tabs)'` is unambiguous.

**Why AsyncStorage for session persistence?**
Supabase's default browser `localStorage` doesn't exist in React Native. AsyncStorage is the RN equivalent — it persists the JWT across app restarts so users don't have to log in every time.

**Why Zustand instead of Context?**
Less boilerplate, no provider wrapping, and selectors prevent unnecessary re-renders. The store shape mirrors what the UI needs, not the database shape.

**Why feature flags instead of just not building things?**
Makes it safe to merge partial work to main without shipping it. When a pillar is ready, flip the boolean — no code path surgery needed.

**Why `supabase.auth.signOut()` directly in placeholder screens instead of a shared hook?**
These are throwaway screens. A shared auth hook will be introduced when the real dashboard is built in a future session.
