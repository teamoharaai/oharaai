# Goal Creation Eval Harness

Lightweight harness for the goal-creation chat flow.

## What it covers

- `time to first structured draft`
- `number of clarification questions`
- `assumption quality`
- `SMART structure quality`
- `realism quality`
- `shouldFinalize correctness`
- `scope reduction detection`
- `multi-goal splitting detection`
- `emotional acknowledgment signal`
- `false finalization rate`
- `save success/failure` via preflight validation

## Files

- Fixtures: `evals/goal-creation/fixtures/cases.json`
- Rubric: `evals/goal-creation/scoring-rubric.md`
- Runner: `evals/goal-creation/run.mjs`
- Output directory: `evals/goal-creation/results/`

## Run it

1. Start the app or API locally so `/api/goals/create` is reachable.
2. Ensure `ANTHROPIC_API_KEY` is available to the app process, because the route uses the live model.
3. Run:

```bash
npm run eval:goal-creation -- --base-url http://localhost:8081
```

Optional flags:

```bash
--fixture <id>         Run one fixture only
--max-turns <n>        Max assistant turns before forced finalization (default: 4)
--output <path>        W
rite JSON results to a custom path
--base-url <url>       API base URL, default http://localhost:8081
```

## Fixture fields

Legacy expectations still work. Harder cases can also opt into lightweight behavior scoring with:

- `shouldFinalize`
- `shouldOfferScopeReduction`
- `shouldSplitGoal`
- `shouldAcknowledgeEmotion`
- `shouldPreserveAmbition`

These are optional and only affect the corresponding heuristic metrics.

## Notes

- The harness exercises the real `/api/goals/create` endpoint.
- Save measurement is a `preflight` check by default because the current persistence step happens client-side after finalization and expects a signed-in user.
- If you later want live save testing, the clean extension point is a small authenticated eval-only endpoint or a Node-safe persistence adapter that wraps `createGoalWithMilestonesAndTrackers`.
- Output JSON includes both `metricScores` and `heuristicFlags`, plus aggregate `averageScores` and `behaviorRates`.
