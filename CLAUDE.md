# POS WooCommerce — AI Coding Rules

## Stack
Next.js 15 App Router · TypeScript 5 strict · Tailwind v4 · Zustand v5
TanStack Query v5 · Zod v3 · Prisma + SQLite · BullMQ + Redis · NextAuth v5

## Architecture Rules — never break these

1. NO `any` type. Use `unknown` and narrow it if type is genuinely unknown.
2. NO WooCommerce credentials in client code — only in app/api/ and lib/ (server-only).
3. NO direct WooCommerce fetch from React components — always go through /api routes.
4. NO useEffect for data fetching — use TanStack Query exclusively.
5. Every POSOrder MUST have an offline_id (UUID) generated client-side with
   crypto.randomUUID() BEFORE any API call is made.
6. All WooCommerce API responses MUST be validated with a Zod schema before use.
7. lib/woocommerce.ts MUST have `import 'server-only'` at the top.

## Sync Architecture — critical

The sync flow has TWO separate concerns. Do not confuse them:
- POST /api/sync/products → queues BullMQ job AND returns current DB data immediately
- GET /api/products → reads from Prisma (SQLite) — this is what the UI uses daily
- The BullMQ worker updates Prisma from WooCommerce in the background
- UI calls GET /api/products (or reads from Zustand if already loaded)

The UI should NEVER wait for a background sync to complete before showing products.
Products from local DB load in <100ms. Background sync may take 5–60 seconds.

## Zustand Persist — critical

The persist partialize MUST include products:
  partialize: (state) => ({ cart, offlineQueue, products })
Without this, every page refresh shows empty product list (confirmed bug in v1).

## API Response Shape
All API handlers return:
  Success: { success: true, data: T }
  Error:   { success: false, error: string, code?: string }
Never expose raw WooCommerce error objects to the client.

## File Conventions
- Named exports everywhere except page.tsx and layout.tsx
- One component per file, PascalCase filename = component name
- Hooks: use-kebab-case.ts, function: useCamelCase
- Stores: noun.store.ts
- All TanStack Query keys in lib/query-keys.ts — never inline strings

## What NOT to do
- Do not add Redux or React Context for global state — Zustand is the choice
- Do not add a full UI library (MUI, Chakra) — Tailwind + shadcn primitives only
- Do not build offline queue until core POS flow works end-to-end
- Do not over-engineer stock locking — real-time stock check at checkout is enough for v1
- Do not split pos/page.tsx into more than 5 sub-components in the same session —
  build incrementally and test each piece