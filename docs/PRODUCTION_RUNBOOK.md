# Production runbook

**Phase 15 / OPS-002.** Architecture §55: production Supabase must not be used for casual development.

This file is the in-repo isolation procedure. It does **not** create the hosted project. It does **not** adopt a hosting, monitoring, or backup vendor.

## [DECISION REQUIRED] R-17

Master Plan M-10 / R-17 and Architecture §66.5–7 must be confirmed by the product owner before **OPS-005, OPS-006, OPS-009, OPS-010, OPS-011**:

| Open item | Must not be guessed | R-17 recommendation (not adopted) |
|---|---|---|
| Production Next.js host | Exact provider | Vercel or equivalent |
| Monitoring | Exact provider | Host logs + Supabase logs minimum |
| Backup / retention | Exact policy | Paid Supabase PITR; 14–30 days until legal policy exists |

Do not add `vercel.json`, a Dockerfile, or a third-party APM until R-17 is accepted.

---

## OPS-002 — Isolated production Supabase project

Create a **new** Supabase project. Do not reuse local or staging.

| Field | Value |
|---|---|
| Suggested name | `maruti-galaxy-prod` |
| Isolation | Separate project ref, separate keys, separate database |
| Signup | Disable public signup (AUTH-010) in the Auth dashboard |
| Seed | Do **not** run `supabase/seeds/seed_staging_volume.sql` |
| App code | Do **not** hardcode parties, employees, or this project URL |

### After the project exists

1. Record **only** the URL in `docs/environments.md` (`PRODUCTION_SUPABASE_URL`). Never commit keys.
2. In the production SQL Editor, mark the database so volume seed cannot run:

```sql
ALTER DATABASE postgres SET maruti.environment = 'production';
```

3. Apply schema **only** as OPS-003, after staging has the same files.

### Repository guards already in place

- Volume seed raises `SEED_VOLUME_FORBIDDEN_IN_PRODUCTION` when `maruti.environment = 'production'`.
- `npm run bootstrap:admin` against a non-local URL requires `MARUTI_BOOTSTRAP_CONFIRM=YES`.
- `npm run ops:preflight` checks isolation files, signup config, and that no host vendor was silently added.

Live project creation still needs an operator Supabase account.

---

## OPS-003 — Apply migrations (after OPS-002)

In the production SQL Editor, paste **once**, in order:

1. `supabase/migrations/migration_01.sql`
2. `supabase/migrations/migration_02.sql`
3. `supabase/migrations/migration_03.sql`
4. `supabase/migrations/migration_04.sql`

Do not run `supabase/tests/harness.sql` in production. Do not edit applied migration files; add a new file for later changes. Database rollback is a **new forward migration** only.

## OPS-004 — Secrets on the host (after OPS-002)

Store on the deployment platform (provider is R-17), never in Git:

| Variable | Browser? |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (production project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | **Never** |

Optional bootstrap values stay on the operator machine, not in the Next.js client environment.

## OPS-007 — First production admin (after OPS-003)

```bash
MARUTI_BOOTSTRAP_CONFIRM=YES \
BOOTSTRAP_ADMIN_NAME="..." \
BOOTSTRAP_ADMIN_EMAIL="..." \
BOOTSTRAP_ADMIN_PASSWORD="..." \
npm run bootstrap:admin
```

Uses production env (URL + service-role). No public signup. Compensates Auth user if `users` insert fails (R-18).

## Later tasks (blocked)

| ID | Blocked by |
|---|---|
| OPS-005 Backups + restore drill | Live project + **R-17** retention |
| OPS-006 HTTPS deploy Next.js | Secrets on host + **R-17** hosting |
| OPS-008 Smoke prod | OPS-007 |
| OPS-009 Monitoring/logs | OPS-006 + **R-17** monitoring |
| OPS-010 DR/rollback runbook | OPS-005 |
| OPS-011 Tag `v1.0.0` | OPS-008 |

App-side HTTPS pieces already exist: HSTS and Secure cookies when `NODE_ENV=production`; CSP enforce on production builds. Host HTTP→HTTPS redirect is OPS-006.

Correlation ids and log redaction (Architecture §57) are already in `src/lib/api/logging.ts`. The only public API route is `GET /api/export/entries` (authz + rate limit). No debug endpoints.
