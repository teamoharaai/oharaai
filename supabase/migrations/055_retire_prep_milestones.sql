-- Migration 055: retire the `prep` milestone variant (Goal Detail Redesign).
--
-- Milestones become one-time achievements only. The lightweight `prep` checklist
-- is superseded by Tasks (the single recurring/enabling-work engine), so the
-- surviving prep rows are removed. Scope is STRICTLY `kind = 'prep'`; achievement
-- milestones (and their sub-milestones) are untouched.
--
-- The `milestones.kind` column and its CHECK (prep | achievement) are deliberately
-- LEFT IN PLACE: no product path authors prep anymore (verified — no writer sets
-- kind, so inserts default to 'achievement'), and keeping the constraint avoids a
-- schema-shape change while making this migration a pure data cleanup. Narrowing
-- the enum can happen in a later dedicated migration if desired.
--
-- Safety of the delete:
--   * milestones.parent_id  -> ON DELETE CASCADE (prep rows are top-level with no
--                              children, so nothing cascades in practice).
--   * tasks.milestone_id    -> ON DELETE SET NULL (a task pointed at a prep row
--                              simply loses the link; never blocks).
--   * reflection_milestone_links.milestone_id -> ON DELETE CASCADE (a stray
--                              reflection link to a prep row is removed).
-- No FK RESTRICTs, so the delete cannot be blocked.

delete from public.milestones
where kind = 'prep';
