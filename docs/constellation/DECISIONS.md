# Constellation Decisions and Implementation Contract

**Status:** Canonical

**Last updated:** 2026-07-30

**Scope:** Constellation domain, reads, interaction, layout persistence, privacy,
and extension boundaries

This document describes the current implementation. It supersedes older
Constellation handoffs, prototype behavior, and pre-migration assumptions. The
historical concept images remain visual references only; see
[`REFERENCE_CONCEPTS.md`](REFERENCE_CONCEPTS.md).

## 1. Domain boundaries

### Earned/system entities

The only earned node kinds are `season`, `ambition`, `goal`, `reflection`,
`trait`, and `tension`.

- Goals are read directly from `goals`; they are not duplicated into
  `constellation_nodes`.
- Active goals are visible. Complete goals remain visible for the existing
  14-day grace period. Draft, stagnant, discovered, and archived goals are not
  visible.
- A deterministic current Season anchor always exists.
- Earned/system entities cannot be created, renamed, promoted, or deleted
  through the Constellation UI.

### Goal-category hubs

Goal categories are virtual presentation nodes. They:

- use the canonical current-and-legacy category registry in
  `features/constellation/goal-categories.ts`;
- display the category symbol;
- exist only when at least one visible goal belongs to that category;
- connect only to those visible goals through derived
  `goal_category_membership` edges;
- are not earned nodes and are never persisted as graph records.

### User-authored annotations

Notes and Projections are `ConstellationAnnotation` drafts, not earned nodes.
They may anchor to either one owned earned node or one owned direct-read goal.
They never affect extraction, validation, visibility scoring, Trait promotion,
or earned-node counts. Their normal removal operation is archival.

### User-authored goal links

Goal links are private, undirected relationships between two owned goals.
They are stored separately from system-managed `constellation_edges` and:

- always include a trimmed note of 1–280 characters;
- use one canonical endpoint order so each unordered goal pair is unique;
- reject self-links and endpoint changes after creation;
- allow at most six user-authored links incident to any one goal;
- remain stored when one endpoint is temporarily hidden from Constellation,
  but render only when both goals are currently visible;
- cascade when either goal or the owner is deleted.

The owner can create and list links from the Link goals panel, inspect linked
goals from either Goal inspector, and open a link note by selecting its dashed
edge. Only the note is editable; changing the endpoints means removing the
link and creating a new one.

### Entries, containers, and evidence references

“Entry” is the canonical user-facing term. Existing database, API-route, and
internal identifiers may retain `echo` for compatibility.

There are two separate relationships:

1. A confirmed `echo_entry_links` row is the Entry's canonical container.
2. A `constellation_evidence_links` row is an optional owned `(entry, goal,
   note)` reference.

Evidence-reference operations never create, move, confirm, or delete a
canonical Entry container. The unique evidence relation is one current row per
owner/Entry/goal tuple. Its note is optional and limited to 280 characters.

The single-category Bud/Rose/Thorn tag belongs to
`echo_entries.brt_category`. The dormant `brt`, `brt_ai`, and `brt_user` JSONB
columns from migration 007 are a different, deferred structure and are not the
source for Constellation BRT nodes.

### Goal BRT satellites

Bud, Rose, and Thorn are goal-scoped virtual satellites:

- source rows are the deduplicated union of confirmed goal-container Entries
  and explicit evidence references;
- the Entry's `echo_entries.brt_category` supplies the category;
- deduplication is by `(goal_id, entry_id)`;
- a satellite exists only when at least one categorized Entry supports it;
- a goal with five Bud Entries and no Rose/Thorn Entries has one Bud node only;
- its `entryCount` is display metadata and never affects earned counts, scoring,
  validation, or semantic edge weight;
- BRT satellites and their hierarchy edges are derived on read and are never
  persisted as graph nodes.

## 2. Graph read contract

`GET /api/constellation` returns an owner-scoped `ConstellationGraphDTO`
version `1.0`. It includes:

- earned/system nodes and direct-read goals;
- active annotations;
- virtual goal-category hubs;
- non-empty goal-specific BRT satellites;
- persisted system and user-authored goal-link edges plus derived annotation,
  category-membership, and goal-satellite edges;
- earned, annotation, category, BRT, edge, and source counts.

The access threshold was removed. The only render states are:

- `season_only`: the real Season anchor exists but nothing else is renderable;
- `graph`: at least one non-Season graph entity is renderable.

Fetch failures are never translated into an empty state or fixture. Production
data always reports `dataOrigin: "real"`.

The graph-root DTO never contains Entry content or excerpts.

### Selection identity

Selection keys are opaque, stable identifiers:

- `node:<id>` for earned/system nodes and direct-read goals;
- `annotation:<id>` for annotations;
- `goal-category:<category>` for virtual category hubs;
- `brt:<goal-id>:<bud|rose|thorn>` for BRT satellites.

Selection remains local after initial URL compatibility parsing. Unknown,
archived, stale, malformed, or unauthorized keys resolve to no selection.
Private text never appears in selection keys or URLs.

## 3. Goal and BRT inspector reads

The goal inspector derives its connected Entry total and three most recent
Entries from the same deduplicated union of:

- confirmed canonical goal-container links; and
- explicit Constellation evidence references.

The read returns:

- `connectedEntryCount`, the authoritative distinct Entry total;
- at most three `recentEntries`, ordered by Entry `created_at` descending;
- each recent Entry's source provenance (`container`, `evidence`, or `both`);
- a separate complete evidence-reference list for Add/Edit/Unlink operations.

The BRT inspector route is scoped by both goal and category:

`GET /api/constellation/goals/:id/brt/:category`

It returns only owned Entries attached or referenced to that goal and carrying
the selected Entry category. This prevents one goal's BRT moon from exposing
another goal's entries.

All inspector excerpts are normalized and bounded to 240 characters on the
server. Full Entry bodies never enter the inspector DTO.

## 4. Edge semantics and render budgets

Relationship kind and valence remain orthogonal. Current derived hierarchy
kinds are:

- `annotation_anchor`;
- `goal_category_membership`;
- `goal_evidence_cluster`.

Hierarchy edges have `valence: null`, `weight: null`, and `isPersisted: false`.
They count toward the shared 90-edge client render ceiling but do not consume
the six-semantic-relationships-per-node allowance. A dense semantic
neighborhood therefore cannot visually orphan a category hub or goal
satellite.

`user_goal_link` is an owner-authored, persisted, undirected goal-only edge.
It has `valence: null`, `weight: null`, and carries its private note in the
owner DTO. User links are prioritized with semantic edges inside the existing
six-rendered-relationships-per-node and 90-edge client ceilings. The database's
separate six-link-per-goal limit is authoritative for user-authored links.

Arbitrary non-goal topology and drag-to-connect are not supported.

## 5. Layout and interaction

The visual hierarchy uses two coordinate spaces:

- top-level nodes use normalized `canvas` coordinates;
- goal satellites use normalized `parent` offsets.

The satellite-parent resolver currently maps every BRT node to its goal. Future
satellite features must extend that resolver rather than copy movement logic.

Dragging a goal changes only its canvas position. Its BRT satellites resolve
from their unchanged relative offsets and move with it. Dragging a satellite
updates only its relative offset. Every visible web graph node can be dragged.
Background pan, pinch, wheel/trackpad navigation, keyboard viewport controls,
and zoom remain separate interactions. A movement threshold and click
suppression prevent a drag from opening an inspector.

Goals render as balanced planet circles. BRT satellites render as smaller moon
circles with count badges. Category hubs render their category symbol.

The legend is collapsible, remains available at compact web widths, and stores
its preference in the persisted UI store.

The Constellation header contains one modular Add popover for New note, New
projection, and Link goals. Link goals is disabled until at least two goals are
visible. Reset layout, zoom out, Fit, and zoom in sit beside that Add control.
There is no manual Refresh control; normal load, retry, and stale-data behavior
remain service-owned.

## 6. Layout persistence

Migration `034_constellation_layout_positions.sql` adds the fifth
Constellation-owned table:

`constellation_layout_positions(owner_id, selection_key, coordinate_space, x, y, ...)`

Rules:

- `(owner_id, selection_key)` is unique;
- canvas coordinates are bounded to `0.02–0.98`;
- parent offsets are bounded to `-1–1`;
- every CRUD policy requires `owner_id = auth.uid()`;
- writes are accepted only for a selection key currently present in the
  authenticated owner's graph;
- BRT nodes require `parent` coordinates; all current top-level nodes require
  `canvas` coordinates;
- node movement is optimistic and persists on drag end;
- stale or malformed saved rows are ignored by the client;
- Reset layout requires confirmation and deletes only the current owner's
  saved positions.

Layout data is user preference state. It cannot mutate graph relationships,
domain records, counts, visibility, or evidence.

## 7. Ownership, privacy, and deletion

- Owner identity always comes from the bearer token; APIs never accept it from
  request bodies.
- Reads and writes use a token-scoped Supabase client, preserving RLS.
- Non-owned IDs use the same `404 NOT_FOUND` semantics as missing IDs.
- Deleting a goal or Entry cascades its relevant evidence references.
- Deleting a goal cascades every user-authored link incident to that goal.
- Deleting an anchor nulls the annotation anchor without deleting the
  annotation.
- Account deletion cascades all Constellation records, including layout.
- Constellation has no friends/public read path.
- Private labels, annotation bodies, Entry excerpts, and notes must not appear
  in logs, analytics, errors, URLs, or production fixtures.

## 8. Migrations and deployment

The repository currently contains migrations through
`035_constellation_goal_links.sql`.

- 032 creates normalized Constellation nodes, edges, annotations, and evidence
  references.
- 033 moves the single BRT category to `echo_entries.brt_category` and adds
  direct goal anchors for annotations.
- 034 adds owner-scoped layout persistence.
- 035 adds private undirected, note-bearing, owner-authored goal links with
  same-owner endpoints, CRUD RLS, uniqueness, and a six-link-per-goal limit.

An environment running this source must apply all four migrations. The
disposable PostgreSQL security harness applies 032, 034, and 035 and verifies
constraints plus cross-user RLS. Migration 033 was previously live-verified and
is required by all current BRT reads/writes. Migration 035 exists locally but
has not been applied to the linked Supabase project.

## 9. Fixtures and historical references

Production code cannot import Constellation fixtures, preview modules, or the
immutable concept-image tree. Empty and failure states never substitute sample
data. Deterministic fixtures exist only for tests and the isolated preview.

## 10. Deferred decisions

The following remain out of scope:

- force-directed or collision-resolving automatic layout;
- arbitrary non-goal edge authoring or drag-to-connect;
- shared/public Constellations;
- Timeline and Season Archive product surfaces;
- annotation restoration/permanent-delete UI;
- AI-suggested BRT classification and correction signals;
- a generalized future-satellite plug-in API beyond the current typed parent
  resolver.
