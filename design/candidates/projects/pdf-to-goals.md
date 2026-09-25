# Candidate: PDF/TOC → Goals (smart Project creation)

**Feature area:** Projects
**Status:** Candidate (concept — not signed off, not scheduled)
**Logged:** 2026-09-24

---

## The idea

Let a user paste (or upload) study material — e.g. the "Contents" of an FE exam
study guide — into Projects, and have AI turn it into a Project with a set of
Goals, one per topic/subject area. Keep AI suggestions optional: one cheap LLM
call generates the goals, and the user confirms which to keep.

Two versions:

- **V1 (recommended, small):** paste TOC text → one Sonnet call clusters it into
  draft goals → user reviews cards → batch-commit under a new/selected Project.
- **V2 (defer):** an interactive PDF-upload chatbot that builds the project
  conversationally (like the Goals chatbot, but project-scoped).

The user also wants **PDF upload** added to V1 (capped, initially 3).

---

## Why it fits Ohara

- **Zero schema change.** Projects already "aggregate multiple goals" and
  `goals.project_id` is a live FK (`features/projects/services/project-service.ts`
  reads goals by `project_id`). "Study for the FE exam" *is* a Project; each
  subject area *is* a Goal under it.
- **High reuse of existing plumbing:**
  - `lib/ai/prompts/goal-creation.ts` + `lib/ai/schemas/goal-creation.ts`
    already emit structured goals *with milestones and tasks*
    (`GoalTemplateOption`). Run it in a fan-out mode (N goals from one syllabus)
    instead of the current "3 strategies for 1 goal."
  - `features/goals/components/AIGoalCreation.tsx` already has the
    entry→chatting→selecting→reviewing→success chatbot loop, and
    `app/api/goals/chat+api.ts` already returns a `templates` payload.
  - `features/goals/components/EchoGoalDraftCards.tsx` already implements a
    draft-card review pattern (pick which AI-suggested goals to keep) — this is
    the confirmation UI, already built.
- **Respects the AI-confirmation rule.** CLAUDE.md: AI-generated insights require
  user confirmation (`metadata.confirmed`); `feedback.pending` exists for
  unconfirmed-suggestion banners. This candidate is a batch application of that
  same pattern.
- **Additive, not a new pillar.** It's a smart entry point into an existing
  container, not a new social/data surface.

---

## The make-or-break decision: granularity

A Goal is "the atomic unit of *behavior*" (repeatable Tasks + one-time
milestones). A raw table of contents is a list of *topics*, not behaviors. So the
failure mode is **one goal per line**:

- The FE exam has ~14 knowledge areas. Naively that's 14 goals, and **each goal
  auto-creates a Vault and appears in Constellation, Home, and potentially
  Circles.** A detailed TOC would flood every surface with thin goals.
- **Fix:** the LLM call must *cluster* the pasted contents into a sensible
  handful of goals (e.g. 5–7 subject-area goals), each shipping with a recurring
  study Task + the sub-topics as milestones — never a bare title.

This is the "no dead-end features" test: a generated goal that's just a title is
a dead end; a generated goal with a study schedule + topic milestones is alive
the moment it's created. The prompt must produce the latter.

---

## Confirmation UX: draft-then-commit (not persist-then-delete)

The original idea was "generate the goals, then let the user delete unwanted
ones." Flip it to **draft-then-commit**:

1. Architecturally correct — CLAUDE.md requires confirmation *before* AI output is
   applied (`metadata.confirmed`, `feedback.pending`).
2. Persist-then-delete is expensive cleanup — every goal auto-spawns a Vault, so
   deletes cascade, and the goals briefly pollute Constellation/Home.

Draft cards (reuse `EchoGoalDraftCards`) let the user check/uncheck/edit, then
batch-insert only the kept goals with `project_id` set. Still **one LLM call** —
keeps the "cheap" property without the cleanup mess.

**Model:** use **Sonnet** (CLAUDE.md reserves Sonnet for goal creation) —
clustering a syllabus into coherent goals is exactly the reasoning Haiku does
poorly.

---

## PDF upload — cost & risks

### Pricing facts (Sonnet 5)

- Sonnet 5: input **$3/MTok** ($2 intro through 2026-08-31), output **$15/MTok**
  ($10 intro), 1M context. PDF input is GA on the first-party API.
- Native PDF to Claude (base64 `document` block, no beta header): limits
  **32 MB / 600 pages** per request (100 pages only on 200K-context models —
  not a constraint here, Sonnet 5 is 1M). Each page is billed as extracted
  **text + a rendered page image**, so budget **~2,000–5,000 tokens/page**.

### What it costs in practice

- **5-page syllabus/TOC:** ~15K input tokens ≈ **<$0.10 per extraction**. Trivial.
- **100-page study guide:** ~300K tokens ≈ **$0.60–0.90 input** for one call —
  cheap per call, but this is the blowup vector.

### Pull this cost lever first: don't send the PDF to Claude at all

Two ingestion paths, ~3–5× apart in cost:

1. **Native PDF** (send bytes): handles scanned/image-only PDFs, tables, layout
   via vision — but pays text **+ image** tokens/page (~2–5K/page).
2. **Client-side text extraction** (pdf.js / `pdfjs-dist` → send extracted text):
   text tokens only (~500–1,500/page, no image tokens), several times cheaper.
   Fails only on scanned/image-only PDFs with no text layer.

A syllabus/TOC is digital text, not a scan — **default to client-side
extraction**; only reach for native PDF later if users upload scans.

### Risks (ranked, tied to architecture rules)

1. **Crosses the Phase 1.5 line.** CLAUDE.md: "No document upload UI yet
   (Phase 1.5)." Conscious decision — warrants a DECISIONS.md entry.
2. **SSR safety (CRITICAL).** pdf.js must be dynamically imported **client-side
   only** — never at a module top level `_layout.tsx` pulls in, or it can throw
   at module-load in Vercel SSR. Layer 2, not Layer 1.
3. **Cost/page blowup.** "Limit to 3 uploads" is **not** a cost control — cap
   **pages + file size** (e.g. ≤30 pages, ≤10 MB), reject encrypted PDFs, handle
   scans that extract to garbage (fall back to manual paste).
4. **Prompt injection.** PDF contents are untrusted data entering the prompt.
   The draft-then-commit human gate is the safety net; treat PDF text as data,
   never instructions.
5. **Enforce the cap server-side.** Per the data rule (userId from session, never
   request body), the "3" cap and page/size limits must live in the API route.
   "3" is ambiguous — working assumption: **3 pending/uncommitted extractions per
   user at once** (cost/abuse guard). Revisit if it should mean 3 total or
   3 per project.
6. **Non-blocking failure.** Mirror "vault creation must not block goal
   creation" — a PDF parse/extract failure degrades to manual paste, never errors
   out project creation.
7. **Don't store the PDF.** Transient extraction (parse → generate → discard)
   avoids a Supabase Storage bucket, RLS, PII-at-rest, and retention. Add storage
   only if the PDF should attach to the Project Vault — a separate, bigger call.
8. **Latency.** Large PDF → large input → multi-minute call at high effort.
   Stream/show progress; keep the page cap tight to stay interactive.

---

## Recommendation

Build **V1** (paste TOC → one Sonnet call → clustered draft goals → review-card
confirm → batch-commit under a Project). Add PDF upload to V1 **only via
client-side text extraction**, with page/size caps and a server-enforced
per-user cap, non-blocking on failure. Defer **V2** (interactive PDF chatbot)
until V1 proves extraction/clustering quality — and until the Phase 1.5
document-upload decision is formally made.

**Open questions**
- Exact meaning of the "3" cap (concurrent / total / per-project).
- Page and file-size limits to enforce.
- Whether to formally lift the Phase 1.5 "no document upload" freeze (DECISIONS.md).
