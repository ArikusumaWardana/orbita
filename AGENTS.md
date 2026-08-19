# Agent Instructions

## Project Context & Routing
Before implementing features, writing code, or running migrations, always consult the project documentation in this order:

1. **Product Requirements**: Read `Orbita_PRD.md` for feature scope, requirements, and user flow.
2. **Design Direction**: Read `DESIGN.md` for styling, layout, typography, and theme tokens.

---

<!-- antislop: auto-managed block -->
## UI & Content Quality (Anti-Slop)
For any UI, copywriting, or layout work, enforce anti-slop rules using:
- **Core Rules**: `.agents/skills/antislop/SKILL.md`
- **UI / Visual**: `.agents/skills/antislop-ui/SKILL.md`
- **Copywriting**: `.agents/skills/antislop-copywriting/SKILL.md`
- **Mobile Layout**: `.agents/skills/antislop-layoutmobile/SKILL.md`

*Rule: Always pair with `DESIGN.md` and confirm whether checks run during build or as an audit after.*

---

## Supabase & Database Architecture
When writing backend code, creating SQL migrations, designing schemas, or querying data:
- **Supabase Core Guidelines**: `.agents/skills/supabase/SKILL.md`
- **Postgres Best Practices**: `.agents/skills/supabase-postgres-best-practices/SKILL.md`

### Database Execution Rules
- Check `.agents/skills/supabase-postgres-best-practices/references/` for specialized tasks:
  - **Security & RLS**: Refer to `security-rls-basics.md` and `security-rls-performance.md`.
  - **Indexing**: Refer to `query-composite-indexes.md`, `query-partial-indexes.md`, and `query-missing-indexes.md`.
  - **Schema Design**: Refer to `schema-primary-keys.md`, `schema-foreign-key-indexes.md`, and `schema-constraints.md`.
  - **Connection & Performance**: Refer to `conn-pooling.md` and `data-n-plus-one.md`.
- Always inspect the existing schema via the connected Supabase MCP server before writing new migrations.
