# Orbita MVP execution plan

The PRD is being delivered as verified vertical slices so each feature has working states and a stable boundary before the next one depends on it.

## Slice 1: application foundation and tasks

- Next.js 16 App Router with strict TypeScript and ESLint
- Responsive desktop rail and mobile bottom navigation
- Working dark and light themes
- Task creation with local browser time defaults and PRD field limits
- Active and history views, completion, five-second undo, reorder, and delete
- Loading, empty, and error states

Status: implemented, then upgraded to server-backed task data in Slice 2.

## Slice 2: Neon and authentication

- Neon Auth with OTP verification and cookie-backed protected routes
- Authenticated database client uses a Neon Auth JWT through Neon Data API and Postgres RLS
- Initial Postgres migration with RLS, constraints, indexes, and idempotent onboarding
- Task storage uses Server Actions with optimistic completion, undo, delete, and debounced reorder

Status: implemented. Runtime verification with a real signed-in account remains a deployment smoke test.

## Slice 3: events and reminders

- Event CRUD, optional start/end time range, and default ten-minute reminder (implemented)
- Custom reminder CRUD and past-event view (implemented)
- Calendar month grid with task and event indicators (implemented)
- In-app notification feed, push subscription, and protected cron handler (implemented; deployment configuration pending)

Status: implementation complete. Signed-in browser smoke testing and production configuration for `DATABASE_URL`, `CRON_SECRET`, and VAPID keys remain before Slice 3 can be marked deployment-verified.

## Slice 4: pocket ledger

- Multiple pockets, user-owned categories, and transactions
- Derived balances, filters, grouped daily history, and sourced charts
- Finance-specific empty, loading, and error states

Status: core ledger implemented. Multiple pockets, derived balances, transaction creation/deletion, daily grouping, pocket/type filters, and responsive states are available. Category management, date/category filters, and sourced trend charts remain.

## Slice 5: contextual assistant and PWA

- Authenticated Gemini route with aggregated user context and daily limits
- Read-only answers with explicit confirmation before suggested mutations
- Streaming chat states and per-user history
- Manifest, service worker, offline cache behavior, and install checks

Status: pending Slices 2 through 4.
