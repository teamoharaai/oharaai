# AI Response Schema

> Strict contracts for all AI pipeline outputs. Every pipeline in `lib/ai/pipelines/`
> must validate its response against the corresponding schema in `lib/ai/schemas/`.

---

## Goal Creation Finalization

**Pipeline:** `goalFinalize`
**Schema file:** `lib/ai/schemas/goal-creation.ts`
**Prompt:** `GOAL_CREATION_FINALIZE_PROMPT` in
`lib/ai/prompts/goal-creation.ts`

### Response shape

```json
{
  "goal": {
    "title": "string — clear, energizing goal title",
    "description": "string — 1–2 sentence description",
    "category": "body | mind | money | create | connect | contribute",
    "deadline": "YYYY-MM-DD or null",
    "smart": {
      "specific": "string — what exactly will they do or achieve",
      "measurable": "string — how progress is tracked",
      "achievable": "string — why this is realistic",
      "relevant": "string — why this matters to them",
      "timeBound": "string — deadline or timeframe"
    }
  },
  "milestones": [
    {
      "title": "string — one-time critical event",
      "description": "string or null",
      "dueDate": "YYYY-MM-DD or null"
    }
  ],
  "trackers": [
    {
      "title": "string — repeatable behavior or quantitative measure",
      "type": "counter | habit | checklist",
      "targetValue": null,
      "targetUnit": null,
      "frequency": "daily | weekly | monthly"
    }
  ],
  "reasoning": "string — internal structuring rationale",
  "assumptions": ["string"]
}
```

### Rules

- `goal`, `milestones`, `trackers`, `reasoning`, and `assumptions` are the
  canonical finalization fields. Both arrays are required, including when
  empty.
- Milestones are one-time events critical to the goal. Their `description` and
  `dueDate` fields may be explicit `null` values.
- Trackers are counter, habit, or checklist measures with repeatable
  `daily`, `weekly`, or `monthly` cadence. `once` is not valid; model one-time
  events as milestones.
- Counter trackers require `targetValue > 0` and a non-empty `targetUnit`.
- Checklist trackers require `targetValue: null` and `targetUnit: null`.
- `goal.deadline` is an ISO date string (`YYYY-MM-DD`) or `null`.
- SMART keeps the field name `measurable`; it describes the SMART criterion and
  is not a legacy domain-object name.

---

## Echo Reflect Pipeline

**Pipeline:** `echoReflect`
**Schema file:** `lib/ai/schemas/reflect.ts` _(stub — not yet implemented)_

```json
{
  "message": "string — guide response shown to the user",
  "classification": "GROWTH | REALITY | OBSTACLE",
  "confidence": 0.85,
  "themes": ["string"],
  "profileUpdates": {}
}
```

---

## Summarize Pipeline

**Pipeline:** `summarize`
**Schema file:** `lib/ai/schemas/summarize.ts` _(stub — not yet implemented)_

```json
{
  "keyInsights": ["string"],
  "characterUpdates": {},
  "thornPatterns": ["string"]
}
```
