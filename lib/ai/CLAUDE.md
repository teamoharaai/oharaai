# CLAUDE.md — lib/ai/

> Loaded when Claude Code touches files in this directory.

## What this directory is

The AI infrastructure layer. Every LLM call in Ohara flows through here.

## Rules — NEVER violate

1. **`client.ts` is the only file that imports the Anthropic SDK.** No other file in the entire project imports it.
2. **Every pipeline validates output with Zod** from `schemas/`. See `docs/AI_RESPONSE_SCHEMA.md` for the contracts.
3. **Never return raw LLM text to the UI.** Parse → validate → transform → return typed data.
4. **Never store raw conversations.** Pipelines produce structured summaries only.
5. **All calls must include `pipeline` name for logging.** This powers cost tracking.
6. **Feature flags in `config.ts` gate every pipeline.** Check the flag before calling the LLM.
7. **Prompts must include the JSON schema verbatim** so the LLM knows the exact output shape.
8. **On validation failure:** retry once with repair prompt, then graceful fallback. Never crash. Never partial-save.
9. **System prompts must never mention** Bud, Rose, Thorn to the user — use GROWTH, REALITY, OBSTACLE internally only.

## File responsibilities

- `client.ts` — wraps Anthropic SDK, logs to `ai_usage`, enforces rate limits
- `config.ts` — model selection, token limits, feature flags (edit here to enable/disable pipelines)
- `queue.ts` — async job queue (journal insight is async, not synchronous)
- `schemas/*.ts` — Zod schemas matching `docs/AI_RESPONSE_SCHEMA.md` exactly
- `prompts/*.ts` — system prompt string constants (keep under 800 tokens each)
- `pipelines/*.ts` — orchestration: assemble prompt → call client → validate → return

## Adding a new pipeline

1. Define the schema in `docs/AI_RESPONSE_SCHEMA.md` first
2. Create the Zod schema in `schemas/`
3. Write the system prompt in `prompts/`
4. Create the pipeline in `pipelines/` — it calls `client.ts` and validates with the schema
5. Add the feature flag to `config.ts`
6. Wire it into the appropriate feature service