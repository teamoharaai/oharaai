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
  "templates": [
    {
      "strategy_name": "string — memorable 2–4 word strategy name",
      "goal": {
        "title": "string — clear, outcome-oriented title",
        "description": "string — one sentence",
        "category": "health | finance | career | creative | education | relationships | growth",
        "deadline": "YYYY-MM-DD future date",
        "smart": {
          "specific": "string",
          "measurable": "string",
          "achievable": "string",
          "relevant": "string",
          "timeBound": "string"
        }
      },
      "milestones": [
        {
          "title": "string — one-time prospective checkpoint",
          "description": "string or null",
          "dueDate": "YYYY-MM-DD or null"
        }
      ],
      "trackers": [
        {
          "title": "string — repeatable behavior or quantitative measure",
          "type": "counter | habit | checklist",
          "targetValue": "number or null",
          "targetUnit": "string or null",
          "frequency": "daily | weekly | monthly | null"
        }
      ],
      "target_frequency": { "times": "number", "period": "day | week | month" }
    }
  ],
  "derived_category": "the shared template category",
  "reasoning": "string — internal structuring rationale",
  "assumptions": ["string"]
}
```

### Rules

- `templates`, `derived_category`, `reasoning`, and `assumptions` are the
  canonical finalization fields. `templates` contains exactly three items;
  every item uses the same category as `derived_category`.
- Milestones are one-time events critical to the goal. Their `description` and
  `dueDate` fields may be explicit `null` values.
- Trackers are counter, habit, or checklist measures with repeatable
  `daily`, `weekly`, or `monthly` cadence, or a `null` cadence. `once` is not
  valid; model one-time events as milestones.
- Counter trackers require `targetValue > 0` and a non-empty `targetUnit`.
- Checklist trackers require `targetValue: null` and `targetUnit: null`.
- Every `goal.deadline` is a future ISO date string (`YYYY-MM-DD`).
- `target_frequency` is an overall cadence object or `null` for narrative,
  non-trackable goals.
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
