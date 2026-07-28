# API Contract — Ohara

> Strict contract between frontend and backend. Frozen per sprint.
> Do not change endpoint shapes without updating this document first AND notifying the team.
> Frontend services (`features/*/services/`) call these endpoints.
> Backend (Supabase Edge Functions) implements them.

## Conventions

**Base URL:** `/api/v1/` (all endpoints prefixed)
**Auth:** All endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header. The backend extracts `user_id` from the JWT — clients never send `user_id` in the body.
**Content-Type:** `application/json` for all requests and responses.
**Error shape:** Every error returns this structure:

```typescript
{
  error: {
    code: string,        // machine-readable: "NOT_FOUND", "VALIDATION_ERROR", "AI_UNAVAILABLE"
    message: string,     // human-readable: "Goal not found"
    details?: unknown    // optional: field-level errors, debug info (never in production)
  }
}
```

**Status codes:**
- `200` — success (GET, PATCH)
- `201` — created (POST)
- `204` — deleted (DELETE)
- `400` — validation error (bad input)
- `401` — unauthorized (missing or invalid JWT)
- `403` — forbidden (RLS violation — user doesn't own the resource)
- `404` — not found
- `422` — unprocessable (valid input but can't fulfill — e.g., AI pipeline failed after retry)
- `429` — rate limited
- `500` — server error

**Pagination** (for list endpoints):
```typescript
// Request (query params)
?cursor=<last_id>&limit=<number>  // default limit: 20, max: 50

// Response wrapper
{
  data: T[],
  pagination: {
    nextCursor: string | null,
    hasMore: boolean
  }
}
```

---

## Agent session endpoints (Expo API routes)

These authenticated routes are intentionally outside the legacy `/api/v1`
prefix. Idempotency keys are scoped to one authenticated user's session.

### `POST /api/sessions/start`

Creates an `echo_sessions` ledger row and goal while idempotently reusing the
project identified by `periodKey`. A known `projectId` may be supplied to adopt
and backfill an existing weekly project.

```typescript
{
  externalSessionId: string,
  projectId?: string | null,
  projectTitle: string,
  projectDescription?: string | null,
  periodKey: string,
  startDate: string,              // YYYY-MM-DD
  endDate: string,                // YYYY-MM-DD
  goalTitle: string,
  goalDescription?: string | null,
  goalCategory?: "body" | "mind" | "money" | "create" | "connect" | "contribute"
}
```

Returns `{ sessionId, projectId, goalId, created }`. Replaying the same
`externalSessionId` returns the original records and does not create duplicates.

### `POST /api/sessions/:id/events`

Records an immutable session event using `{ idempotencyKey, type, payload }`.
Supported types are `change`, `database_record`, `verification`, `failure`, and
`note`. Replaying an event key returns the original event.

### `POST /api/sessions/:id/finish`

Stores a reviewable summary draft and changes the session from `active` to
`draft`. The summary must contain `changedFiles`, `databaseRecords`,
`verificationResults`, `unresolvedFailures`, and `reflection`. Returns
`requiresApproval: true`; this operation never creates an Echo entry.

### `POST /api/sessions/:id/publish`

Publishes the reviewed draft as durable Echo memory. The request requires
`{ idempotencyKey, title, approved: true }`; both the API and database RPC reject
publication without that explicit approval. Entry creation, its confirmed goal
link, and the session's `final_entry_id`/`published` transition commit in one
database transaction.

### `POST /api/entries`

Creates an Echo entry through the server-only atomic entry/container RPC. The
request accepts `{ content, title, goalId, aiInsightRequested, brt, emotion }`.
When `goalId` is null the confirmed container is the user's General folder. A
container failure rolls back the entry instead of leaving an orphan. Embedding
generation runs server-side after the atomic persistence boundary and remains
non-blocking.

---

## Phase 1 Endpoints

---

### Goals

#### `GET /api/v1/goals`
List the authenticated user's goals.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | — | Filter: "active", "complete", "stagnant", "discovered", "archived". Omit to return every non-archived goal. |
| category | string | — | Filter by category |
| cursor | string | — | Pagination cursor (goal ID) |
| limit | number | 20 | Results per page (max 50) |

**Response `200`:**
```typescript
{
  data: {
    id: string,
    title: string,
    description: string | null,
    category: string,
    colorTheme: string,
    deadline: string | null,       // ISO 8601
    visibility: "private" | "circle" | "public",
    progress: number,              // 0-100
    status: "active" | "complete" | "stagnant" | "discovered" | "archived",
    aiGenerated: boolean,
    smartData: {                   // SMART breakdown; all keys always present
      specific: string,
      measurable: string,
      achievable: string,
      relevant: string,
      timeBound: string
    } | null,
    milestoneCount: number,        // one-time goal-critical events
    trackerCount: number,          // recurring or quantitative measures
    createdAt: string,
    updatedAt: string
  }[],
  pagination: { nextCursor: string | null, hasMore: boolean }
}
```

---

#### `GET /api/v1/goals/:id`
Get a single goal with its milestones, trackers, and recent activity.

**Response `200`:**
```typescript
{
  data: {
    id: string,
    title: string,
    description: string | null,
    category: string,
    colorTheme: string,
    deadline: string | null,
    visibility: "private" | "circle" | "public",
    progress: number,
    status: "active" | "complete" | "stagnant" | "discovered" | "archived",
    aiGenerated: boolean,
    smartData: {                   // SMART breakdown; all keys always present
      specific: string,
      measurable: string,
      achievable: string,
      relevant: string,
      timeBound: string
    },                             // required on hydrated goal; null only if goal predates SMART migration
    createdAt: string,
    updatedAt: string,
    milestones: {
      id: string,
      title: string,
      description: string | null,
      dueDate: string | null,
      completedAt: string | null,  // non-null is the sole completion source of truth
      isAiSuggested: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string
    }[],
    trackers: {
      id: string,
      title: string,
      type: "counter" | "habit" | "checklist",
      targetValue: number | null,
      targetUnit: string | null,
      frequency: "daily" | "weekly" | "monthly",
      currentValue: number,
      isAiSuggested: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string
    }[],
    recentEntries: {               // last 10 echo entries for this goal
      id: string,
      content: string,
      mediaUrl: string | null,
      aiInsightRequested: boolean,
      classification: "GROWTH" | "REALITY" | "OBSTACLE" | null,
      aiResponse: string | null,
      createdAt: string
    }[]
  }
}
```

---

#### `POST /api/v1/goals`
Create a new goal with one-time milestones and recurring or quantitative trackers.

**Request body:**
```typescript
{
  title: string,                   // required, max 100 chars
  description?: string,            // max 500 chars
  category: string,                // must match GOAL_CATEGORIES
  deadline?: string,               // ISO 8601, must be future
  milestones?: {                  // one-time critical events
    title: string,
    description?: string,
    dueDate?: string
  }[],
  trackers?: {                    // recurring or quantitative measures
    title: string,                 // max 80 chars
    type: "counter" | "habit" | "checklist",
    targetValue?: number,
    targetUnit?: string,
    frequency: "daily" | "weekly" | "monthly"
  }[]
}
```

**Response `201`:**
```typescript
{
  data: {
    id: string,
    title: string,
    colorTheme: string,            // auto-assigned from category
    // ... full goal object + milestones + trackers
  }
}
```

**Notes:**
- `colorTheme` is auto-assigned by the server from `CATEGORY_THEME_MAP`. Clients never send it.
- The stored `progress` field starts at 0 for compatibility. Visible goal
  progress is calculated from elapsed time between creation and deadline;
  tracker logging does not modify it.
- `visibility` defaults to `"private"`. Updated via PATCH with an explicit literal.

---

#### `POST /api/goals/create` — AI goal creation (conversational)
Drive the multi-turn goal creation conversation and finalize a SMART goal. This endpoint is served by the Expo API route (`app/api/goals/create+api.ts`), not the `/api/v1/` prefix.

**Request body:**
```typescript
{
  userMessage?: string,          // omit when finalize: true with no new text
  conversationHistory: {
    role: "user" | "assistant",
    content: string
  }[],
  finalize?: boolean             // true = skip drafting, finalize immediately
}
```

**Response `200` — drafting turn (isComplete: false):**
```typescript
{
  requestId: string,
  message: string,               // assistant reply to display in chat
  isComplete: false
}
```

**Response `200` — finalized (isComplete: true):**
```typescript
{
  requestId: string,
  message: string,
  isComplete: true,
  finalizedBy: "assistant" | "user",
  goalData: {                    // GoalFinalizeResponse — save this to DB
    goal: {
      title: string,
      description: string,
      category: "body" | "mind" | "money" | "create" | "connect" | "contribute",
      deadline: string | null,   // ISO 8601 or null
      smart: {
        specific: string,
        measurable: string,
        achievable: string,
        relevant: string,
        timeBound: string
      }
    },
    milestones: {
      title: string,
      description: string | null,
      dueDate: string | null
    }[],
    trackers: {
      title: string,
      type: "counter" | "habit" | "checklist",
      targetValue: number | null,
      targetUnit: string | null,
      frequency: "daily" | "weekly" | "monthly"
    }[],
    reasoning: string,
    assumptions: string[]        // always present; empty array if none
  }
}
```

**Notes:**
- `userId` is never accepted in the request body — always resolved from the session JWT server-side.
- `assumptions` is always `string[]`. The array is empty (`[]`) when no assumptions were made, never `null` or `undefined`.
- The client is responsible for calling `lib/db/goals.createGoalWithMilestonesAndTrackers` after receiving `isComplete: true`.
- `requestId` is a UUID generated per request — include it in all error reports.

---

#### `PATCH /api/v1/goals/:id`
Update a goal's editable fields.

**Request body (all fields optional):**
```typescript
{
  title?: string,
  description?: string,
  category?: string,
  deadline?: string,
  visibility?: "private" | "circle" | "public",
  status?: "active" | "complete" | "stagnant" | "discovered" | "archived"
}
```

**Response `200`:** Updated goal object.

**Notes:**
- Changing `category` re-assigns `colorTheme` automatically.
- The goal-detail completion action sets `status: "complete"` and `progress: 100` in one update. There is no reopen action.
- The goal-detail archive action sets `status: "archived"`. Archived goals are omitted from normal goal and project lists and are fetched explicitly with `status=archived` for Settings.

---

#### `DELETE /api/v1/goals/:id`
Delete a goal and cascade-delete its milestones, trackers, and tracker logs. Echo entries linked to this goal get `goal_id` set to null (not deleted).

**Response `204`:** No body.

---

### Milestones

Milestones are one-time events that are critical to a goal. Completion is
one-way: a non-null `completedAt` cannot be cleared through the goal-detail
service.

#### `POST /api/v1/goals/:goalId/milestones`
Add a milestone to an existing goal.

**Request body:**
```typescript
{
  title: string,
  description?: string | null,
  dueDate?: string | null,
  sortOrder?: number
}
```

**Response `201`:** Created milestone with `completedAt: null` and `isAiSuggested: false`.

---

#### `PATCH /api/v1/goals/:goalId/milestones/:id`
Update milestone details. `completedAt` is not accepted by this general update.

---

#### `POST /api/v1/goals/:goalId/milestones/:id/complete`
Complete a pending milestone once. A successful completion generates a
`milestone_completed` activity item containing `milestoneId`.

---

#### `DELETE /api/v1/goals/:goalId/milestones/:id`
Delete a milestone.

---

### Trackers

#### `POST /api/v1/goals/:goalId/trackers`
Add a tracker to an existing goal.

**Request body:**
```typescript
{
  title: string,
  type: "counter" | "habit" | "checklist",
  targetValue?: number,
  targetUnit?: string,
  frequency: "daily" | "weekly" | "monthly"
}
```

**Response `201`:** Created tracker object with `isAiSuggested: false`.

---

#### `PATCH /api/v1/goals/:goalId/trackers/:id`
Update a tracker.

**Request body (all fields optional):**
```typescript
{
  title?: string,
  targetValue?: number,
  targetUnit?: string,
  frequency?: "daily" | "weekly" | "monthly",
  sortOrder?: number
}
```

**Response `200`:** Updated tracker object.

---

#### `DELETE /api/v1/goals/:goalId/trackers/:id`
Delete a tracker and its logs.

**Response `204`:** No body.

---

#### `POST /api/v1/goals/:goalId/trackers/:id/log`
Log progress on a tracker (increment counter, complete habit, check item).

**Request body:**
```typescript
{
  value?: number,              // default 1. For counters: increment amount. For habits: 1 = done.
  note?: string                // optional note attached to this log, max 280 chars
}
```

**Response `201`:**
```typescript
{
  data: {
    logId: string,
    trackerId: string,
    value: number,
    note: string | null,
    loggedAt: string,
    updatedTracker: {
      currentValue: number     // recalculated after this log
    }
  }
}
```

**Notes:**
- Tracker logs generate `tracker_logged` activity containing `trackerId`; they never generate `milestone_completed` activity.
- Server recalculates `tracker.currentValue` after each log. Goal completion remains an explicit user action.
- For `habit` type: logging resets are based on `frequency`. A daily habit resets at midnight user-local time. Server tracks this.
- For `checklist` type, the one-tap completion action records completion and sets `currentValue` to 1; it does not reopen a completed item.

#### `POST /api/goals/complete-tracker`
Authenticated Expo route used by goal detail for the current one-tap tracker
completion behavior. Accepts `{ trackerId, goalId }` and returns
`{ success: true }`. Goals with successors return `409` and remain read-only.

#### `GET /api/trackers/due-today`
Returns daily trackers grouped as `{ goalId, goalTitle, trackers }`. Each tracker
contains `id`, `title`, `type`, `targetValue`, `targetUnit`, `currentValue`, and
`lastCompletedAt`. Only active goals owned by the authenticated user are included.

When extending an expired goal, trackers are copied with `currentValue: 0`.
Only pending milestones are carried forward; completed one-time events stay on
the prior phase and are never duplicated as pending events.

---

### Echo (Journal)

#### `GET /api/v1/echo`
List the authenticated user's journal entries.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| goalId | string | — | Filter by goal (null for general entries, omit for all) |
| hasInsight | boolean | — | Filter: only entries with AI insight |
| cursor | string | — | Pagination cursor |
| limit | number | 20 | Results per page |

**Response `200`:**
```typescript
{
  data: {
    id: string,
    goalId: string | null,
    content: string,
    mediaUrl: string | null,
    aiInsightRequested: boolean,
    classification: "GROWTH" | "REALITY" | "OBSTACLE" | null,
    confidence: number | null,
    themes: string[] | null,
    aiResponse: string | null,
    processedAt: string | null,
    createdAt: string
  }[],
  pagination: { nextCursor: string | null, hasMore: boolean }
}
```

---

#### `POST /api/v1/echo`
Create a new journal entry.

**Request body:**
```typescript
{
  content: string,             // required, max 5000 chars
  goalId?: string,             // optional — links entry to a goal
  mediaUrl?: string            // optional — URL to uploaded media (see Media section)
}
```

**Response `201`:** Created entry object with all AI fields null.

**Notes:**
- This NEVER triggers AI automatically. Entry is saved as a private journal entry.
- AI insight is requested separately via the insight endpoint.
- If user has `autoInsight` preference enabled, the CLIENT calls the insight endpoint after creation — the server does not auto-trigger.

---

#### `POST /api/v1/echo/:id/insight`
Request AI insight on a journal entry. Async — returns immediately, client polls for result.

**Request body:** None.

**Response `202`:**
```typescript
{
  data: {
    entryId: string,
    status: "queued",
    estimatedSeconds: number    // rough estimate: 5-15
  }
}
```

**Notes:**
- Enqueues the entry for AI processing via `lib/ai/queue.ts`.
- Client polls `GET /api/v1/echo/:id` until `processedAt` is not null, or subscribes via Supabase Realtime on the `echo_entries` table.
- If AI pipeline fails after retry, `processedAt` is set but `aiResponse` remains null and an error is logged. Client shows "Insight unavailable."
- Calling this on an already-processed entry returns `200` with existing insight (no reprocessing).

---

#### `GET /api/v1/echo/:id`
Get a single journal entry with full detail.

**Response `200`:** Single entry object (same shape as list item).

---

#### `DELETE /api/v1/echo/:id`
Delete a journal entry.

**Response `204`:** No body.

---

### User Preferences

#### `GET /api/v1/preferences`
Get the authenticated user's preferences.

**Response `200`:**
```typescript
{
  data: {
    autoInsight: boolean,       // auto-request AI insight on new entries
    displayName: string | null,
    avatarUrl: string | null
  }
}
```

---

#### `PATCH /api/v1/preferences`
Update preferences.

**Request body (all optional):**
```typescript
{
  autoInsight?: boolean,
  displayName?: string,
  avatarUrl?: string
}
```

**Response `200`:** Updated preferences object.

---

### AI Usage (Admin/Debug)

#### `GET /api/v1/ai/usage`
Get the authenticated user's AI usage stats.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| days | number | 30 | Lookback period |
| groupBy | string | "day" | "day" or "pipeline" |

**Response `200`:**
```typescript
{
  data: {
    totalCalls: number,
    totalInputTokens: number,
    totalOutputTokens: number,
    estimatedCostUsd: number,
    breakdown: {
      key: string,              // date string or pipeline name
      calls: number,
      inputTokens: number,
      outputTokens: number,
      avgLatencyMs: number,
      errorCount: number
    }[]
  }
}
```

---

## Constellation endpoints (Expo API routes)

These owner-only routes are intentionally outside the legacy `/api/v1`
prefix. They require a Supabase bearer token, derive the owner ID only from
that token, and execute through a token-scoped Supabase client so RLS remains
authoritative.

`GET /api/constellation` returns the raw versioned
`ConstellationGraphDTO` defined in `docs/constellation/DECISIONS.md`. It
contains real owner data only: active earned nodes, active annotations,
persisted system edges, derived annotation/cluster edges, virtual goal-level
Bud/Rose/Thorn summaries, and graph/source counts. It never contains raw Echo
content or excerpts. Archived annotations are counted but omitted from the
default annotation list.

The current server access policy requires at least three lifetime non-draft
goals and ten Echo entries. `accessEligible` reports that policy result;
`hasGraphData` independently reports whether a renderable entity exists.

Constellation write successes use:

```typescript
{ ok: true, data: T, error: null }
```

Write and read failures use:

```typescript
{
  ok: false,
  data: null,
  error: {
    code:
      | "UNAUTHORIZED"
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "CONFLICT"
      | "INTERNAL_ERROR",
    message: string
  }
}
```

Non-owned IDs resolve to `404 NOT_FOUND` without revealing whether another
user owns the record. Expected input, missing-record, and lifecycle conflicts
return stable `400`, `404`, and `409` envelopes; raw Supabase/PostgreSQL prose
is never returned.

### `POST /api/constellation/annotations`

Creates a user-authored draft note or projection. Returns the
`ConstellationAnnotationDTO` with status `201`.

```typescript
{
  kind: "note" | "projection",
  label: string,                    // trimmed, 1–120 characters
  body?: string | null,             // trimmed, max 5,000 characters
  anchorEarnedNodeId?: string | null
}
```

The optional anchor must be an active earned node owned by the authenticated
user. The authoring UI offers only earned nodes visible in the current
render-safe graph.

### `PATCH /api/constellation/annotations/:id`

Edits one or more of `kind`, `label`, `body`, or `anchorEarnedNodeId` on an
owned draft annotation. Archived annotations return `409 CONFLICT`.

### `POST /api/constellation/annotations/:id/archive`

Archives an owned draft annotation. Repeating the request for an already
archived annotation is idempotent and returns the archived DTO.

### `POST /api/constellation/evidence-references`

Creates or idempotently updates one Echo/goal evidence relation:

```typescript
{
  echoEntryId: string,
  goalId: string,
  brtCategory: "bud" | "rose" | "thorn",
  note?: string | null               // trimmed, max 280 characters
}
```

Returns the `ConstellationEvidenceLink` with `201` when inserted and `200`
when the existing Echo/goal pair is unchanged or its category/note is updated.
When updating an existing pair, an omitted `note` preserves the stored note;
an explicit `null` clears it.
The Echo and goal must both belong to the authenticated user. This route never
changes the Echo's canonical container, `echo_entries.goal_id`,
`echo_entries.brt_user`, or any `echo_entry_links` row.

### `GET /api/constellation/goals/:id/evidence`

Returns the complete current evidence-reference list for one owned goal:

```typescript
{
  goal: {
    id: string,
    title: string,
    description: string | null,
    status: "active" | "draft" | "complete" | "stagnant" | "discovered" | "archived",
    deadline: string | null,
    project: { id: string, title: string } | null,
    vaultId: string | null
  },
  items: {
    id: string,
    ownerId: string,
    echoEntryId: string,
    goalId: string,
    brtCategory: "bud" | "rose" | "thorn",
    note: string | null,
    createdAt: string,
    updatedAt: string,
    echo: {
      id: string,
      title: string | null,
      excerpt: string,                // normalized, at most 240 characters
      excerptTruncated: boolean,
      createdAt: string
    }
  }[]
}
```

This read is owner-scoped for both the goal and every returned Echo. It returns
only the bounded display excerpt needed by the evidence inspector, not full
Echo content.

### `GET /api/constellation/reflections/:id`

Returns live validation and private evidence details for one active owned
Reflection node. The route first resolves the node under the authenticated
owner, then reads its candidate from the owner's character profile and returns
only contributing Echoes that also resolve under that owner.

```typescript
{
  nodeId: string,
  label: string,
  description: string | null,
  candidateKey: string,
  candidateType: "theme" | "trait" | "tension" | "insight",
  occurrences: number,
  aggregatedScore: number | null,
  firstSeenAt: string | null,
  lastSeenAt: string | null,
  dominantValence: "positive" | "negative" | "neutral" | "mixed" | null,
  valenceHistory: {
    valence: "positive" | "negative" | "neutral" | "mixed",
    echoEntryId: string,
    timestamp: string
  }[],
  evidence: {
    id: string,
    title: string | null,
    excerpt: string,                  // normalized, at most 240 characters
    excerptTruncated: boolean,
    createdAt: string,
    valence: "positive" | "negative" | "neutral" | "mixed" | null
  }[]
}
```

Missing, archived, malformed, and non-owned node IDs share the same `404`
semantics. Full Echo bodies, unavailable Echo IDs, and any local BRT override
are never returned.

### `GET /api/constellation/goals/:id/echo-options?query=...`

Returns selectable owned Echo entries for one owned goal. An empty query
returns recent entries; a non-empty query searches owned Echo titles and
content. The normalized query is limited to 120 characters and the result set
is bounded.

```typescript
{
  goalId: string,
  query: string,
  options: {
    id: string,
    title: string | null,
    excerpt: string,                  // normalized, at most 240 characters
    excerptTruncated: boolean,
    createdAt: string,
    existingReference: {
      id: string,
      brtCategory: "bud" | "rose" | "thorn"
    } | null
  }[]
}
```

`existingReference` describes only the Echo/selected-goal pair, so the same
Echo may remain selectable for another owned goal with a different category.
These reads do not infer or mutate canonical Echo containment.

### `PATCH /api/constellation/evidence-references/:id`

Updates one or both mutable fields, `brtCategory` and `note`, on an owned
evidence reference. The owner, Echo, and goal endpoints are not accepted in
the request body and remain immutable.

### `DELETE /api/constellation/evidence-references/:id`

Deletes only the owned evidence-reference row and returns:

```typescript
{ ok: true, data: { id: string }, error: null }
```

The referenced Echo entry and goal are never deleted or moved.

---

## Phase 2 Extension Points (DO NOT BUILD YET)

These are documented so the Phase 1 schema and endpoints don't block Phase 2 work.

```
POST   /api/v1/goals/:id/share         — share a goal publicly or with friends
GET    /api/v1/feed                     — public/friends feed of shared goals
POST   /api/v1/feed/:goalId/comment     — comment on a shared goal
GET    /api/v1/feed/:goalId/comments    — list comments on a shared goal
POST   /api/v1/friends/request          — send friend request
PATCH  /api/v1/friends/:id              — accept/reject friend request
GET    /api/v1/friends                  — list friends
GET    /api/v1/forums                   — list forum topics
POST   /api/v1/forums                   — create forum topic
GET    /api/v1/forums/:id/posts         — list posts in a forum topic
POST   /api/v1/forums/:id/posts         — create a post
```

Phase 2 endpoints will follow the same conventions (auth, error shape, pagination) defined above.

---

## Phase 3 Extension Points (DO NOT BUILD YET)

```
POST   /api/v1/admin/instance           — create a university/community instance
GET    /api/v1/instance/:id/analytics    — cohort analytics dashboard
GET    /api/v1/instance/:id/members      — member management
PATCH  /api/v1/instance/:id/settings     — instance-level settings
```

---

## Rules for Changing This Contract

1. **Propose the change in a PR description** before implementing.
2. **Update this document** with the new endpoint/field.
3. **Bump the version comment** at the top if breaking.
4. **Notify the frontend owner** (CEO) and **backend owner** (CTO) before merging.
5. **Never remove a field from a response** without deprecation — add a new field alongside the old one, mark old as deprecated, remove in next phase.
6. **Never change a field's type** (e.g., `string` → `number`) — that's a breaking change requiring a new endpoint version.

> Contract version: 2.0 — Phase 1 canonical milestone/tracker cutover
> Last updated: 2026-07-28
