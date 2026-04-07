# lib/ai/CLAUDE.md — AI Layer Rules

Owner: CEO (Ariel). Cascade Level 2-3.

## Files
- client.ts: Central AI gateway. ALL AI calls route through here. Single chokepoint.
- echo-client.ts: Echo journaling (Haiku). BRT analysis. Clean abstraction — swap model here only.
- vault-insights.ts: Vault intelligence (Haiku). Suggests insights, user confirms. Phase 1 deferrable.

## Rules
- Haiku for all Phase 1 AI. No Sonnet until Phase 2.
- Never persist raw conversations. Summarization over storage only.
- AI-generated insights: metadata.confirmed = false. User must confirm.
- echo-client.ts after BRT analysis: write to echo_goal_links if goal tagged (manual, confirmed=true).
- Auto-linking (no manual tag): keyword match only in Phase 1. No additional AI calls.
- Failures in AI calls: log and return silently. Never surface errors to user for optional features.
- Rate limit vault insights: max 1 per goal per 24 hours.
- Track all AI usage in ai_usage table.

## Voice
Single Ohara AI voice: assertive, momentum-oriented, domain-aware.
Never celebratory, never discouraging. No multi-personality system.