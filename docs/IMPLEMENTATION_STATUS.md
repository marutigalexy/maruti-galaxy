# Implementation status

**Project:** Maruti Galaxy  
**Updated:** 2026-08-17  
**Authority:** `docs/MASTER_IMPLEMENTATION_PLAN.md` §23

## Repository classification

Started empty (requirement documents and logo only). Phase 1 foundation is in place.

## Phase 0–1

| Task ID | Description | Result |
|---|---|---|
| FOUND-001 | Schema-affecting decisions | Locked in the Master Plan |
| FOUND-002 | Out-of-scope checklist | README |
| FOUND-003 | Traceability freeze | README |
| FOUND-004 | Next.js App Router + TypeScript | `next build` succeeds |
| FOUND-005 | `src/` module folders | Architecture §4 |
| FOUND-006 | Env split | `.env.example` |
| FOUND-007 | Secret gitignore | `.env.local` ignored |
| FOUND-008 | ESLint + TypeScript strict | Configured |
| FOUND-009 | CI + secret scan | `.github/workflows/ci.yml` |
| FOUND-010 | Environment plan | `docs/environments.md` |
| OPS-001 | Local runbook | README |

## Phase 2 — Database Foundation

Single schema file: `supabase/migrations/migration_01.sql`  
Run once in the Supabase SQL Editor on a fresh project.

| Task ID | Description | Result |
|---|---|---|
| DB-001 | Extensions + `set_updated_at` | In `migration_01.sql` |
| DB-002 | Enums | `user_role`, `job_type`, `job_status`, `invoice_status`, `entry_type` |
| DB-003 | `users` | PK=`auth.users.id`; name; unique lowercase email; no password columns |
| DB-004 | `parties` | mobile not unique; `price >= 0` |
| DB-005 | `employees` | mobile not unique; `commission >= 0` |
| DB-006 | `job_works` | unique lot; kapan NOT NULL; `weight numeric(14,3)` |
| DB-007 | `sub_jobs` | unique `(job_id, sequence_no)` |
| DB-008 | `sub_job_employee_work` | `done_than > 0`; commission/earning snapshots |
| DB-009 | `invoices` | unique number; unique `job_work_id` |
| DB-010 | `accounts` | unique name; opening_balance |
| DB-011 | `categories` | unique `(name, type)` |
| DB-012 | `entries` | FKs; `amount > 0` |
| DB-013 | allocations | FKs RESTRICT; `amount > 0`; no `updated_at` |
| DB-014 | `is_active_admin()` | SECURITY DEFINER; `search_path = public` |
| DB-015 | RLS | default deny; authenticated active admin only |
| DB-016 | Grants | anon revoked; authenticated granted |
| DB-017 | Views | display no, outstanding, balances, earnings, party outstanding |
| DB-018 | Lot/invoice generators | `J01`, `INV-0001` |
| DB-019 | `create_job_with_invoice` | atomic; server amount; client numbers ignored |
| DB-019A | `update_job_with_invoice_recalc` | recalc `than × price`; allocation/sub-job guards |
| DB-020 | `create_sub_job` | row lock; remaining Than |
| DB-021 | employee work RPCs | snapshot commission; status automation |
| DB-022 | `allocate_entry_to_invoices` | income only; remaining checks |
| DB-023 | Entry/category type trigger | mismatch rejected |
| DB-024 | Inactive account/category on INSERT | rejected |
| DB-025 | `sequence_to_alpha` | 1→A, 27→AA |
| DB-026 | TS types | `src/types/database.ts` |
| DB-027 | Apply on clean DB | `npm run db:verify` |
| QA-DB-001 | Constraint tests | passed on local Postgres |

### Verification this cycle

- `npm run db:verify` — PASS
- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm run secret-scan` — PASS
- `npm run build` — PASS

### Notes

- Requirement docs say “12 tables” but the named inventory is **11** public business tables. No extra table was invented.
- `supabase/tests/harness.sql` is **local/CI only** (stubs `auth.users` / roles). Do not run it in the Supabase SQL Editor.
- Docker/Supabase CLI is not running here. Hosted schema is applied by pasting `migration_01.sql` in the SQL Editor.

## Phase 3 — Authentication & Authorization

| Task ID | Description | Result |
|---|---|---|
| AUTH-001 | Browser Supabase client | `src/lib/supabase/browser.ts` — anon key only |
| AUTH-002 | Server Supabase client | Cookie session via `@supabase/ssr` |
| AUTH-003 | Admin client | `server-only` + `SUPABASE_SERVICE_ROLE_KEY` |
| AUTH-004 | `requireSession` | Throws `UNAUTHORIZED` |
| AUTH-005 | `requireActiveAdmin` | Inactive / missing / non-admin blocked |
| AUTH-006 | Route protection | `src/proxy.ts`; unauthenticated `/jobs` → `/auth/login` |
| AUTH-007 | Login UI | `/auth/login`; `/login` alias; generic errors |
| AUTH-008 | Logout confirm | Confirm Logout dialog |
| AUTH-009 | Session expiry | `SIGNED_OUT` redirects to login |
| AUTH-010 | Disable signup | Local `config.toml`; hosted dashboard still required |
| AUTH-011 | Bootstrap first admin | `npm run bootstrap:admin` |
| QA-AUTH-001 | Auth tests | 11 unit tests; secret scan |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (11)
- `npm run secret-scan` — PASS
- `npm run build` — PASS

## Phase 4 — Core Backend/API Infrastructure

No schema change. Shared Server Action infrastructure only. Module screens remain Phase 5+.

| Task ID | Description | Result |
|---|---|---|
| API-001 | Result/error types | `src/lib/api/result.ts` — `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTEGRITY`, `RATE_LIMIT`, `INTERNAL` |
| API-002 | Zod helpers | `src/lib/validation` — uuid, pagination, ISO dates, money/than/weight |
| API-003 | Pagination clamp | Default 20; max 100; UI allow-list 10/20/50/100 exported for later |
| API-004 | Safe error mapper | `src/lib/api/map-error.ts` — no SQL/stack to the client |
| API-005 | Correlation id | `x-request-id` stamped in `src/proxy.ts`; included in server logs |
| API-006 | Logging sanitizer | Redacts passwords, tokens, service-role keys, JWT-shaped strings |
| API-007 | Explicit select helper | `selectColumns()`; used by `requireActiveAdmin` |
| API-008 | Revalidation helpers | `MutationPaths` + `revalidateAuthSession` used by login/logout |
| QA-API-001 | Validation tests | Negatives, malformed UUID, huge page size rejected |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (36)
- `npm run secret-scan` — PASS
- `npm run build` — PASS

## Phase 5 — Core Shared UI System

Authenticated shell, design tokens, and reusable primitives. Module pages are empty shells with no fake KPIs or mock records.

| Task ID | Description | Result |
|---|---|---|
| UI-001 | Design tokens | PRD palette, type, space in `src/styles/tokens.css` + `src/lib/theme/tokens.ts` |
| UI-002 | AppShell | Navy sidebar, white topbar, page background `#F6F8FB` |
| UI-003 | Sidebar nav | D5 §7.2 items; nested Accounting/Reports; collapse; tooltips; logo on contrast plate |
| UI-004 | Topbar | Context title, name, email, logout |
| UI-005 | PageHeader | Title, description, optional primary action |
| UI-006 | Form controls | Button, Input, Select, DatePicker, Textarea, Checkbox |
| UI-007 | FormField | Required `*`, helper, error |
| UI-008 | Dialog + ConfirmDialog | Native modal focus; logout uses ConfirmDialog |
| UI-009 | DataTable | Caption, skeleton, empty, error+retry |
| UI-010 | Pagination | Prev/next disabled; page sizes 10/20/50/100 |
| UI-011 | FilterBar + SearchInput | Reset; 300ms debounce |
| UI-012 | StatusBadge | Text + color (never color-only) |
| UI-013 | Tabs | Accounting Entries / Accounts / Categories |
| UI-014 | Toast | Success/error; `aria-live` |
| UI-015 | Empty/Error/Loading | Reusable states; safe error copy |
| UI-016 | Login brand restyle | Logo, navy shell, FormField/Button |
| UI-017 | Responsive nav | Mobile drawer + scrim |
| UI-018 | Unsaved changes helper | `useUnsavedChanges` (`beforeunload`) |
| QA-UI-001 | Primitive a11y pass | Token hex isolation; nav labels; keyboard-ready controls; no `dangerouslySetInnerHTML` |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (43)
- `npm run secret-scan` — PASS
- `npm run build` — PASS

## Phase 6 — Users Module

Live Users CRUD against Auth + `public.users`. No password columns. Auth user is compensated if the profile insert fails.

| Task ID | Description | Result |
|---|---|---|
| MOD-USR-001 | Zod user schemas | name, email, password/confirm; extra fields stripped |
| MOD-USR-002 | UserService | list/create/profile/password/active; Auth then `users` insert; rollback on failure |
| MOD-USR-003 | Server actions | `listUsers`, `createUser`, `updateUserProfile`, `updateUserPassword`, `setUserActive`; re-authz inside |
| MOD-USR-004 | Users page table | Name, Email, Role, Status, Created, Actions; URL search/status/page |
| MOD-USR-005 | Create user dialog | name, email, password, confirm; Role shown as Admin |
| MOD-USR-006 | Password dialog | new + confirm only; never shows old password |
| MOD-USR-007 | Deactivate confirm | history preserved; Auth user not deleted; cannot deactivate self |
| QA-USR-001 | Users tests | schema + source checks for create/compensate/deactivate/password |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (52)
- `npm run secret-scan` — PASS
- `npm run build` — PASS

## Phase 7 — Master Data

Live Parties, Employees, Accounts, and Categories. JWT + RLS for `public` tables. No mock records. Party price and employee commission updates do not rewrite historical job or work rows. Account balances come from `v_account_balances`.

| Task ID | Description | Result |
|---|---|---|
| MOD-PTY-001 | Party Zod | company, mobile, price ≥ 0; extra fields stripped |
| MOD-PTY-002 | PartyService | list/search/status/CRUD/active/delete; `getParty` + `getPartySummary` |
| MOD-PTY-003 | Party actions | `createParty`, `updateParty`, `setPartyActive`, `deleteParty`; re-authz inside |
| MOD-PTY-004 | Parties list | Company, Contact, Mobile, Price (INR), Status, Actions; URL filters |
| MOD-PTY-005 | Create/edit dialog | required `*`; contact optional |
| MOD-PTY-006 | Deactivate/delete | RESTRICT copy if jobs or entries exist; `/parties/[partyId]` live summary |
| QA-PTY-001 | Party tests | required fields, extra-field strip, price isolation (no `job_works` update) |
| MOD-EMP-001 | Employee Zod+service+actions | name, mobile, commission ≥ 0; commission does not rewrite work |
| MOD-EMP-002 | Employees list+dialogs | Name, Mobile, Commission, Status, Actions |
| MOD-EMP-003 | Employee detail stub | live employee + `v_employee_earnings` + work history empty until jobs |
| QA-EMP-001 | Employee tests | required fields; commission persist on `employees` only |
| MOD-ACC-001 | Account Zod+service+actions | list from `v_account_balances`; unique name; R-23 |
| MOD-ACC-002 | Accounts tab/table | Opening, Total In, Total Out, Current Balance (derived) |
| MOD-ACC-003 | Account create/edit | signed opening balance; field disabled when `entry_count > 0` |
| MOD-ACC-004 | Account detail | balances from view; related entries live/empty until Entries module |
| QA-ACC-001 | Account tests | unique name; delete restrict; R-23 source check |
| MOD-CAT-001 | Category service+actions | unique `(name, type)`; type immutable if entries exist |
| MOD-CAT-002 | Categories tab UI | Name, Type, Status, Actions; delete hidden when linked |
| QA-CAT-001 | Category tests | unique name+type; type lock copy |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (68)
- `npm run secret-scan` — PASS
- `npm run build` — PASS

## Phase 8 — Core Jobs Workflow

Live jobs, sub-jobs, and employee work. Create is atomic with invoice via `create_job_with_invoice`. Than/Price edits recalculate invoice amount. Client lot numbers, commission, and earning are ignored.

| Task ID | Description | Result |
|---|---|---|
| MOD-JOB-001 | Job Zod | party, type, than>0, price≥0, kapan required, decimal weight; lot/invoice stripped |
| MOD-JOB-002 | JobService.create via RPC | `create_job_with_invoice`; lot+invoice assigned; amount=than×price |
| MOD-JOB-003 | list/get/update | search lot or J01-A; type/status/party/employee filters; R-12 recalc |
| MOD-JOB-004 | SubJobService RPC | `create_sub_job` + `update_sub_job` (migration_02); remaining Than |
| MOD-JOB-005 | EmployeeWorkService RPC | add/update/delete; client rates ignored; snapshot commission |
| MOD-JOB-006 | Job actions | all mutations re-authz + parseOrThrow |
| MOD-JOB-007 | Jobs list | search, type, status, party, employee, pagination, URL state |
| MOD-JOB-008 | `/jobs/new` | party default price; no lot input; kapan required; status picker |
| MOD-JOB-009 | Job detail hierarchy | remaining Than, sub-jobs, invoice, work |
| MOD-JOB-010 | Sub-job form | remaining Than shown; status picker; display J01-A |
| MOD-JOB-011 | Work form | same employee allowed twice; preview is not authoritative |
| MOD-JOB-012 | Status picker + badges | Pending/Progress/Completed on create/edit/list |
| MOD-JOB-013 | Edit Than/Price | Dedicated `/jobs/[jobId]/edit` (R-04 / D5 §8); invoice amount refreshed from server; allocation/sub-job guards |
| MOD-EMP-004 | Wire work history | employee detail shows lot/sub-job + snapshot commission |
| QA-JOB-001 | Job tests | schema + RPC source checks |
| QA-JOB-002 | Concurrency/remaining | second work post exceeding remaining rejected (SQL) |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (77)
- `npm run secret-scan` — PASS
- `npm run build` — PASS
- `npm run db:verify` — PASS (migration_01 + migration_02)

## Phase 9 — Invoice Read UX

Live invoice list, detail, outstanding, and chrome-free print. Invoices are created only with jobs (Phase 8). Amount, allocated, outstanding, and status are derived on the server. No tax, discount, due date, or invoice write APIs.

| Task ID | Description | Result |
|---|---|---|
| MOD-INV-001 | InvoiceService list/get/outstanding | JWT + RLS; `v_invoice_outstanding`; search number/lot; status/party/date filters |
| MOD-INV-002 | Invoices list | Number, Date, Lot, Party, Amount, Allocated, Outstanding, Status; View/Print |
| MOD-INV-003 | Invoice detail | DATE KAPAN LOT WEIGHT THAN RATE TOTAL; DESCRIPTION blank; live allocations |
| MOD-INV-004 | Print page v1 | `/invoices/[id]/print` outside AppShell; R-16 recommended mapping |
| QA-INV-001 | Invoice tests | 1:1 job; amount formula; no tax fields; no create/update/delete invoice |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (85)
- `npm run secret-scan` — PASS
- `npm run build` — PASS

## Phase 10 — Entries & Allocations

Live income/expense entries, filtered summary, CSV export, and invoice allocations. Amount and type cannot change while allocations exist. Expense cannot allocate. Account balances stay derived from `v_account_balances`.

| Task ID | Description | Result |
|---|---|---|
| MOD-ENT-001 | Entry Zod+service+actions | filters + summary; JWT + RLS; extra payment fields stripped |
| MOD-ENT-002 | Entries table+summary+filters+export | Net = Income − Expense; `/api/export/entries` cap 5000 |
| MOD-ENT-003 | Add Income/Expense dialogs | category filtered by type; inactive account/category hidden |
| MOD-ENT-004 | Edit/delete entry | R-22 confirm; allocated rows cannot change amount/type or delete |
| MOD-ALC-001 | Allocation RPC service | `allocate_entry_to_invoices`; remaining checks |
| MOD-ALC-002 | Allocation UI | 1:N from income entry; N:1 from invoice; remaining shown |
| MOD-ACC-005 | Account detail entries live | date/type/category filters; pagination |
| QA-ENT-001 | Entry+allocation tests | type/amount rules; expense blocked by RPC; over-alloc mapped |
| QA-ENT-002 | Balance after CUD | entries write `entries`; balances remain the view |
| API-EXP-001 | CSV export route | authz; same filters; no-store; cap |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (95)
- `npm run secret-scan` — PASS
- `npm run build` — PASS

## Phase 11 — Reports & Dashboard

Live reports and dashboard from the same job, invoice, work, and entry records as the modules. No report tables. P&L is Income − Expense for the selected dates. Entry ledger does not invent a running balance across accounts. Dashboard income/expense are the current calendar month (`Asia/Kolkata`); other KPIs are all-time. CSV export remains `GET /api/export/entries` only.

| Task ID | Description | Result |
|---|---|---|
| MOD-RPT-001 | ReportService methods | Job work, salary, P&L, party ledger; entry/outstanding/entry-ledger reuse `listEntries` / `listInvoices` |
| MOD-RPT-002 | Job report page | `/reports/jobs` — lot, party, type, than, price, kapan, weight, status, sub-job count, Done Than, date |
| MOD-RPT-003 | Entry report page | `/reports/entries` — same filters as Entries; CSV via `/api/export/entries` |
| MOD-RPT-004 | Outstanding report | `/reports/outstanding` — `v_invoice_outstanding` through InvoiceService |
| MOD-RPT-005 | Salary report | Earned from `sub_job_employee_work`; paid from Expense entries with `employee_id` |
| MOD-RPT-006 | P&L report | Income − Expense; extra P&L lines stripped |
| MOD-RPT-007 | Party ledger | Chronological invoices, allocations, and party entries; party required |
| MOD-RPT-008 | Entry ledger | Same entry source; no cross-account running balance |
| MOD-DSH-001 | DashboardService aggregations | Job counts (`head: true`); than/earnings/outstanding/month sums; recents `.limit(8)` |
| MOD-DSH-002 | Dashboard UI KPIs+recents | `/dashboard` KPIs click through to modules; This month vs All time |
| QA-RPT-001 | Report vs module totals | Source checks: same services/views; no admin client; no invented running balance |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (101)
- `npm run secret-scan` — PASS
- `npm run build` — PASS

## Phase 12 — Security Hardening

Production headers, CSP (report-only in development, enforce in production), HSTS on production builds, Secure cookies in production, login/export rate limits, `npm audit`, client bundle secret scan, and IDOR/XSS/SQLi suites. HTTPS host redirect remains Phase 15 OPS-006.

| Task ID | Description | Result |
|---|---|---|
| SEC-001 | Security headers | CSP report-only (dev), HSTS (prod), XCTO, Referrer-Policy, Permissions-Policy via `next.config` + `src/proxy.ts` |
| SEC-002 | CSP enforce after test | Production builds send `Content-Security-Policy` (not report-only). `unsafe-inline` kept so Next.js + Supabase still work |
| SEC-003 | Login rate limit | 10 POSTs / 15 min / IP in proxy and `loginAction` |
| SEC-004 | Export rate limit | 20 requests / 15 min / IP on `GET /api/export/entries` in proxy; 429 JSON |
| SEC-005 | Cookie Secure prod | Shared `sessionCookieOptions`; `Secure` only when `NODE_ENV=production`; HttpOnly + SameSite=Lax |
| SEC-006 | Dependency audit | `npm run audit` (`npm audit --audit-level=high`) in CI |
| SEC-007 | IDOR suite | Job/invoice get-by-id uses UUID + `requireActiveAdmin`; `J01` / `INV-0001` rejected as ids |
| SEC-008 | XSS/SQLi suite | No `dangerouslySetInnerHTML`; `escapeIlike`; UUID/search reject injection payloads |
| SEC-009 | Bundle secret scan | `npm run bundle-scan` after build; `.next/static` must not contain service-role material |
| QA-SEC-001 | Security acceptance §70 | `docs/SECURITY_ACCEPTANCE.md` — automated evidence; business UAT remains QA-005 |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (109)
- `npm run secret-scan` — PASS
- `npm run audit` — PASS (0 vulnerabilities)
- `npm run build` — PASS
- `npm run bundle-scan` — PASS

## Phase 13 — Testing / QA (full)

Playwright critical-path spec (Section 14), responsive and accessibility passes, CI regression pack, and a business UAT script. Live browser E2E is skipped until staging admin credentials exist. Master Plan Req pointers D5 §33/§34 map to Frontend §43 Responsive and §42 Accessibility (section numbers drifted; task descriptions were followed).

| Task ID | Description | Result |
|---|---|---|
| QA-001 | E2E critical path | `e2e/critical-path.spec.ts` — login → masters → job+invoice → sub-job → work → income allocate → salary expense → dashboard/outstanding/P&L → logout |
| QA-002 | Responsive pass | Drawer ≤1024px; stacked filters/KPIs ≤768px; table overflow; Playwright 390/820 viewports |
| QA-003 | A11y pass | `aria-describedby` / `aria-invalid` on fields; focus-visible; named icon actions; status text+color; table captions |
| QA-004 | Regression pack CI | `npm run qa:regression`; unit+db jobs always; Playwright job when `E2E_ADMIN_EMAIL` secret is set |
| QA-005 | UAT with business | `docs/UAT_CHECKLIST.md` — PRD §31 + critical path; business signature pending |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (114)
- `npm run secret-scan` — PASS
- `npm run audit` — PASS (0 vulnerabilities)
- `npm run build` — PASS
- `npm run bundle-scan` — PASS
- `npm run test:e2e` — skipped locally (no live admin credentials)

## Phase 14 — Performance

Staging volume seed, EXPLAIN ANALYZE of list queries, dashboard SQL aggregation, and a decision not to add list virtualization. Phase 2 B-tree indexes were sufficient at 1k jobs / 5k entries. No trigram/GIN indexes added.

| Task ID | Description | Result |
|---|---|---|
| PERF-001 | Seed 1k/5k volume staging | `supabase/seeds/seed_staging_volume.sql` — `create_job_with_invoice` + 5k entries; marker `SEED-VOLUME-*`; never production |
| PERF-002 | EXPLAIN ANALYZE list queries | `supabase/tests/qa_perf.sql` + `npm run db:perf`; existing B-tree indexes; no extra indexes |
| PERF-003 | Dashboard query budget | `dashboard_kpis(date, date)` in `migration_03.sql`; JWT service RPC; recents still `.limit(8)` |
| PERF-004 | FE list virtualization | Not added. DataTable stays paginated (max 100). 1k/5k did not justify a virtualizer |

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (117)
- `npm run secret-scan` — PASS
- `npm run audit` — PASS (0 vulnerabilities)
- `npm run db:verify` — PASS (migration_01 + migration_02 + migration_03)
- `npm run db:perf` — PASS (1000 jobs / 5000 entries; list queries < 1ms; `dashboard_kpis` 4ms; Phase 2 indexes used; no extra indexes)
- `npm run build` — PASS
- `npm run bundle-scan` — PASS

### Notes

- Hosted/staging must apply `migration_01.sql`, then `migration_02.sql`, then `migration_03.sql`, then `migration_04.sql`.
- Run the volume seed only on local or staging. Production seed remains system defaults (Database §74).
- Dashboard income/expense remain the current calendar month (`Asia/Kolkata`); other KPIs remain all-time.

## Phase 15 — Production (DEFERRED)

OPS-002 repository isolation remains in the repo. Live production infrastructure is **not** in the current development scope. These are deferred, not failed.

| Task ID | Description | Status |
|---|---|---|
| OPS-002 | Prod isolation (repository) | Complete in repo. Live project not created. |
| OPS-003 | Apply migrations prod | **DEFERRED** until production phase |
| OPS-004 | Secrets on host | **DEFERRED** until production phase |
| OPS-005 | Backups + restore drill | **DEFERRED** until production phase |
| OPS-006 | HTTPS deploy Next.js | **DEFERRED** until production phase (app HSTS/Secure cookies already exist) |
| OPS-007 | Bootstrap prod admin | **DEFERRED** until production phase |
| OPS-008 | Smoke prod | **DEFERRED** until production phase |
| OPS-009 | Monitoring/logs | **DEFERRED** until production phase (correlation ids + redaction already exist) |
| OPS-010 | Runbook DR/rollback | **DEFERRED** until production phase |
| OPS-011 | Tag v1.0.0 | **DEFERRED** until production phase |

R-17 (hosting / monitoring / backup vendor) is postponed with this phase. It does not block application development.

## Phase 8 follow-up — Dedicated job edit route

R-04 and Frontend §8 require `/jobs/[jobId]/edit`. Edit was previously a dialog on the job detail page. The dedicated route is now live. `updateJob` / `update_job_with_invoice_recalc` are unchanged.

| Task ID | Description | Result |
|---|---|---|
| MOD-JOB-013 | Dedicated Edit Job screen | `/jobs/[jobId]/edit`; lot/party read-only; Than/Price/status/kapan/weight editable; unsaved-changes guard; invoice amount from server after save |

### Files changed

- `src/app/(dashboard)/jobs/[jobId]/edit/page.tsx`
- `src/components/jobs/job-edit-form.tsx`
- `src/components/jobs/job-detail-view.tsx`
- `src/components/jobs/jobs-view.tsx`
- `src/lib/navigation/nav.ts`
- `src/lib/validation/jobs.test.ts`
- `src/lib/theme/ui.test.ts`

### Database changes

None.

### APIs changed

None. Same `updateJobAction` + `update_job_with_invoice_recalc`.

### Security

`requireActiveAdmin` on the edit page. JWT + RLS. Lot remains immutable. UUID id required.

### Tests

See verification below.

### Verification this cycle

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (122)
- `npm run secret-scan` — PASS
- `npm run audit` — PASS (0 vulnerabilities)
- `npm run build` — PASS
- `npm run bundle-scan` — PASS

## Deferred production work

OPS-003 through OPS-011 remain deferred. Do not treat them as failed.

## Next

QA-005 business UAT sign-off remains pending and is not a code task. Next code gap after this route: breadcrumb labels still show “Detail” for UUID segments instead of lot/invoice numbers (Master Plan §11.1).


