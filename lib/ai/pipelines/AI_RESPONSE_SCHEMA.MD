# AI Response Schema — Ohara

> Strict contract for all LLM inputs and outputs.
> Every AI pipeline MUST validate responses against these schemas before using the data.
> If a response doesn't match, it is rejected — never partially used, never coerced.

## Why this exists

LLMs produce non-deterministic output. Without a strict schema contract:
- A malformed response can write garbage into the character profile
- A missing field can crash the UI or silently corrupt state
- A hallucinated field can leak internal taxonomy to users

Every pipeline in `lib/ai/pipelines/` must:
1. Send a system prompt that includes the exact expected JSON schema
2. Parse the response as JSON
3. Validate against the schema defined here (use Zod at runtime)
4. Reject and retry (once) on validation failure
5. Log the failure to `ai_usage` table with the `error` field populated

## Schema: Goal Creation

**Pipeline:** `lib/ai/pipelines/create-goal.ts`
**Model:** Haiku (default) or Sonnet (if quality flag enabled)
**Trigger:** User completes the goal creation conversation

### Input (what we send to the LLM)

```typescript
{
  systemPrompt: string,     // from lib/ai/prompts/goal-creation.ts
  conversationHistory: {     // the multi-turn goal creation chat
    role: "user" | "assistant",
    content: string
  }[]
}
```

### Output (what the LLM must return)

```typescript
// Zod schema: GoalCreationResponseSchema
{
  goal: {
    title: string,           // max 100 chars
    description: string,     // max 300 chars
    category: string,        // must be one of GOAL_CATEGORIES from constants
    deadline: string | null, // YYYY-MM-DD or null for open-ended goals
    smart: {
      specific: string,
      measurable: string,
      achievable: string,
      relevant: string,
      timeBound: string
    }
  },
  milestones: {              // 1-3 one-time critical events
    title: string,           // max 80 chars
    description: string | null,
    dueDate: string | null,  // YYYY-MM-DD or null
  }[],
  trackers: {                // 0-4 recurring or quantitative measures
    title: string,           // max 80 chars
    type: "counter" | "habit" | "checklist",
    targetValue: number | null,
    targetUnit: string | null,
    frequency: "daily" | "weekly" | "monthly",
  }[],
  reasoning: string,         // internal only — why the AI structured the goal this way
                             // stored in ai_usage log, never shown to user
  assumptions: string[]      // normalized to [] when no explicit assumptions are needed
}
```

### Validation rules
- `goal.title` must not be empty, max 100 chars
- `goal.category` must match a value in `constants/features.ts → GOAL_CATEGORIES`
- `goal.deadline` must be either `null` or a date string
- `goal.smart` must include all five string fields
- `milestones` and `trackers` must both be arrays
- Milestones are one-time events critical to the goal, never habits or measures
- Milestone `description` and `dueDate` are explicit strings or `null`
- If tracker `type === "counter"`, `targetValue` must be greater than 0 and `targetUnit` is required
- If `type === "habit"`, `targetValue` and `targetUnit` may be present but are not required
- If tracker `type === "checklist"`, `targetValue` and `targetUnit` must be `null`
- `frequency` is required for all types
- `assumptions` is always present after normalization

### On validation failure
1. Log error to `ai_usage` with `error: "schema_validation_failed"`
2. Retry once with a repair prompt: "Your previous response did not match the required JSON schema. Here is the schema: [schema]. Please try again."
3. If retry also fails, return a user-friendly error: "We couldn't process your goal. Please try again."
4. Never partially save — either all fields validate or nothing is written

---

## Schema: Echo Reflection (Journal Insight)

**Pipeline:** `lib/ai/pipelines/reflect.ts`
**Model:** Haiku
**Trigger:** User requests insight on a journal entry (opt-in)

### Input

```typescript
{
  systemPrompt: string,      // from lib/ai/prompts/reflect.ts
  journalEntry: string,      // the user's raw text
  profileSummary?: string    // current character profile JSONB, if available
}
```

### Output

```typescript
// Zod schema: ReflectionResponseSchema
{
  classification: "GROWTH" | "REALITY" | "OBSTACLE",
  confidence: number,        // 0.0 to 1.0
  themes: string[],          // 1-5 theme tags, lowercase, no spaces (use hyphens)
  response: string           // the Guide's response, max 300 words
}
```

### Validation rules
- `classification` must be exactly one of the three enum values (case-sensitive)
- `confidence` must be a number between 0.0 and 1.0 inclusive
- `themes` must have 1-5 items, each lowercase alphanumeric with hyphens only
- `response` must not be empty, max 2000 chars (~300 words)
- `response` must never contain "Bud", "Rose", "Thorn", "GROWTH", "REALITY", or "OBSTACLE" — these are internal

### On validation failure
1. Log error to `ai_usage`
2. Retry once
3. If retry fails, mark the entry as `processed_at = now()` with `error` in a metadata field
4. Show user: "Insight unavailable right now. Your entry is saved."
5. Never block the journal save — the entry is always persisted regardless of AI failure

---

## Schema: Profile Summarization

**Pipeline:** `lib/ai/pipelines/summarize.ts`
**Model:** Haiku
**Trigger:** After every 3rd Echo entry with AI insight, or daily cron if user journaled

### Input

```typescript
{
  systemPrompt: string,       // from lib/ai/prompts/summarizer.ts
  currentProfile: {           // existing character profile JSONB
    interests: string[],
    strengths: string[],
    challenges: string[],
    patterns: ThornPattern[],
    lastUpdated: string
  },
  recentEntries: {            // last 3-5 entries since last summarization
    classification: string,
    themes: string[],
    response: string,
    createdAt: string
  }[]
}
```

### Output

```typescript
// Zod schema: ProfileUpdateSchema
{
  interests: {
    add: string[],            // new interests detected
    remove: string[],         // interests no longer relevant
  },
  strengths: {
    add: string[],
    remove: string[],
  },
  challenges: {
    add: string[],
    remove: string[],
  },
  patterns: {
    theme: string,
    trend: "increasing" | "stable" | "decreasing",
    note: string              // max 100 chars, internal reasoning
  }[],
  summary: string             // max 200 chars, one-line summary of what changed
}
```

### Validation rules
- All `add`/`remove` arrays can be empty but must be arrays
- `patterns[].theme` must be lowercase alphanumeric with hyphens
- `patterns[].trend` must be one of the three enum values
- `summary` must not be empty, max 200 chars
- The output is a **delta**, not a replacement — the service layer merges it with the existing profile

### On validation failure
1. Log error, retry once
2. If retry fails, skip this summarization cycle — the profile stays as-is
3. The next trigger will include the skipped entries, so no data is lost

---

## General rules for all schemas

1. **System prompts must include the JSON schema verbatim.** The LLM needs to see the exact shape it must produce. Put it in a fenced code block inside the system prompt.

2. **Always request `"Respond with ONLY the JSON object. No preamble, no markdown fencing, no explanation."`** in the system prompt.

3. **Parse with try/catch.** Strip markdown fences if present (```json ... ```), then `JSON.parse`, then Zod `.safeParse()`.

4. **Never trust field values without validation.** An LLM can return `confidence: 2.5` or `classification: "positive"` — both syntactically valid JSON but semantically wrong.

5. **Never add fields to the response type without updating this document first.** This is the contract. If you need a new field, add it here, update the Zod schema, update the system prompt, then update the pipeline.

6. **Zod schemas live in `lib/ai/schemas/`.** One file per pipeline:
   - `lib/ai/schemas/goal-creation.ts`
   - `lib/ai/schemas/reflect.ts`
   - `lib/ai/schemas/summarize.ts`

7. **The `reasoning` / `summary` / `note` fields are for logging only.** They help debug AI behavior. They are never shown to users and never stored in user-facing tables.
