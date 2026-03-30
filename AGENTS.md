# AGENTS.md

## Purpose
This repository follows a structured build process.
Codex is responsible for implementation, debugging, and scoped refactoring.
Claude is used separately for long-term planning, phase alignment, and architecture.

## Mandatory Rules

### 1) Update changelog on every code change
Whenever you modify code, you MUST update `CHANGELOGCODEX.md`.

This includes:
- new features
- bug fixes
- refactors
- API changes
- schema changes
- model routing changes
- UI behavior changes

Do not skip changelog updates.

### 2) Respect existing architecture
Do not make broad architectural rewrites unless explicitly requested.
Prefer minimal, targeted, non-breaking changes.

### 3) Preserve phase integrity
This project is being built in phases.
Do not introduce Phase 2+ complexity into Phase 1 work unless explicitly requested.
If a requested change creates future architectural risk, note it clearly.

### 4) Keep edits scoped
Only change files relevant to the requested task.
Avoid unnecessary renaming, file movement, or style churn.

### 5) Be explicit in changelog entries
Each changelog entry should briefly state:
- what changed
- why it changed
- which files were affected when relevant

## Changelog Format

Use this format in `CHANGELOGCODEX.md`:

## [Unreleased]

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Refactored
- ...

## Example
### Added
- Added explicit `goalFinalize` pipeline routing in `app/api/goals/create+api.ts`

### Changed
- Updated model pipeline config in `lib/ai/config.ts`

### Fixed
- Reduced repeated response behavior in goal creation flow

### Refactored
- Cleaned prompt organization in `lib/ai/prompts/goal-creation.ts`