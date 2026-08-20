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

The `/today` route now provides a timezone-aware daily overview with bounded task, event, and transaction queries plus direct navigation to each primary workflow.

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

Status: implementation complete. Multiple pockets, derived balances, transaction creation/deletion, daily grouping, custom categories, complete filters, sourced seven-day cash-flow chart, and responsive states are available. Signed-in browser smoke testing remains before deployment verification.

## Slice 5: contextual assistant and PWA

- Authenticated Gemini route with aggregated user context and daily limits
- Read-only answers with explicit confirmation before suggested mutations
- Streaming chat states and per-user history
- Manifest, service worker, offline cache behavior, and install checks

Status: implementation complete. The authenticated assistant has aggregated account context, RLS-scoped history, streaming responses, topic guardrails, and a 30-request daily limit. Gemini function calls can produce up to ten editable task, event, or transaction drafts in one request. Users select which drafts to run, receive per-item success or error states, and retry only failed items; explicit confirmation invokes the existing validated Server Actions. The PWA now includes a valid manifest, install icons, service-worker lifecycle, static app-shell caching, an offline fallback, and preserved Web Push handlers. Authenticated pages, API responses, and user data remain network-only to prevent account data from persisting in a shared browser cache. Install and offline behavior still require a production browser smoke test.

## MVP deployment verification

- Automated environment readiness check and public-route smoke test are available through `npm run check:env` and `npm run smoke:public`.
- Neon production is ready, email/password authentication requires OTP, and all ten user-owned tables have RLS enabled.
- Production environment, Neon Auth origin, database connection, cron secret, and VAPID keys are configured. Signed-in browser verification remains pending.
- Production is deployed at `https://orbita-memo.vercel.app`. The domain is registered as a Neon Auth trusted origin, all public PWA smoke checks pass, and the cron endpoint rejects unauthenticated requests. cron-job.org job `8293394` invokes the protected reminder endpoint every minute and its first automatic execution returned HTTP 200. Signed-in and browser push delivery smoke tests remain pending.
