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

## Neon & Database Architecture
When writing backend code, creating SQL migrations, designing schemas, or querying data, use the project's Neon architecture:
- **Authentication**: Neon Auth through `@neondatabase/auth`.
- **User-scoped data access**: Neon Data API through `@neondatabase/postgrest-js`, authenticated with the current user's Neon Auth JWT.
- **Authorization**: PostgreSQL RLS based on `auth.user_id()` from `pg_session_jwt`.
- **Trusted server access**: use an owner connection only for explicitly trusted jobs such as cron processing. Never expose it to the client or use it for normal user requests.
- **Guidance sources**: use the connected Neon MCP server and official Neon documentation. Do not use Supabase skills or Supabase-specific architecture guidance for this project.

### Database Execution Rules
- Always inspect the existing schema and policies through the connected Neon MCP server before writing a migration.
- Use Neon branches to test schema changes before production when a migration is non-trivial.
- Keep migrations idempotent where practical and preserve existing user data.
- Every user-owned table must enable RLS and scope policies to `auth.user_id()`.
- Keep explicit `user_id` filters in application queries as defense in depth, even when RLS is active.
- Add indexes for foreign keys and common RLS/filter paths, then use Neon query analysis tools before speculative tuning.
- Do not mix Neon Data API user requests with direct authenticated SQL on the same branch. Use the Data API path defined in `lib/db/server.ts`.
