# Supabase environments

**Task:** FOUND-010  
**Rule:** The production Supabase project must not be used for casual development (Architecture §55).

Create **three** Supabase projects. Fill the project URLs when the projects exist. Do not put keys in this file.

| Environment | Supabase project | Next.js | Notes |
|---|---|---|---|
| Local | Local CLI project **or** a dedicated cloud project named `maruti-galaxy-local` | `.env.local` | Default for `npm run dev`. Migrations applied here first. |
| Staging | Dedicated cloud project `maruti-galaxy-staging` | Staging host env vars | Integration, QA, and migration rehearsal. |
| Production | Dedicated cloud project `maruti-galaxy-prod` | Production host env vars | Apply migrations only after staging. Restricted access. |

## Public vs server secrets

| Variable | Local / staging / prod | Browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Per environment | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Per environment | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Per environment | **Never** |

Service-role keys stay in:

- `.env.local` (gitignored)
- Staging/production secret stores

Never:

- `NEXT_PUBLIC_*`
- Client Components
- README with real values
- Git

## Auth dashboard setting (Phase 3 AUTH-010)

When each project is created, disable public signup. Documented here so it is not skipped later.

## Recorded URLs

Replace placeholders after projects are created. Keys still belong only in env/secret stores.

```text
LOCAL_SUPABASE_URL=http://127.0.0.1:54321
STAGING_SUPABASE_URL=https://YOUR_STAGING_REF.supabase.co
PRODUCTION_SUPABASE_URL=https://YOUR_PROD_REF.supabase.co
```

## OPS-002 production isolation

Create a dedicated cloud project named `maruti-galaxy-prod`. Do not reuse local or staging. Operator steps: [docs/PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md).

After the project exists:

1. Replace `PRODUCTION_SUPABASE_URL` in Recorded URLs above. Never commit keys.
2. Disable public signup in the Auth dashboard.
3. In the production SQL Editor: `ALTER DATABASE postgres SET maruti.environment = 'production';`
4. Do not run `supabase/seeds/seed_staging_volume.sql`.

Non-local `npm run bootstrap:admin` requires `MARUTI_BOOTSTRAP_CONFIRM=YES`.

Repository check: `npm run ops:preflight`. Hosting, monitoring, and backup vendors remain **[DECISION REQUIRED] R-17**.

## Staging volume seed (PERF-001)

`supabase/seeds/seed_staging_volume.sql` builds 1,000 jobs and 5,000 entries through `create_job_with_invoice` / `next_lot_number()` / `next_invoice_number()`. Run it only on local or staging. Never on production. Marker rows use `SEED-VOLUME-*` names.

Local/CI: `npm run db:perf` (or `npm run db:perf -- --reuse` after `db:verify`).

## Blocker note

Physical Supabase project creation requires an operator account. Application foundation does not require live credentials. Database migrations start in Phase 2 against local/staging, not production.
