# Changelog

Session-by-session log of all changes made to Ohara.

---

## Session 4 — 2026-03-29

### Fix email verification redirect + wire AI client

**Bug fixed:** After clicking the Supabase confirmation email, users landed on the landing page instead of the dashboard even though their session was active. Root cause: `emailRedirectTo` was missing from `signUp()`, so Supabase redirected to the site root.

**Files modified:**
- `app/(auth)/signup.tsx` — added `emailRedirectTo: 'https://oharaai.vercel.app/auth/callback'` to `signUp()` options
- `app/auth/callback.tsx` — **created** — handles PKCE code exchange (`exchangeCodeForSession`) and implicit hash flow, then redirects to dashboard on success or login on failure. Shows "Verifying your account..." spinner while running.
- `app/_layout.tsx` — registered `auth` route in root Stack; added `onLandingPage` guard so authenticated users hitting the root index are redirected to the dashboard instead of staying on the landing page.

**AI client wired:**
- `lib/ai/client.ts` — replaced placeholder stub with a working `callLLM()` implementation that calls the Anthropic Messages API via `fetch`. Reads pipeline config and feature flags from `lib/ai/config.ts`.

**Supabase dashboard action required (manual):**
- Site URL: `https://oharaai.vercel.app`
- Redirect URLs whitelist must include: `https://oharaai.vercel.app/auth/callback`

---

## Session 3 — 2026-03-29

### Vercel deployment + RLS signup fix + landing page redesign

- Deployed to Vercel (`https://oharaai.vercel.app`)
- Fixed signup flow: profile row was not being created under RLS — added service-role insert in the signup handler
- Redesigned landing page for premium demo aesthetic (Hims.com-inspired, typography-first)
- Updated `CLAUDE.md` with full project spec, AI architecture, and build conventions

---

## Session 2 — 2026-03-25

### Landing page + auth guard

- Built public-facing landing page (`app/index.tsx`) — five sections: nav, hero, value props, how it works, social proof, footer CTA
- Wired auth guard in `app/_layout.tsx`: session bootstrap on mount, `onAuthStateChange` subscription, routing rules for `(auth)` ↔ `(app)` groups
- Added web HTML shell (`app/+html.tsx`) — Instrument Serif font injection, meta tags, base CSS

---

## Session 1 — 2026-03-25

### Project scaffold + auth foundation

- Initialized Expo + Expo Router project with TypeScript strict mode
- Installed and configured Supabase client, Zustand, AsyncStorage
- Built login and signup screens (`app/(auth)/`)
- Created database schema and RLS migrations (`supabase/migrations/`)
- Set up NativeWind + Tailwind config with custom design tokens
- Defined all domain types and feature flag constants
- Placeholder tab screens for Dashboard, Goals, Starlog, Explore

---

> For environment setup, architecture decisions, and getting-started instructions see `SETUP.md`.
