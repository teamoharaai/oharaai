# Echo pipeline and privacy boundary

## Active product path

`/(app)/echo` is a compatibility route. The active Echo experience is the
unified `/(app)/entries` workspace backed by the canonical `public.entries`
table. The older `features/echo/`, `public.echo_entries`, folder tree, AI
reflection endpoints, and reconciliation worker remain for legacy consumers;
new Notes and Reflections must use the canonical Entries path.

The current UI flow is:

1. `EntriesScreen` owns route-backed library state (`view=all|note|reflection`),
   Project context, creation, and list/detail navigation.
2. `EntriesLibrary` reads owner-scoped records from
   `GET /api/entries/library`, optionally filtered by `type`.
3. `EchoCreationModal` creates a Note or Quick Reflection with
   `POST /api/entries/library`. Each open creation flow holds a stable UUID
   `clientRequestId`, making an ambiguous retry idempotent for that owner.
4. Notes open `NoteEditor`; freeform Reflections open
   `QuickReflectionEditor`; historical completed guided Reflections remain
   readable in `CompletedReflection`.
5. Updates use `PATCH /api/entries/library/:id` with `expectedContentVersion`.
   The database saves the Entry and its Goal, category, milestone, and optional
   Project relationships transactionally through `save_entry_v4`.
6. Meaningful linked Reflection changes request a best-effort Momentum refresh.
   Save success does not depend on Momentum recalculation success.

## Note and Reflection semantics

| Concern | Note | Reflection |
| --- | --- | --- |
| Intent | Ideas, research, observations, plans, and developed knowledge | Private, intimate writing about thoughts, feelings, experience, and learning |
| Editor | Structured rich document, checklists, images, Goal/Intelligence references | Calm freeform editor; historical guided records remain readable |
| Canonical type | `entry_type = 'note'` | `entry_type = 'reflection'` |
| BRT | Not allowed | Optional single Bud/Rose/Thorn category |
| Momentum | Only explicit completed progress references can contribute | A qualified Goal-linked Reflection can contribute |
| AI | Intelligence references are non-generative in the current Notes release | Quick Reflection makes no AI request; Guided Reflection is intentionally unavailable |

## What is private and what can be shared

- The full Entry row, document, plain text, conversation turns, takeaway, BRT,
  and relationships are owner-scoped by RLS. Goal and Project links organize an
  Entry inside OHARA; they do not grant another person access.
- Export and copy are explicit device-side actions initiated from an open Entry.
- Circles never grants friends read access to `public.entries`. When an author
  explicitly links a Reflection to a Circles post, the server validates owner
  access and sends only its title into the picker; it never pre-fills a social
  description from the Reflection body or takeaway. The post snapshots the title
  plus any short description the author deliberately writes in the composer.
  The Reflection body, takeaway, BRT, Goal/Project links, and later edits are not
  joined into the feed.
- Notes are not linkable to Circles posts.
- Internal retrieval documents contain Entry text and relationship names for
  owner-scoped product features. They are not a social-sharing contract.

## Native/iOS contract

Native clients should use the same authenticated Expo routes and never write
`public.entries` or relationship tables directly:

- `GET /api/entries/library?type=reflection` lists the signed-in owner's active
  Reflections.
- `POST /api/entries/library` creates one. Send a stable UUID
  `clientRequestId` and reuse it when retrying the same create request.
- `GET /api/entries/library/:id` reads one owner-scoped Entry.
- `PATCH /api/entries/library/:id` autosaves the complete draft. Send the last
  observed positive `expectedContentVersion`; reload after a `409` conflict.
- `DELETE /api/entries/library/:id` permanently deletes one owned Entry.
- `GET /api/entries/context` returns owner-scoped active Goal/milestone options.

The server derives the owner from the verified bearer token. Clients never send
`userId`. A Quick Reflection uses `entryType: "reflection"`,
`reflectionType: "open"`, an empty `conversationTurns` array,
`completedAt: null`, and `relationships` containing arrays plus an optional
`projectId`.
Native clients must retain unsaved text on screen when a save fails; the current
web editor additionally mirrors dirty drafts to browser local storage.
