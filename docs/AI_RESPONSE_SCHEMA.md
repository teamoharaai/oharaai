# AI Response Schema

> Strict contracts for all AI pipeline outputs. Every pipeline in `lib/ai/pipelines/`
> must validate its response against the corresponding schema in `lib/ai/schemas/`.

---

## Goal Creation Pipeline

**Pipeline:** `goalCreation`
**Schema file:** `lib/ai/schemas/goal-creation.ts`
**Used by:** `lib/ai/pipelines/create-goal.ts`

### Response shape

```json
{
  "message": "string — conversational reply shown to the user",
  "smartStatus": {
    "specific": false,
    "measurable": false,
    "achievable": false,
    "relevant": false,
    "timeBound": false
  },
  "allSatisfied": false,
  "proposedGoal": {
    "title": "string — clear, energizing goal title",
    "description": "string — 1–2 sentence description",
    "category": "body | mind | money | create | connect | contribute",
    "smart": {
      "specific": "string — what exactly will they do or achieve",
      "measurable": "string — how progress is tracked",
      "achievable": "string — why this is realistic",
      "relevant": "string — why this matters to them",
      "timeBound": "string — deadline or timeframe"
    },
    "deadline": "YYYY-MM-DD or null",
    "suggestedMeasurables": [
      {
        "title": "string — trackable behavior or metric",
        "type": "counter | habit | checklist",
        "targetValue": null,
        "targetUnit": null,
        "frequency": "daily | weekly | monthly | once"
      }
    ]
  }
}
```

### Rules

- `message` is always present and sounds like natural conversation — never JSON-like
- `smartStatus` is always present with all 5 boolean fields
- `allSatisfied` is `true` only when all 5 `smartStatus` fields are `true`
- `proposedGoal` is included **only** when `allSatisfied` is `true`
- `suggestedMeasurables` must have 2–4 entries when present
- `deadline` is an ISO date string (`YYYY-MM-DD`) or `null`

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
