# Maruti Galaxy

Internal operations console for diamond polishing and cutting / job-work.

**Stack:** Next.js (App Router) + TypeScript + Supabase Auth + PostgreSQL

This README is the local runbook (OPS-001) and the Phase 0 freeze record (FOUND-002, FOUND-003).

---

## Local runbook

### Prerequisites

- Node.js 20.9+ (see `.nvmrc`)
- npm 10+
- A **local or staging** Supabase project (never use production for casual development)

### Install

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` with the local/staging project values:

| Variable | Visibility | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Browser/server user-scoped anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Admin Auth API and first-user bootstrap. Never prefix with `NEXT_PUBLIC_`. |
| `BOOTSTRAP_ADMIN_NAME` | Operator only | First admin display name |
| `BOOTSTRAP_ADMIN_EMAIL` | Operator only | First admin email |
| `BOOTSTRAP_ADMIN_PASSWORD` | Operator only | First admin password |

Do not commit `.env.local`.

### Database

On a fresh Supabase project, paste and run in order in the SQL Editor:

1. `supabase/migrations/migration_01.sql`
2. `supabase/migrations/migration_02.sql`
3. `supabase/migrations/migration_03.sql`
4. `supabase/migrations/migration_04.sql`

Staging volume seed (PERF-001, **never production**): `supabase/seeds/seed_staging_volume.sql`

In the Supabase dashboard, disable public signup (AUTH-010). Local `supabase/config.toml` already has `enable_signup = false`.

Create the first admin after the schema is applied:

```bash
npm run bootstrap:admin
```

Local constraint verification (Homebrew/CI Postgres, not production):

```bash
npm run db:verify
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated requests go to `/auth/login`.

### Verify

```bash
npm run lint
npm run typecheck
npm run test
npm run secret-scan
npm run audit
npm run db:verify
npm run db:perf
npm run build
npm run bundle-scan
npm run test:e2e
```

Or `npm run ci` for lint, typecheck, test, secret-scan, audit, build, and bundle-scan.  
`npm run qa:regression` also runs `db:verify`, `db:perf --reuse`, and Playwright. Live E2E needs `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` on a real Supabase project (`npx playwright install chromium` once).

---

## Environments (FOUND-010)

Use **separate** Supabase projects. Production must not be used for casual development.

Details: [docs/environments.md](docs/environments.md)

Production isolation (OPS-002): [docs/PRODUCTION_RUNBOOK.md](docs/PRODUCTION_RUNBOOK.md). Run `npm run ops:preflight` before go-live. Hosting/backup/monitoring vendors are **[DECISION REQUIRED] R-17**.

---

## Out of scope (FOUND-002)

Do **not** implement the following. They are rejected for v1.

- Materials / inventory management or materials tables
- GST / tax calculation, invoice tax amount, invoice discount, invoice due date
- Payment method or transaction reference number on entries
- Separate expense, expense-category, employee-earnings, payment, transaction, or invoice-item tables
- Multiple jobs on one invoice, or multiple invoices on one job
- Application-stored passwords / password hashes in `users`
- Public / unauthenticated marketing or business pages
- File-upload subsystem
- Offline sync
- Roles beyond `admin` in this baseline (keep authorization extensible)
- Quotations, orders, or other generic-ERP screens from superseded frontend templates

Frontend authority is `docs/Maruti_Galaxy_Frontend_Requirements.md` only.

---

## Traceability freeze (FOUND-003)

| Decision | Frozen value |
|---|---|
| Tables | Exactly **12**: `users`, `parties`, `employees`, `job_works`, `sub_jobs`, `sub_job_employee_work`, `invoices`, `accounts`, `categories`, `entries`, `entry_invoice_allocations` |
| Role | `admin` only in v1 |
| Frontend | `docs/Maruti_Galaxy_Frontend_Requirements.md` |
| Auth credentials | Supabase Auth only — no password columns on `users` |
| Extra entities | **None planned** |

Do not add tables, modules, or screens outside the Master Implementation Plan.

---

## Authoritative documents

All live in `docs/`:

1. `docs/Maruti_Galaxy_PRD.md`
2. `docs/Maruti_Galaxy_Architecture_Requirements.md`
3. `docs/Maruti_Galaxy_Security_Requirements.md`
4. `docs/Maruti_Galaxy_Database_Requirements.md`
5. `docs/Maruti_Galaxy_Frontend_Requirements.md`
6. `docs/MASTER_IMPLEMENTATION_PLAN.md`

Logo: `public/Maruti_Galaxy_logo.png`

Schema: run `migration_01.sql`, then `migration_02.sql`, then `migration_03.sql`, then `migration_04.sql` in the Supabase SQL Editor.

Implementation status: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md)
