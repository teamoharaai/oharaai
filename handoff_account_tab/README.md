# Friends surface — desktop implementation handoff

Drop-in files that add the desktop Friends popover shown in
`Account Friends v2.dc.html` (turn 3 · `3a` / `3b` / `3c`) to your repo.

**Design reference:** `Account Friends v2.dc.html` — the anchored 720 × ~600
popover (240 rail / 480 content). Desktop-only; the same trigger on iOS/mobile
should keep opening the existing `AvatarMenu` dropdown until the iOS bottom-
sheet from turn 2 lands.

---

## Copy these into your repo (paths already match)

```
features/friends/types.ts
features/friends/api.ts
features/friends/store.ts

app/api/friends/index+api.ts
app/api/friends/requests+api.ts
app/api/friends/search+api.ts
app/api/friends/request+api.ts
app/api/friends/[id]/accept+api.ts
app/api/friends/[id]/decline+api.ts

components/friends/FriendsPopover.tsx
components/friends/FriendsListPane.tsx
components/friends/RequestsPane.tsx
components/friends/AddPeoplePane.tsx
components/friends/FriendRow.tsx
components/friends/RailButton.tsx
components/friends/StatCell.tsx
```

Then apply the one-file patch in `components/layout/AvatarMenu.diff.md` to
`components/layout/AvatarMenu.tsx`.

---

## What's already there (no work needed)

- Migration `028_friend_connections_invite_links_usernames.sql`. All RPCs used
  by the API routes below are already granted to `authenticated`:
  - `search_profiles_by_username(text)` — 3-char minimum enforced server-side
  - `get_profiles_by_ids(uuid[])`
  - `get_friend_count(uuid)`
- Table `friend_connections` with correct RLS (requester can insert; only
  addressee can update pending → accepted/declined).
- `Avatar`, `Typography`, `Modal`, `Input` UI primitives.
- `authedFetch` + `withAuth`/`AuthContext` API glue.
- `useThemeColors()` — the popover reads every color from `LIGHT_THEME` /
  `DARK_THEME` via this hook, so the design follows theme changes for free.

---

## Tokens the design commits to

Every color, font size, and rounded corner in the components below reads from
`constants/colors.ts` or `tailwind.config.js` — no new hex codes, no new
Tailwind classes. Type comes from `Typography.tsx` variants (`section-header`,
`section-eyebrow`, `card-title`, `meta`, `caption`).

---

## Wiring notes

1. **Trigger.** The existing sidebar avatar `Pressable` in `AvatarMenu.tsx` now
   owns a `ref` measured with `View.measureInWindow` on press — that rect is
   passed to `FriendsPopover` so it anchors bottom-of-avatar. See
   `AvatarMenu.diff.md`.
2. **Desktop gate.** `FriendsPopover` renders nothing when `Platform.OS !==
   'web'` OR when window width is under 900 px — falls back to the existing
   dropdown menu. This is the only place where responsive behavior branches;
   the iOS overlay from turn 2 is a separate component that will replace that
   branch later.
3. **Backend contract.** Route files use `withAuth` and `createAuthedClient`
   like `app/api/profile/index+api.ts` — copy that file's shape if you need to
   extend responses.
4. **Optimistic UI.** `RequestsPane` and `AddPeoplePane` mutate the store
   immediately and roll back on failure. `store.ts` is a small zustand slice;
   drop it in `features/friends/` next to your existing `features/profile/`.
5. **Search debounce.** `AddPeoplePane` debounces 250 ms and never sends
   queries under 3 characters (the RPC would raise anyway; this saves a round
   trip).
6. **New screen flagged.** Row tap navigates to `/profile/[id]` — that route
   doesn't exist yet. Either add a stub screen or wrap the row `Pressable` in
   a no-op until it does.

---

## Test after wiring

- `pnpm expo start --web` → open the app on web → click sidebar avatar →
  popover opens anchored to it, caret pointing left.
- Segment switching (rail buttons) keeps the popover open, updates the pane
  content, keeps focus on the active rail item.
- `Esc` closes; clicking outside closes; the avatar `Pressable` receives focus
  again on close.
- Type `ma` in Add → no request goes out (3-char guard). Type `may` → search
  fires; results render with the correct state pill (Add / Pending / Friends).
- Accept a request → row disappears from Requests, count on the rail decrements,
  the accepted person appears in Friends.
