# Audit: Goal Write-Path Inventory (pre-generalization, pre-removal)

Read-only inventory. No code, migrations, or other files were modified.

---

## 1–3. `createGoalWithMeasurables` (`lib/db/goals.ts:107`)

### 1. Exact current input signature

```ts
export async function createGoalWithMeasurables(
  userId: string,
  aiData: GoalFinalizeResponse,
  options?: { requestId?: string; projectId?: string | null },
  db: SupabaseClient = supabase,
): Promise<CreateGoalWithMeasurablesResult>
```

- `userId: string` — caller-supplied (route resolves it from session before calling; the function itself does not re-derive it).
- `aiData: GoalFinalizeResponse` (`lib/ai/schemas/goal-creation.ts:33`) — the **only** shape this function accepts for goal content. Fields:
  ```ts
  interface GoalFinalizeResponse {
    goal: {
      title: string;
      description: string;
      category: GoalCategory;       // one of GOAL_CATEGORIES
      deadline: string | null;
      smart: GoalSmartData;         // { specific, measurable, achievable, relevant, timeBound: string }
    };
    measurables: {
      title: string;
      type: GoalMeasurableType;         // 'counter' | 'checklist' (see lib/goals/schema)
      targetValue: number | null;
      targetUnit: string | null;
      frequency: GoalMeasurableFrequency;
    }[];
    reasoning: string;
    assumptions: string[];
  }
  ```
- `options?: { requestId?: string; projectId?: string | null }` — `requestId` used only for log correlation; `projectId` passed through to the goal insert.
- `db: SupabaseClient = supabase` — defaults to the anon-key client; the one live caller (`/api/goals` POST) passes an authed client (`createAuthedClient(auth.accessToken)`) instead.

Return type:
```ts
interface CreateGoalWithMeasurablesResult {
  goalId: string | null;
  error: string | null;
  warning: string | null;
}
```

Note: `reasoning` and `assumptions` are part of the accepted input type but are **not persisted anywhere** in the function body — they're read from `aiData` only to build `smart`/measurables text via `buildGoalEmbeddingText`, not written to any column directly (reasoning/assumptions aren't referenced past the `mapAiGoalDataToDbInserts` call at all — only `aiData.goal.*` and `aiData.measurables` are used).

### 2. `ai_generated` / `is_ai_suggested` — every write site, and read/branch check

Both flags are written **exactly once each**, unconditionally, both inside the private helper `mapAiGoalDataToDbInserts` (`lib/db/goals.ts:58-101`), which builds the insert payloads consumed by the function:

- `lib/db/goals.ts:82` — `ai_generated: true` (hardcoded literal, in `goalInsert`).
- `lib/db/goals.ts:93` — `is_ai_suggested: true` (hardcoded literal, in each `measurableInserts[i]`).

Neither is a parameter — there is no way to call `createGoalWithMeasurables` (or `mapAiGoalDataToDbInserts`) and get `false`/`null` for either flag today. Both are set unconditionally to `true` on every call.

**Read/branch check:** Searched the full function body (`createGoalWithMeasurables`, lines 107–265) and its helper (`mapAiGoalDataToDbInserts`, lines 58–101). Neither flag is read back, compared, or branched on anywhere else in either function — they appear only as literal values in the two insert objects at write time. No conditional logic in this file depends on their values.

### 3. Tables written, and transaction boundary

Writes, in this order, **not wrapped in a single DB transaction** (sequential Supabase client calls, no `BEGIN`/`COMMIT`, no RPC):

1. `goals` — single-row insert (`goalInsert`), `.select('id').single()` to get the new `goalId`. **Blocking** — function returns early with `error` set if this fails.
2. `measurables` — bulk insert (one row per `aiData.measurables[i]`, each stamped with the new `goalId`). **Non-blocking on failure** — on error, appends to `warning` and logs, but does not roll back the goal row or return early.
3. `goals` (update) — fire-and-forget embedding write (`embedding`, `embedding_model` columns) via `.then()`/`.catch()` after `generateEmbedding()` resolves. Explicitly non-blocking; runs after the function has already returned in practice (not awaited).
4. `vaults` — single-row insert (auto-created vault for the goal). **Non-blocking on failure** — logged only, per root `CLAUDE.md` rule ("Vault creation failure must NOT block goal creation").

So: two tables are always attempted synchronously within the awaited portion of the function (`goals` insert, `measurables` insert), plus two non-blocking side effects (`vaults` insert, embedding update) — all as independent statements, no shared transaction.

---

## 4. `/api/goals` (POST) — current validation/schema

File: `app/api/goals/index+api.ts`.

Current request body type:
```ts
interface CreateGoalRequestBody {
  aiData: unknown;
  options?: { requestId?: string; projectId?: string | null };
}
```

Validation: `payload.aiData` is passed straight into `validateGoalFinalizeResponse()` (`lib/ai/schemas/goal-creation.ts:53`), the same manual validator used to parse the AI finalize model output. This function requires (throws `INVALID_INPUT` / 400 otherwise):
- `goal.title` non-empty string, `goal.description` string, `goal.category` ∈ `GOAL_CATEGORIES`, `goal.deadline` string-or-null, `goal.smart.{specific,measurable,achievable,relevant,timeBound}` all strings.
- `measurables[]` array; each item requires `title` non-empty, `type` ∈ `GOAL_MEASURABLE_TYPES`, `frequency` ∈ `GOAL_MEASURABLE_FREQUENCIES`, `targetValue` number-or-null, `targetUnit` string-or-null, plus type-specific rules (`counter` requires numeric `targetValue` + non-empty `targetUnit`; `checklist` requires both null).
- `reasoning` string (required).
- `assumptions` optional array of strings.

**This route currently assumes AI-shaped input explicitly, not just implicitly** — there is no branch, no alternate schema, no manual/non-AI code path. Any request body without a `goal.smart.*` block and a `reasoning` string is rejected at 400 before `createGoalWithMeasurables` is ever called. There is no separate "generalized" or "manual" input contract on this route today — `/api/goals` POST is, as it stands, coupled to the same `GoalFinalizeResponse` shape as `/api/goals/create`.

---

## 5–6. `/api/goals/create` (chat + AI-finalize route)

File: `app/api/goals/create+api.ts`.

### 5. Every caller — full file paths

Searched the full repo (excluding `node_modules`) for references to `/api/goals/create`. Exactly one caller exists:

- **`app/goals/create.tsx:157`** — inside `submitGoalChat()`, via `authedFetch('/api/goals/create', { method: 'POST', body: JSON.stringify({ userMessage, conversationHistory, finalize, projectId }) })`. This is the only frontend screen that talks to this route; it is called twice in practice from the same function body (once per chat turn with `finalize: false`, and once with `finalize: true` when the user taps "Create goal" — same code path, different `finalize` flag).

No other server code, hook, or component references this path (`create+api.ts` is not imported anywhere; nothing else calls the URL string).

Note: `app/goals/create.tsx` is the **only** caller of `/api/goals` POST as well (`app/goals/create.tsx:201`, immediately after a successful `finalize: true` response from `/api/goals/create`) — so today, both routes are only ever invoked back-to-back from this one screen, in this one script: chat/finalize call → `/api/goals/create`, then persistence call → `/api/goals`.

### 6. Request/response shape returned today

Request body (`RequestBody` in `create+api.ts:21-26`):
```ts
{
  userMessage?: string;
  conversationHistory?: ConversationMessage[];   // { role: 'user'|'assistant'; content: string }[]
  finalize?: boolean;
  projectId?: string | null;
}
```

Response body (`CreateResponse`, wrapped in `AiResponse<CreateResponse>`):
```ts
{
  requestId: string;
  message: string;
  isComplete: boolean;
  goalData?: GoalFinalizeResponse;        // only present when isComplete === true
  finalizedBy?: 'assistant' | 'user';     // only present when isComplete === true
}
```

Caller (`app/goals/create.tsx`) depends on all five fields:
- `requestId` — echoed back into the follow-up `/api/goals` call's `options.requestId`, and into error/log messages (`app/goals/create.tsx:182-183, 207, 217, 231, 241...`).
- `message` — shown as the next assistant chat bubble when `!isComplete` (`create.tsx:191`).
- `isComplete` — gates whether the screen treats the response as "still chatting" vs. "ready to persist" (`create.tsx:190, 194`).
- `goalData` — passed verbatim (optionally with `deadline` overridden by manual input) as `aiData` in the subsequent `/api/goals` POST body (`create.tsx:198-205`).
- `finalizedBy` — not sent to `/api/goals`; used only in client-side `console.info`/`console.error` log payloads (`create.tsx:220, 231, 241, 251, 260, 274`), never branched on for UI/control flow.

`/api/goals` (the route being kept) currently returns `ApiResponse<CreateGoalWithMeasurablesResult>` (`{ goalId, error, warning }`) — it does **not** return `requestId`, `message`, `isComplete`, `goalData`, or `finalizedBy`. If `/api/goals/create` is removed, any replacement flow that skips it will need its own source for `requestId`/chat `message`/`isComplete` semantics — `/api/goals` as it stands today has no equivalent fields for those.

---

## 7. Downstream reads of `ai_generated` / `is_ai_suggested` outside the write path

Full-repo grep (excluding `node_modules`) for `ai_generated`, `is_ai_suggested`, `isAiSuggested`, `aiGenerated`:

- **`features/goals/types.ts:26`** — `Goal.aiGenerated: boolean` (domain type field).
- **`features/goals/types.ts:45`** — `Measurable.isAiSuggested: boolean` (domain type field).
- **`features/goals/services/goal-service.ts:27`** — `DbMeasurable.is_ai_suggested: boolean` (raw row type).
- **`features/goals/services/goal-service.ts:45`** — `DbGoal.ai_generated: boolean` (raw row type).
- **`features/goals/services/goal-service.ts:119`** — `mapMeasurable()`: `isAiSuggested: row.is_ai_suggested` — straight passthrough, no branching.
- **`features/goals/services/goal-service.ts:138`** — `mapGoal()`: `aiGenerated: row.ai_generated` — straight passthrough, no branching.
- **`features/goals/services/goal-service.ts:250-257`** (`GOAL_SELECT` constant) — both `ai_generated` and `is_ai_suggested` are included in the Supabase `select()` column list used to fetch goals + measurables, so every goal/measurable read pulls these columns regardless of the write path.
- **`features/goals/components/GoalDetailHeader.tsx:94`** — `{goal.aiGenerated && <Badge label="AI" variant="ai" />}` — renders an "AI" badge in the goal detail header UI when true.
- **`features/goals/components/MeasurableCard.tsx:204`** — `{measurable.isAiSuggested && <Badge label="AI" variant="ai" />}` — renders an "AI" badge on individual milestone/measurable cards when true.

No other reads found (no dashboard, list-view filter, or sort logic keys off either flag — only the two badge renders above). **These two UI badge usages are legitimate live reads that will keep working after the write-path generalization** — they just reflect whatever `true`/`false` value ends up in the row; they don't need to change unless the intent is for manually-created goals to stop showing the "AI" badge (which would require the generalized write path to actually pass `false` for manual creations, since today it's hardcoded to `true` with no caller-supplied override).

---

## Scope confirmation

This document was the only file written or modified during this audit. No other files, migrations, or code were changed.
