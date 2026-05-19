# WooCommerce-connected POS scaffold

Operational Next.js 15 cashier surface that hydrates WooCommerce catalogs through incremental BullMQ-fed synchronization loops and mirrors POS tenders inside Prisma-backed SQLite caches.

## Requirements

Install the current LTS release of **Node.js** (20 or newer) plus local **Redis** for BullMQ job runners. WooCommerce keys need permission to read products, create orders, and (optionally) receive authenticated webhooks.

## Environment variables

Duplicate `.env.local.example` into `.env.local` before running migrations.

| Variable | Purpose |
| --- | --- |
| `NEXTAUTH_SECRET` | Required secret for JWT sessions. |
| `NEXTAUTH_URL` | Public URL of this Next.js app (usually `http://localhost:3000`). |
| `WC_BASE_URL` | Store root without trailing slash. |
| `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` | WooCommerce REST API keys (Basic authentication). |
| `WEBHOOK_SECRET` | Shared secret used to validate webhook signatures. |
| `DATABASE_URL` | Points to `./prisma/pos.db` for local SQLite hydration. |
| `REDIS_URL` | Redis instance shared by queues and BullMQ workers. |
| `ENABLE_WORKER` | Set to `true` when spawning the standalone worker CLI. |

Optional knobs:

| Variable | Purpose |
| --- | --- |
| `PRODUCT_SYNC_INTERVAL_MS` | Repeat cadence for product sweeps initiated by workers. Defaults to five minutes when unset. |
| `ORDER_SYNC_INTERVAL_MS` | Repeat cadence for order reconciliation sweeps. Defaults to two minutes when unset. |
| `WC_STORE_CURRENCY` | ISO currency code forwarded during WooCommerce order creation (defaults to `USD`). |
| `SYNC_PRODUCTS_JOB_CONCURRENCY` / `SYNC_ORDERS_JOB_CONCURRENCY` | Adjust BullMQ parallelism per worker deployment. |

## Install and prepare the datastore

From this directory:

```powershell
npm install
```

Copy `.env.local.example`, then run migrations (PowerShell snippet sets `DATABASE_URL` inline):

```powershell
Copy-Item .env.local.example .env.local
$env:DATABASE_URL="file:./prisma/pos.db"
npm run db:migrate
npm run db:seed
```

Seeding provisions two accounts (password `changeme123` for both):

- `admin` (role `ADMIN`)
- `cashier` (role `CASHIER`)

## Development servers

```powershell
npm run dev
```

Visit `http://localhost:3000`, sign in, and you will be redirected to `/kasir`.

## Background worker

The worker process shares the BullMQ queue with API routes. Start Redis, ensure `ENABLE_WORKER=true` in `.env.local`, then launch:

```powershell
npm run worker
```

The worker registers repeatable jobs for catalog and order sweeps using the interval environment variables.

## Quality gates

```powershell
npm run lint
npm run build
```

## Architecture notes

- **Server layout guard** (`app/(pos)/layout.tsx`) protects `/kasir`, `/orders`, and `/barcode` without Edge middleware so Prisma and bcrypt stay on the Node.js runtime.
- **API routes** validate every JSON payload with Zod before returning data to TanStack Query consumers.
- **BullMQ** (`lib/queue`) isolates WooCommerce traffic away from interactive requests; failures surface through Prisma `SyncStatus` fields.
- **Offline queue** (`store/session.store.ts`) records client-side reminders when API calls fail; this is intentionally lightweight until true offline replication ships.

## WooCommerce setup checklist

1. Enable REST API keys with read/write scope.
2. Register a webhook endpoint pointing to `/api/webhooks/woocommerce` and paste the same secret into `WEBHOOK_SECRET`.
3. Align `WC_STORE_CURRENCY` with the WooCommerce currency configured in **WooCommerce ▸ Settings ▸ General**.

## Security Notes

- Never commit `.env` or `.env.local` files
- Regenerate WooCommerce API keys if they were ever exposed
- Change default passwords (admin/cashier: changeme123) after first deploy
- Set a strong random `WEBHOOK_SECRET` before registering WC webhooks

## Docker

### Development (Redis only)
Run Redis in a container while developing locally:
```powershell
docker compose up -d
npm run dev        # terminal 1
npm run worker     # terminal 2
```

### Production
Full stack deployment (App + Worker + Redis):
```powershell
# 1. Prepare environment
cp .env.production.example .env.production
# Fill in .env.production with real values

# 2. Launch stack
docker compose -f docker-compose.prod.yml up -d --build

# 3. Initialize database
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npx prisma db seed
```
