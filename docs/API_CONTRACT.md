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

## Phase 1 Endpoints

---

### Goals

#### `GET /api/v1/goals`
List the authenticated user's goals.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | "active" | Filter: "active", "complete", "stagnant", "discovered", "all" |
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
    isPublic: boolean,
    progress: number,              // 0-100
    status: "active" | "complete" | "stagnant" | "discovered",
    aiGenerated: boolean,
    smartData: {                   // SMART breakdown; all keys always present
      specific: string,
      measurable: string,
      achievable: string,
      relevant: string,
      timeBound: string
    } | null,
    measurableCount: number,       // count, not full objects
    createdAt: string,
    updatedAt: string
  }[],
  pagination: { nextCursor: string | null, hasMore: boolean }
}
```

---

#### `GET /api/v1/goals/:id`
Get a single goal with its measurables and recent activity.

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
    isPublic: boolean,
    progress: number,
    status: "active" | "complete" | "stagnant" | "discovered",
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
    measurables: {
      id: string,
      title: string,
      type: "counter" | "habit" | "checklist",
      targetValue: number | null,
      targetUnit: string | null,
      frequency: "daily" | "weekly" | "monthly" | "once",
      currentValue: number,
      isAiSuggested: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string
    }[],
    recentEntries: {               // last 10 starlog entries for this goal
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
Create a new goal with measurables.

**Request body:**
```typescript
{
  title: string,                   // required, max 100 chars
  description?: string,            // max 500 chars
  category: string,                // must match GOAL_CATEGORIES
  deadline?: string,               // ISO 8601, must be future
  measurables?: {                  // 0-10 items
    title: string,                 // max 80 chars
    type: "counter" | "habit" | "checklist",
    targetValue?: number,
    targetUnit?: string,
    frequency: "daily" | "weekly" | "monthly" | "once"
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
    // ... full goal object + measurables
  }
}
```

**Notes:**
- `colorTheme` is auto-assigned by the server from `CATEGORY_THEME_MAP`. Clients never send it.
- `progress` starts at 0, calculated server-side from measurables.
- `isPublic` defaults to false. Updated via PATCH.

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
    measurables: {
      title: string,
      type: "counter" | "habit" | "checklist",
      targetValue: number | null,
      targetUnit: string | null,
      frequency: "daily" | "weekly" | "monthly" | "once"
    }[],
    reasoning: string,
    assumptions: string[]        // always present; empty array if none
  }
}
```

**Notes:**
- `userId` is never accepted in the request body — always resolved from the session JWT server-side.
- `assumptions` is always `string[]`. The array is empty (`[]`) when no assumptions were made, never `null` or `undefined`.
- The client is responsible for calling `lib/db/goals.createGoalWithMeasurables` after receiving `isComplete: true`.
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
  isPublic?: boolean,
  status?: "active" | "complete" | "stagnant" | "discovered"
}
```

**Response `200`:** Updated goal object.

**Notes:**
- Changing `category` re-assigns `colorTheme` automatically.
- Setting `status: "complete"` triggers a completion timestamp (server-side).

---

#### `DELETE /api/v1/goals/:id`
Delete a goal and cascade-delete its measurables and measurable logs. Starlog entries linked to this goal get `goal_id` set to null (not deleted).

**Response `204`:** No body.

---

### Measurables

#### `POST /api/v1/goals/:goalId/measurables`
Add a measurable to an existing goal.

**Request body:**
```typescript
{
  title: string,
  type: "counter" | "habit" | "checklist",
  targetValue?: number,
  targetUnit?: string,
  frequency: "daily" | "weekly" | "monthly" | "once"
}
```

**Response `201`:** Created measurable object with `isAiSuggested: false`.

---

#### `PATCH /api/v1/goals/:goalId/measurables/:id`
Update a measurable.

**Request body (all fields optional):**
```typescript
{
  title?: string,
  targetValue?: number,
  targetUnit?: string,
  frequency?: "daily" | "weekly" | "monthly" | "once",
  sortOrder?: number
}
```

**Response `200`:** Updated measurable object.

---

#### `DELETE /api/v1/goals/:goalId/measurables/:id`
Delete a measurable and its logs.

**Response `204`:** No body.

---

#### `POST /api/v1/goals/:goalId/measurables/:id/log`
Log progress on a measurable (increment counter, complete habit, check item).

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
    measurableId: string,
    value: number,
    note: string | null,
    loggedAt: string,
    updatedMeasurable: {
      currentValue: number,    // recalculated after this log
      goalProgress: number     // recalculated goal-level progress
    }
  }
}
```

**Notes:**
- Server recalculates `measurable.currentValue` and `goal.progress` after each log.
- For `habit` type: logging resets are based on `frequency`. A daily habit resets at midnight user-local time. Server tracks this.
- For `checklist` type: `value` is ignored, treated as a toggle. Logging a completed checklist item uncompletes it.

---

### Starlog (Journal)

#### `GET /api/v1/starlog`
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

#### `POST /api/v1/starlog`
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

#### `POST /api/v1/starlog/:id/insight`
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
- Client polls `GET /api/v1/starlog/:id` until `processedAt` is not null, or subscribes via Supabase Realtime on the `starlog_entries` table.
- If AI pipeline fails after retry, `processedAt` is set but `aiResponse` remains null and an error is logged. Client shows "Insight unavailable."
- Calling this on an already-processed entry returns `200` with existing insight (no reprocessing).

---

#### `GET /api/v1/starlog/:id`
Get a single journal entry with full detail.

**Response `200`:** Single entry object (same shape as list item).

---

#### `DELETE /api/v1/starlog/:id`
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

> Contract version: 1.1 — Phase 1
> Last updated: 2026-03-30