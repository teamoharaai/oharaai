# Ohara — Agent Context

Stack: Expo (React Native Web), Supabase, Anthropic API, NativeWind,
Zustand, TypeScript strict

Current phase: Phase 1

All AI calls go through lib/ai/client.ts using callAI() — never import
Anthropic SDK outside lib/ai/

Never hardcode API keys — all keys from process.env

RLS enabled on all Supabase tables from day one

types/index.ts is the single source of truth for all TypeScript interfaces

store/ at root level — auth.ts, session.ts, ui.ts

## Current task
Fixing scaffold before building features — all five fixes complete.

## Relevant files
- types/index.ts — all shared TypeScript interfaces
- store/auth.ts — session + profile state (wired to root layout)
- store/session.ts — active Starlog session state
- store/ui.ts — loading states, modals
- app/_layout.tsx — root layout, auth guard, uses useAuthStore
- app/(app)/ — protected tab screens (renamed from (tabs)/)
- supabase/migrations/001_initial_schema.sql — corrected schema
- supabase/migrations/002_enable_rls.sql — RLS policies
