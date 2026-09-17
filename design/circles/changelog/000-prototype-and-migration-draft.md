# Session 000 — Prototype, privacy model, Migration 053 draft

- **Date:** 2026-09-17
- **Task(s):** PLAN Phases 0, 1
- **Agent/model:** Claude Opus 5 (Claude Code desktop)
- **tsc baseline (before):** clean

## Goal of this session

Design and prototype the Circles social layer inside the real app, iterate the
product model with the user, commit the prototype, and draft + locally verify the
database migration for the real buildout.

## Changes

- **Prototype (committed `f083ba5`, branch `feat/circles-home`, pushed)**
  - `features/circles/**` — new feature slice: `CirclesScreen`, `ContextCards`
    (Shared with You), `PostComposer` (Link: Goal/Milestone/Reflection),
    `FeedPostCard` (description-only links, Encourage/Comment/Save),
    `CirclesSheets` (person + view-only goal sheets), `CirclesPane` (public goal
    + invite to a Goal), `GoalInvitesPane` (Requests), `SavedPostsPane`,
    `primitives`, `progress.ts`, `store.ts`, `fixtures.ts`, `types.ts`, `hooks/useCircles.ts`.
  - `app/(app)/dashboard.tsx` — Home now renders Circles; kept greeting,
    Today's Focus (milestone progress), drafts list + toast, Echo reconcile;
    removed Momentum/goals/projects/Echo/Intelligence cards (CD-001, CD-003).
  - `components/layout/AvatarMenu.tsx` — composes Circles/Saved/goal-invite slots;
    mobile rows for Circles, Goal invitations, Saved (CD-011).
  - `features/friends/components/FriendsPopover.tsx` — Circles + Saved tabs, goal
    invitations atop Requests with badge count, dropdown positioning (CD-010).
  - `features/friends/components/AddPeoplePane.tsx` — invite-by-link merged in (CD-008).
  - `features/friends/components/types.ts` — `FriendsTab` gains `circles`, `saved`.
- **Design docs (this folder, uncommitted at time of writing)** — README, PLAN,
  MEMORY, DECISIONS (CD-001…CD-012), OUTSTANDING, this changelog, audit 000,
  resume prompt.
- **`design/circles/db/`** — draft `053_circles_social_layer.sql`, local bootstrap,
  security assertions, runner script.

## Iteration history (user direction → outcome)

1. Initial two-column Circles tab from teammate mockup → built as `/circles`.
2. Drop Friends panel; Save → private Saved; Home becomes Circles keeping greeting
   + Today's Focus → CD-001, CD-007.
3. Today's Focus above Shared with You; My Circles moves to profile menu.
4. Merge Invite into Add people; encouragement public; share audience choice.
5. Progress option 2; private by default; one public Goal (choose → list →
   Confirm); invites via Requests; feed links description-only; fix profile menu
   position → CD-002…CD-006, CD-010.

## Tests

- `npx tsc --noEmit` → pass (before and after every change).
- Browser (fixture routes, signed-out, temporary routes deleted): accept invite →
  Shared with You; public goal Confirm/Change; send + withdraw invite; post with
  reflection link; encourage/comment/save; Saved pane reflects saves; light/dark;
  narrow/two-column layouts. **Profile popover not verifiable signed-out.**
- `design/circles/db/run-circles-security.sh` → **pass** (see `audits/000`); first
  run caught a reflection-link validation bug, fixed in 053.

## Decisions made

- CD-001 through CD-012.

## Follow-ups / handoff

- **Next action:** Phase 1b — L3 sign-off on 053 + answers to Q1–Q4
  (`OUTSTANDING.md`), then Phase 2 promote + apply.
- Resume prompt: `prompts/resume-backend-buildout.md`.
