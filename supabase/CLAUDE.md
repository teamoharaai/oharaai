# CLAUDE.md — supabase/

> Loaded when Claude Code touches files in this directory.

## Rules

1. **Every schema change requires a new numbered migration file.** Never edit existing migration files.
2. **RLS is enabled on every table.** No exceptions. If you create a table, add RLS policies in the same migration.
3. **Use `CREATE TABLE IF NOT EXISTS`** to make migrations idempotent.
4. **Foreign keys must specify ON DELETE behavior.** Use CASCADE for child data (measurables → goals), SET NULL for optional references (starlog → goals).
5. **Add indexes on columns used in WHERE clauses and JOINs.** At minimum: `user_id`, `goal_id`, `status`.
6. **Naming:** tables are `snake_case` plural (`goals`, `measurables`), columns are `snake_case`, constraints are descriptive.
7. **JSONB for flexible data** (character profiles). Typed columns for structured data (goals, measurables).
8. **Never store raw AI conversations.** Only structured summaries in JSONB or typed columns.
9. **Test migrations locally** with `supabase db reset` before committing.

## Migration naming

```
001_initial_schema.sql
002_enable_rls.sql
003_goals_measurables_schema.sql
004_{description}.sql
```

Always increment the number. Never reuse a number.