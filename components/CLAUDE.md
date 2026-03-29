# CLAUDE.md — components/

> Loaded when Claude Code touches files in this directory.

## What this directory is

Shared UI primitives and layout wrappers used across multiple features.

## Rules

1. **Only shared components live here.** If a component is used by one feature only, it belongs in `features/{feature}/components/`.
2. **No business logic.** Components here are pure UI — they accept props, render visuals, call `onPress`/`onChange` callbacks. They never query data, call services, or know about Supabase.
3. **NativeWind for all styling.** No inline `style={{}}` except for dynamic values (theme colors, calculated sizes).
4. **No CSS Grid for component internals.** Use Flexbox. Grid is only acceptable for the dashboard card layout wrapper on web.
5. **Every component must work on web and native.** Use `Platform.OS` checks only when absolutely unavoidable. Prefer responsive/adaptive patterns.
6. **Props over configuration.** Components are customized via props, not internal config objects.
7. **Dark theme defaults.** Background `#0A0A0F`, card `#14141F`, border `#1E1E2E`, text primary `#FAFAFA`, text secondary `#8888A0`.
8. **Consistent border radius.** Cards: 12px. Badges: 8px. Buttons: 20px.