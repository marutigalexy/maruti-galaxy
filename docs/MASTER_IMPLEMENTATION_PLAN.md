# MASTER IMPLEMENTATION PLAN

**Project:** Maruti Galaxy  
**Product:** Diamond polishing and cutting / job-work operations management system  
**Stack:** Next.js (App Router) + TypeScript + Supabase Auth + PostgreSQL  
**Status:** Implementation-ready baseline  
**Prepared:** 2026-08-15  
**Authority:** Unified from PRD, Architecture, Database, Security, and Maruti Galaxy Frontend Requirements  

**Product decisions locked 2026-08-15:** auto Lot Number; atomic invoice numbers; decimal weight `numeric(14,3)`; required Kapan; Than/Price **editable** after invoice (invoice amount recalculated); status **picker**; mobile **not unique**; `users.name` + `users.email`.  

**This document is the executable engineering roadmap.** Developers should take the next backlog item and implement it without re-deriving architecture, schema, security, or UI behavior from the source documents. Source documents remain the requirement authority; this plan is the implementation authority.

---

## 1. Executive Summary

Maruti Galaxy is a single-tenant, Admin-operated business system for diamond job-work. The core lifecycle is:

```text
Party → Main Job (Lot) → Sub Jobs → Employee Work → Earnings
                                      ↓
                                 Invoice (1:1 with Main Job)
                                      ↓
                         Income Entry → Invoice Allocations
                                      ↓
                    Accounts / Categories / Outstanding / Ledger / P&L
```

The system has **12 PostgreSQL tables**, **one initial role (`admin`)**, **no materials/GST/discount/inventory**, and **no application-stored passwords**.

Implementation must be **database-first, security-by-design, and vertical-slice thereafter**. Shared infrastructure (auth, RLS, design system, validation, Server Actions) is completed before module screens. Invoice creation is **atomic with job creation**, so Invoice persistence is not a later “billing phase” after jobs exist in production use — the job-create transaction includes the invoice.

The critical path is:

```text
Foundation → Schema/RLS → AuthZ → Shared UI
  → Parties + Employees + Accounts + Categories
  → Atomic Job+Invoice → Sub Jobs → Employee Work
  → Entries + Allocations
  → Outstanding / Reports / Dashboard
  → Hardening → QA → Production
```

**Do not start coding until Phase 0 schema-affecting decisions are written into this plan.** Those decisions are now **accepted** in Section 5. Schema work may proceed.

---

## 2. Documents Analyzed

| ID | Document | File | Authority |
|---|---|---|---|
| D1 | Product Requirements Document | `Maruti_Galaxy_PRD.md` | Business scope, workflows, rules, terminology, out-of-scope |
| D2 | Architecture Requirements | `Maruti_Galaxy_Architecture_Requirements.md` | App structure, services, server/client split, data access, deployment shape |
| D3 | Security Requirements | `Maruti_Galaxy_Security_Requirements.md` | AuthN/AuthZ, RLS, secrets, integrity, testing gates |
| D4 | Database Requirements | `Maruti_Galaxy_Database_Requirements.md` | Tables, columns, constraints, indexes, functions, migration order |
| D5 | Frontend Requirements | `Maruti_Galaxy_Frontend_Requirements.md` | Screens, routes, brand, UX states, module UI, print, users UI |

**Superseded (do not implement from):**

- `Frontend_UI_UX_Requirement_Document.md` — generic ERP template (quotations/GST/orders). Replaced by D5.

**Supporting (non-authoritative):**

- `admin_sidebar_ui_guide.md` — useful interaction notes (collapse, logout confirm). Visual tokens **must not** override PRD palette.
- `ACCOUNTING_MODULE_REDESIGNED_FINAL_TECHNICAL_AND_PROMPT.md` — useful Entries/Accounts/Categories tab UX detail that aligns with PRD §16–18. Use only where it does not contradict D1–D5.

**Governing rule when documents disagree:** flag the conflict (Section 4). Do not silently pick a side. Where a safe technical mapping preserves business intent, it is recorded as `[TECHNICAL RESOLUTION]` in Section 5.

---

## 3. Unified System Understanding

### 3.1 What we are building

An authenticated internal operations platform for **one business (Maruti Galaxy)** in which an **Admin**:

- Manages parties (customers) and employees
- Creates main jobs with **auto-generated Lot Numbers** (`J01`, `J02`, …)
- Splits jobs into sub-jobs displayed as `J01-A`, `J01-B`
- Records employee **Done Than** against sub-jobs, snapshotting commission and earning
- Auto-creates **one invoice per main job** with `amount = than × price`
- Records unified **Income/Expense entries** against **Accounts** and typed **Categories**
- Allocates Income entries to invoices (1:N and N:1)
- Views outstanding, salary earned vs paid, ledgers, P&L, and dashboard KPIs

### 3.2 What we are explicitly not building

From PRD §4 and Database §§61–69:

- Materials / inventory tables or screens
- GST, tax, discount, invoice due date, subtotal/total_amount split
- Payment method / reference number on entries
- Separate expense, expense-category, employee-earnings, payment, transaction, or invoice-item tables
- Multiple jobs on one invoice, or multiple invoices on one job
- Application password hashes in `users`
- Public/unauthenticated business pages
- File-upload subsystem (not specified; do not invent)
- Offline sync (Frontend §45 is generic; Architecture does not support offline)
- Roles beyond `admin` in this baseline (design must remain extensible)

### 3.3 Authoritative terminology

| Business concept | System term | Persistence |
|---|---|---|
| Main job identifier | Lot Number | `job_works.lot_number` |
| Quantity | Than | `than` / `done_than` |
| Sub-job identifier | `J01-A` display | derived from `lot_number` + `sequence_no` |
| Employee completed qty | Done Than | `sub_job_employee_work.done_than` |
| Employee rate | Commission | snapshotted on work row |
| Calculated amount | Earning | `done_than × commission` stored |
| Financial record | Entry | `entries` |
| Money account | Account | `accounts` |
| Classification | Category | `categories` |
| Application profile | User | `users` (not `profiles`) |

### 3.4 Cross-document dependency model (how a requirement becomes software)

```text
Business Requirement (PRD)
  → Entity/constraint (Database)
  → Domain service + Server Action (Architecture)
  → AuthN/AuthZ/RLS (Security)
  → Route + screen + UX states (Frontend)
  → Tests (all layers)
  → Production control (Architecture + Security)
```

Example — “Sub-job Than cannot exceed remaining main-job Than”:

| Layer | Implementation |
|---|---|
| PRD | §10 Quantity Rule |
| Database | CHECK + transactional function `create_sub_job()` with row lock |
| Backend | `SubJobService.createSubJob()` validates remaining Than |
| AuthZ | Active admin only; UUID-based object access |
| Frontend | Sub-job form shows remaining Than; inline error; submit disabled while pending |
| Tests | Concurrent over-allocation rejected; UI error copy; DB invariant holds |
| Security | Race-condition test; IDOR test; negative Than rejected |

---

## 4. Requirement Consistency Audit

### A. Contradictions

#### C-01. Party / Account / Category “status” vs `is_active`

- **Issue:** PRD party fields omit `is_active`. PRD accounts/categories use `status`. Database/Security persist `is_active` boolean.
- **Documents:** D1 vs D4/D3
- **Risk:** Schema drift; UI showing “Status” against a missing column; delete vs deactivate confusion.
- **Resolution:** `[TECHNICAL RESOLUTION]` — persist `is_active`. UI label is **Status: Active / Inactive**. See R-01.

#### C-02. Invoice status values not defined in PRD

- **Issue:** PRD `invoices.status` has no enum. Database defines `Unpaid | Partially Paid | Paid`.
- **Documents:** D1 §14 vs D4 §17/§29
- **Risk:** Ad-hoc status strings; reports disagree with list pages.
- **Resolution:** `[TECHNICAL RESOLUTION]` — use Database enum. Status is **derived** from allocations, not freely typed. See R-02.

#### C-03. Generic frontend template vs Maruti Galaxy frontend

- **Issue:** `Frontend_UI_UX_Requirement_Document.md` described Customers, Quotations, Orders, GST. The approved frontend is now `Maruti_Galaxy_Frontend_Requirements.md`.
- **Documents:** old FE vs D1 / new D5
- **Risk:** Building excluded modules.
- **Resolution:** `[TECHNICAL RESOLUTION]` — **D5 is the only frontend authority.** Ignore the generic ERP template. See R-03.

#### C-04. Security mentions `/admin/*`; Architecture uses `/dashboard`, `/jobs`, …

- **Issue:** Route namespace mismatch.
- **Documents:** D3 §21 vs D2 §10
- **Risk:** Middleware protecting the wrong paths; unauthenticated access.
- **Resolution:** `[TECHNICAL RESOLUTION]` — Architecture routes are authoritative. Protect all authenticated app routes except `/auth/login`. See R-04.

#### C-05. PRD “status” on jobs vs Architecture “manual editing not allowed unless later required”

- **Issue:** PRD lists Status as a job field; Architecture previously deferred the picker.
- **Documents:** D1 §9/§12 vs D2 §19
- **Risk:** Two sources of status.
- **Resolution:** `[ACCEPTED]` — status picker is required (R-05). Quantity automation may still advance status; Admin may set it explicitly.

#### C-06. Sidebar guide palette vs PRD brand palette

- **Issue:** `admin_sidebar_ui_guide.md` uses `#0F172A` / generic dark SaaS. PRD specifies Deep Navy `#0B1F3A` and named tokens.
- **Documents:** supporting guide vs D1 §23
- **Risk:** Visual identity drift.
- **Resolution:** `[TECHNICAL RESOLUTION]` — PRD tokens win. Sidebar guide collapse/tooltip/logout-confirm behaviors may be used. See R-06.

#### C-07. Users identity fields

- **Issue:** Earlier DB/Security `users` rows omitted `name` and `email`, while UI needs a human identifier.
- **Documents:** D4/D3 vs D5 §31
- **Risk:** Unusable Users module or invented password columns.
- **Resolution:** `[PRODUCT DECISION]` — `public.users` now includes required `name` and unique lowercase `email`. Still **no password columns**. Auth owns credentials. See R-07.

#### C-08. Account list “Status” vs `is_active`

- **Issue:** Same as C-01 for accounts.
- **Resolution:** covered by R-01.

### B. Missing dependencies

#### M-01. Lot Number generation vs entry

- **Status:** **ACCEPTED** — auto-generate atomically (`J01`, `J02`, …). See R-08.
- **Implementation:** `next_lot_number()` inside `create_job_with_invoice()`. Unique constraint remains. UI does not collect Lot Number.

#### M-02. Invoice number format

- **Status:** **ACCEPTED** — atomic generator `INV-0001`, `INV-0002`, …. See R-09.

#### M-03. Numeric precision

- **Status:** **ACCEPTED** — weight is decimal via `numeric(14,3)` (not IEEE float). Money `numeric(14,2)`; than `numeric(14,3)`. See R-10.

#### M-04. Kapan Number required vs optional

- **Status:** **ACCEPTED** — required `NOT NULL`. See R-11.

#### M-05. Job Than/Price mutation after invoice exists

- **Status:** **ACCEPTED** — Than and Price remain **editable**. Invoice `amount` is recalculated atomically as `than × price`. Reject if new amount < allocated income, or new than < sum of sub-job Than. See R-12.

#### M-06. Party/employee mobile uniqueness

- **Status:** **ACCEPTED** — **not unique**. Required fields, search indexes only. See R-13.

#### M-07. Zero job/party price allowed?

- **Status:** remains `[TECHNICAL RESOLUTION]` R-14 (`>= 0` allowed) unless product later forbids zero.

#### M-08. Exact report columns and P&L presentation

- **Gap:** D1 §21/§30.4–5.
- **Risk:** Building the wrong report UI twice.
- **Resolution:** `[DECISION REQUIRED]` — recommended R-15 (v1 columns from source entities; no extra accounting concepts).

#### M-09. Invoice print template / sample row meaning

- **Gap:** D1 §30.1/30.6/30.7; D2 §63/§66.3–4.
- **Risk:** Print layout that does not match business invoices.
- **Resolution:** `[DECISION REQUIRED]` — recommended R-16 (operational invoice first; print as a follow-on using sample field names).

#### M-10. Backup/retention, hosting, monitoring providers

- **Gap:** D1 §30.8; D2 §66.8–10; D3 §68; D4 §72.
- **Resolution:** `[DECISION REQUIRED]` — recommended R-17. **Blocks production go-live, not schema.**

#### M-11. User creation bootstrap

- **Gap:** No specified “first admin” process. Auth user and `users` row must both exist.
- **Risk:** Empty app; chicken-and-egg.
- **Resolution:** `[TECHNICAL RESOLUTION]` R-18.

#### M-12. `created_by` / actor audit

- **Gap:** Security §41 says `created_at`/`updated_at` only; no audit-log table. New D5 §55 requires distinguishing current master values from historical snapshots, not an actor audit trail.
- **Risk:** Building a fake actor-history UI with no data.
- **Resolution:** `[TECHNICAL RESOLUTION]` R-19 — no audit-log table in v1; implement historical-vs-current labeling only.

### C. Ambiguous requirements

| ID | Ambiguity | Impact | Handling |
|---|---|---|---|
| A-01 | Status picker vs quantity automation | Both exist | R-05: picker on create/edit; automation may still advance |
| A-02 | Can employee work be edited/deleted after status Completed? | Integrity | R-20 |
| A-03 | Can invoices be edited/deleted? Architecture lists `updateInvoice`/`deleteInvoice` | Financial integrity | R-21 |
| A-04 | Entry update after allocations exist | Outstanding | R-22 |
| A-05 | Opening balance change after entries exist | Account balance rewrite | R-23 |
| A-06 | Sub-job weight vs main-job weight relationship | No rule given | R-24 — independent fields, no sum constraint |
| A-07 | Description field on invoice sample vs schema (no description column) | Print mapping | R-16 |
| A-08 | Pagination page size | Security max 100 | R-25 |
| A-09 | Currency symbol/locale | Financial display | R-26 |
| A-10 | Timezone for `date` fields | Invoice/entry dates | R-27 |

### D. Duplicate requirements

These are **intentional multi-layer duplicates** (UI + server + DB), not waste. Implement once per layer:

- Than allocation invariants (PRD, Arch, DB, Sec)
- Commission snapshot (PRD, Arch, DB, Sec)
- Category type = entry type (PRD, Arch, DB, Sec)
- One job one invoice (PRD, Arch, DB)
- Derived account balance / outstanding (PRD, Arch, DB)
- Pagination/search server-side (PRD, Arch, Sec, FE)
- No password in `users` (PRD, Arch, Sec, DB)

**Do not create a second earnings table “for reports.”** Duplicate *enforcement* is required; duplicate *storage* is forbidden.

### E. Requirements that conflict with database design

- Frontend GST/tax/discount fields — **forbidden** by D4 §§68–69.
- Frontend “email/address” on parties — **not in schema**. Do not add.
- Architecture `InvoiceService.updateInvoice/deleteInvoice` vs D4 deletion restrictions — resolve via R-21.
- PRD party field list missing `is_active` — DB has it (R-01).

### F. Requirements that conflict with architecture

- Building a public REST API for every query contradicts D2 §33 (Server Actions for internal mutations; Route Handlers for export/print).
- Client-side aggregation of dashboard/P&L contradicts D2 §2.4 / §58.
- Generic Frontend “global store for all server state” contradicts D2 server-component default.

### G. Requirements that conflict with security

- Client-only remaining-Than checks.
- Accepting `commission` / `earning` / `invoice.amount` from the browser as authority (D3 §§37–39).
- Using Lot Number / invoice number as an access token (D3 §§15–18).
- Broad RLS `authenticated can do everything` (D3 §6).
- `NEXT_PUBLIC_` service role (D3 §7).

### H. Frontend requirements needing backend/database support

Every Maruti Galaxy screen needs a server data source. High-risk ones:

| UI need | Required backend |
|---|---|
| Party price autofill on job create | `getParty()` returning `price` |
| Remaining main-job Than | aggregated sub-job Than |
| Remaining sub-job Than | aggregated `done_than` |
| Job search `J01-A` | derived display identifier query/view |
| Employee job filter | join work → sub-job → job |
| Account current balance | derived aggregation |
| Entry summary (Income/Expense/Net/Count) | filtered aggregation, not client reduce of one page |
| Outstanding | invoice − allocations |
| Invoice allocation UI | remaining entry + remaining invoice |
| Users list | `users.name`, `users.email` |
| Dashboard KPIs | dedicated aggregation queries |
| Export | authenticated Route Handler, same filters as UI |

### I. Database requirements needing frontend/backend workflows

| DB rule | Required workflow |
|---|---|
| Cannot delete account/category with entries | UI: deactivate; API: reject delete |
| Cannot use inactive account/category | Dropdowns exclude inactive; server re-checks |
| Restrictive FKs (no cascade on finance) | Delete UX must explain blockage |
| Atomic `create_job_with_invoice` | Single submit, not two client calls |
| Allocation locks | Allocation dialog must handle conflict errors |
| Unique `lot_number` / `invoice_number` | Map unique-violation to business error copy |

### J. Security that cannot be bolted on later

Must be in the first implementation of each layer:

- Supabase Auth session cookies (HttpOnly/Secure/SameSite)
- Server-side session + active-user + role check on **every** mutation
- RLS enabled **before** any table is queried from the app
- Zod (or equivalent) validation on every Server Action
- UUID object authorization (no Lot-number auth)
- Transactional quantity and allocation functions
- Server-computed commission snapshot and invoice amount
- Pagination max page size
- Safe error mapping
- No service-role in client bundles
- Explicit column selection (no `SELECT *` on sensitive responses)

---

## 5. Resolved Decisions

Use these as the implementation baseline. Schema-affecting items R-05, R-07–R-13 are **product-accepted**.

| ID | Topic | Type | Decision |
|---|---|---|---|
| R-01 | Active flag | `[TECHNICAL RESOLUTION]` | Persist `is_active boolean not null default true` on `users`, `parties`, `employees`, `accounts`, `categories`. UI displays Status Active/Inactive. Deactivate rather than hard-delete when history exists. |
| R-02 | Invoice status | `[TECHNICAL RESOLUTION]` | Enum display labels `Unpaid \| Partially Paid \| Paid`. Derived from allocations (D4 §29). Do not allow manual status editing. |
| R-03 | Frontend authority | `[TECHNICAL RESOLUTION]` | Implement only `Maruti_Galaxy_Frontend_Requirements.md`. Do not implement Quotations, Orders, GST, or other generic-ERP screens. |
| R-04 | Routes | `[ACCEPTED from D5 §8]` | `/auth/login`, `/dashboard`, `/jobs`, `/jobs/new`, `/jobs/[jobId]`, `/jobs/[jobId]/edit`, `/parties`, `/parties/[partyId]`, `/employees`, `/employees/[employeeId]`, `/invoices`, `/invoices/[invoiceId]`, `/invoices/[invoiceId]/print`, `/accounting`, `/accounting/entries`, `/accounting/accounts`, `/accounting/accounts/[accountId]`, `/accounting/categories`, `/reports`, `/users`. No `/admin` prefix. `/login` may alias `/auth/login`. |
| R-05 | Job/sub-job status | `[ACCEPTED]` | **Status picker** on create and edit for main jobs and sub-jobs. Values: Pending, Progress, Completed. Default: Pending. Quantity automation may still set Pending→Progress on first work and Completed when remaining Than is 0. Admin may also set any of the three values explicitly. Quantity invariants do not depend on status. |
| R-06 | Brand tokens | `[TECHNICAL RESOLUTION]` | PRD / D5 §5.4 palette. Logo prominent on login, sidebar, print. Semantic green/amber/red only for states. |
| R-07 | User identity | `[ACCEPTED]` | `users.name` text NOT NULL; `users.email` text NOT NULL UNIQUE stored lowercase. Topbar and Users list show name + email. Password updates via Supabase Auth APIs server-side. No password columns. Create user writes Auth + `users` together. |
| R-08 | Lot Number | `[ACCEPTED]` | **Auto-generate** atomically as `J` + sequence zero-padded to ≥2 digits (`J01`, `J02`, … `J100`). `UNIQUE (lot_number)`. Immutable after insert. UI does not collect or preview the next number. Generator: `next_lot_number()` inside `create_job_with_invoice()`. |
| R-09 | Invoice number | `[ACCEPTED]` | **Atomic generator** `INV-` + sequence zero-padded to ≥4 digits (`INV-0001`, …). Unique and immutable. `next_invoice_number()` inside the same job-create transaction. |
| R-10 | Numeric precision | `[ACCEPTED]` | Product: weight must accept decimal values. Store weight as `numeric(14,3)` **not** `float`. Money/price/commission/earning/amount/opening_balance/allocation = `numeric(14,2)`. Than/done_than = `numeric(14,3)`. Server/DB calculate invoice amount and earning. Display weight up to 3 dp with `ct`. |
| R-11 | Kapan Number | `[ACCEPTED]` | Required `text NOT NULL`. Separate from Lot Number. Required on create-job form. |
| R-12 | Edit job Than/Price after invoice | `[ACCEPTED]` | Than and Price **remain editable**. Same transaction: recalc `invoices.amount = than × price`; re-derive invoice status; **reject** if new amount < allocated income or new than < sum(sub_job.than). Lot/invoice numbers stay immutable. UI must refresh invoice amount after save. |
| R-13 | Mobile uniqueness | `[ACCEPTED]` | Party and employee mobile are required and **not unique**. Index for search only. Do not add UNIQUE. |
| R-14 | Zero price | `[TECHNICAL RESOLUTION]` | `price >= 0` and `commission >= 0` allowed; `than`, `done_than`, `entries.amount`, allocation `amount` must be `> 0`. |
| R-15 | Report columns v1 | `[DECISION REQUIRED]` | **Recommended:** use Section 13 report column sets derived from D4 §71. No extra P&L lines (no COGS, depreciation, etc.). P&L = Income − Expense for date range. |
| R-16 | Invoice print | `[DECISION REQUIRED]` | **Recommended:** ship operational invoice screens first. Print view v1 maps: DATE=`invoice_date`, KAPAN=`job.kapan_number`, LOT=`lot_number`, WEIGHT=`job.weight`, THAN=`job.than`, RATE=`job.price`, TOTAL=`invoice.amount`. DESCRIPTION: **no DB column** — leave blank or use job_type until product supplies copy. Do **not** invent invoice line-items from sub-jobs unless product confirms sample rows are sub-jobs. |
| R-17 | Hosting/backup | `[DECISION REQUIRED]` | **Recommended:** Vercel (or equivalent) for Next.js; Supabase hosted Postgres+Auth; PITR/backups enabled on paid Supabase; retention 14–30 days until legal policy exists. Monitoring: Vercel + Supabase logs minimum. |
| R-18 | First admin | `[TECHNICAL RESOLUTION]` | Seed/bootstrap script: create Auth user + matching `users` row with `name`, `email`, `role=admin`, `is_active=true`. Documented in runbook. No public signup. |
| R-19 | Audit log | `[TECHNICAL RESOLUTION]` | No `audit_logs` table in v1. Timestamps only. D5 §55: label current vs historical master values. Do not build actor-history UI. |
| R-20 | Employee work mutations | `[DECISION REQUIRED]` | **Recommended:** update/delete allowed only while resulting Done Than still `<= sub_job.than`; commission/earning on update are **recalculated from stored snapshot commission** (do not refresh from current employee commission — history stays). If product prefers freeze after Completed, that is a later tightening. |
| R-21 | Invoice update/delete | `[DECISION REQUIRED]` | **Recommended:** no amount/number/job_work_id edits. Delete blocked if any allocation exists. Delete of unpaid invoice **and** its job is a restricted/disabled path in v1 (job+invoice are created together; prefer correcting via allowed job field edits). Architecture method names remain, but update is metadata-only if anything; delete is blocked by default. |
| R-22 | Entry update/delete | `[TECHNICAL RESOLUTION]` | Update amount/type blocked if allocations exist, unless allocations are reversed first. Delete blocked if allocations exist. Unallocated entries may be updated/deleted with revalidation (category match, active account on create only; historical inactive account remains on existing row). |
| R-23 | Opening balance | `[TECHNICAL RESOLUTION]` | Editable only when account has **zero** entries. Afterwards, reject opening-balance changes. |
| R-24 | Sub-job weight | `[TECHNICAL RESOLUTION]` | Independent of main-job weight. No sum constraint (not specified). Both `>= 0`. |
| R-25 | Page size | `[TECHNICAL RESOLUTION]` | Default 20; allowed 10/20/50/100; server max **100**. |
| R-26 | Currency | `[TECHNICAL RESOLUTION]` | INR (`₹`) per D5 §53.1, 2 decimal places, thousand separators. |
| R-27 | Timezone | `[DECISION REQUIRED]` | **Recommended:** Asia/Kolkata for displaying `date` fields and “today” defaults. Store `date` as calendar date (no TZ conversion that shifts the business day). `timestamptz` stored in UTC, displayed in Asia/Kolkata. |
| R-28 | Users.role extensibility | `[TECHNICAL RESOLUTION]` | PostgreSQL enum `user_role` currently `'admin'` or CHECK; add values later without renaming column. Authorization helper `requireAdmin()` isolated in `lib/permissions`. |
| R-29 | RLS vs service role | `[TECHNICAL RESOLUTION]` | Browser/server user-scoped client uses anon key + user JWT + RLS. Privileged Auth admin (create user, set password) uses service-role **only on server**. Atomic RPCs run as authenticated admin via `SECURITY INVOKER` if possible; if `SECURITY DEFINER` is required, set `search_path` and grant execute only to `authenticated`. Service-role must still run application authorization first. |
| R-30 | Idempotency | `[TECHNICAL RESOLUTION]` | Forms disable submit while pending. Server: unique constraints prevent duplicate lot/invoice. For entries/work/allocations, rely on user intent (duplicates can be legitimate, e.g. two work rows). No extra idempotency key unless double-submit becomes a measured incident. |
| R-31 | Accounting tabs | `[TECHNICAL RESOLUTION]` | Accounting is one module with tabs Entries / Accounts / Categories (PRD + accounting companion). Routes may be nested under `/accounting/*` with shared tab chrome. |
| R-32 | Sidebar supporting doc | `[TECHNICAL RESOLUTION]` | Implement collapse, tooltips when collapsed, profile + logout confirm from sidebar guide; colors from PRD. |

---

## 6. System Module Map

### 6.1 Modules and submodules

| Module | Submodules | PRD | Primary entities |
|---|---|---|---|
| Identity | Login, session, logout, Users | §6, nav | `auth.users`, `users` |
| Dashboard | KPIs, recent jobs, recent entries | §22 | derived |
| Parties | List, create, edit, deactivate, detail | §7 | `parties` |
| Employees | List, create, edit, activate/deactivate, work history | §8 | `employees`, work |
| Jobs | Main job, sub-jobs, employee work, search/filters, status | §9–13 | `job_works`, `sub_jobs`, `sub_job_employee_work` |
| Invoices | List, detail, outstanding, print (later), allocations view | §14–15 | `invoices`, allocations |
| Accounting | Entries, Accounts, Categories | §16–18 | `entries`, `accounts`, `categories` |
| Settlements | Allocate income to invoices | §15 | `entry_invoice_allocations` |
| Reports | Job work, entries, outstanding, salary, P&L, party ledger, entry ledger | §21 | derived |
| Users | List, create, role, activate/deactivate, password update | nav + FE §26 | `users` + Auth |

**Do not add** Inventory, GST, Quotations, Orders, Payments-as-a-module, Materials.

### 6.2 User roles and permission boundaries

**v1 role:** `admin` only.

Admin may manage all modules.

**Still required in v1 (future-proof and security-correct):**

- Unauthenticated: login only
- Authenticated but `is_active = false`: no operations
- Authenticated non-admin (none today): deny by default
- Object access: even admins use UUID lookups authorized server-side (knowing `J01` is not an authz token; but admin is allowed the record). This keeps IDOR tests meaningful when roles expand.

Frontend hides nothing extra in v1 (all nav visible to admin). Frontend checks are UX only.

### 6.3 Core business workflows

1. **Create Party** → store default price  
2. **Create Employee** → store current commission  
3. **Create Main Job** → fetch party price → admin may edit → persist job price → **atomically create invoice**  
4. **Create Sub Job** → lock job → remaining Than check → next `sequence_no` → persist  
5. **Add Employee Work** → lock sub-job → remaining Done Than check → snapshot commission → store earning → update statuses  
6. **Create Account / Category**  
7. **Create Income/Expense Entry** → validate account active, category active, types match, amount > 0  
8. **Allocate Income to Invoice(s)** → lock entry+invoice(s) → remaining checks → insert allocations → derive invoice status  
9. **Pay salary** → Expense entry with `employee_id`  
10. **Read** outstanding / ledger / P&L / dashboard from source records  

### 6.4 Main entities and relationships

```text
auth.users.id ──< users.id

parties ──< job_works ──< sub_jobs ──< sub_job_employee_work >── employees
                │
                └── invoices ──< entry_invoice_allocations >── entries
                                                          ├── accounts
                                                          ├── categories
                                                          ├── parties (optional)
                                                          └── employees (optional)
```

### 6.5 Transaction lifecycles / state machines

**Job / Sub-job status (R-05):**

```text
Picker: Pending | Progress | Completed   (default Pending)

Pending ──(first work, if still Pending)──► Progress ──(remaining Than = 0)──► Completed
     ▲                                                                      │
     └────────────── Admin may set any of the three via picker ─────────────┘
```

No Cancelled/Closed. Than allocation rules apply regardless of status.

**Invoice status (R-02):**

```text
Unpaid ──(partial allocation)──► Partially Paid ──(outstanding = 0)──► Paid
Paid ──(allocation reduced/deleted, if ever allowed)──► Partially Paid / Unpaid
```

v1: allocation deletion only as part of blocked entry-delete rules (allocations not freely deleted).

**Account/Category/Party/Employee/User:**

```text
Active ◄──► Inactive
```

Inactive: hidden from new-entry/new-job dropdowns; history remains.

### 6.6 Major APIs (Server Actions unless noted)

See Section 10 for full contracts. Groups:

- `auth.*` (login via Supabase client; logout; session)
- `users.*` (list, create, setActive, updatePassword) — create/password use service-role server-only
- `parties.*` / `employees.*`
- `jobs.*` / `subJobs.*` / `employeeWork.*`
- `invoices.*` (read; outstanding; print data)
- `accounts.*` / `categories.*` / `entries.*` / `allocations.*`
- `reports.*` / `dashboard.*`
- Route Handlers: `GET /api/export/entries` (and later other exports), print-friendly invoice page

### 6.7 Authentication / authorization boundaries

```text
Browser
  → Next.js middleware: session cookie present? else /auth/login
  → Server Component / Server Action:
        getSession → load users row → is_active → role
  → Domain service
  → Supabase (user JWT) + RLS
  → PostgreSQL constraints/functions
```

Service-role: user provisioning only (and emergency ops), never in client.

### 6.8 Frontend route structure

```text
src/app/(auth)/login/page.tsx            # /auth/login
src/app/(dashboard)/layout.tsx           # AppShell: navy sidebar, white topbar, breadcrumbs
src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/jobs/page.tsx
src/app/(dashboard)/jobs/new/page.tsx
src/app/(dashboard)/jobs/[jobId]/page.tsx
src/app/(dashboard)/jobs/[jobId]/edit/page.tsx
src/app/(dashboard)/parties/page.tsx
src/app/(dashboard)/parties/[partyId]/page.tsx
src/app/(dashboard)/employees/page.tsx
src/app/(dashboard)/employees/[employeeId]/page.tsx
src/app/(dashboard)/invoices/page.tsx
src/app/(dashboard)/invoices/[invoiceId]/page.tsx
src/app/(dashboard)/invoices/[invoiceId]/print/page.tsx
src/app/(dashboard)/accounting/layout.tsx
src/app/(dashboard)/accounting/entries/page.tsx
src/app/(dashboard)/accounting/accounts/page.tsx
src/app/(dashboard)/accounting/accounts/[accountId]/page.tsx
src/app/(dashboard)/accounting/categories/page.tsx
src/app/(dashboard)/reports/page.tsx
src/app/(dashboard)/reports/jobs/page.tsx
src/app/(dashboard)/reports/entries/page.tsx
src/app/(dashboard)/reports/outstanding/page.tsx
src/app/(dashboard)/reports/salary/page.tsx
src/app/(dashboard)/reports/profit-loss/page.tsx
src/app/(dashboard)/reports/party-ledger/page.tsx
src/app/(dashboard)/reports/entry-ledger/page.tsx
src/app/(dashboard)/users/page.tsx
```

### 6.9 Database dependency structure

```text
auth.users
  → users
parties, employees, accounts, categories     (independent masters)
  → job_works (needs parties)
      → sub_jobs
          → sub_job_employee_work (needs employees)
      → invoices
          → entry_invoice_allocations (needs entries)
entries (needs accounts, categories; optional party/employee)
```

### 6.10 External integrations

- **Supabase Auth** (email/password)
- **Supabase PostgreSQL**
- No payment gateway, no GST API, no SMS, no file storage in v1

### 6.11 File/document storage

None in v1. Invoice print is HTML/CSS. Exports are generated responses, not stored files.

### 6.12 Audit requirements

`created_at` / `updated_at` on all tables except allocations (allocations have `created_at` only, per D4). Trigger for `updated_at`. No audit table.

---

## 7. Dependency Architecture

```text
Phase 0  Decisions + baseline
   ↓
Phase 1  Next.js repo, env split, lint, CI skeleton
   ↓
Phase 2  Enums, tables, FKs, indexes, RLS, RPCs, views
   ↓
Phase 3  Auth session, middleware, requireUser, login/logout
   ↓
Phase 4  Validation, error mapper, pagination helpers, supabase clients
   ↓
Phase 5  Design tokens, AppShell, primitives (table/form/dialog/toast)
   ↓
Phase 6  Users module (needs Auth + users table + shell)
   ↓
Phase 7  Master data (parallel): Parties | Employees | Accounts | Categories
   ↓
Phase 8  Jobs vertical slice: Job+Invoice RPC → Sub Job RPC → Work RPC
   ↓
Phase 9  Invoice read UX + outstanding (write path already in Phase 8)
   ↓
Phase 10 Entries + Allocations
   ↓
Phase 11 Reports + Dashboard
   ↓
Phase 12 Security hardening (headers, CSP report-only, rate limit login)
   ↓
Phase 13 Full QA / e2e / security tests
   ↓
Phase 14 Performance pass (indexes already exist; query review)
   ↓
Phase 15 Production prep, backups, deploy, smoke, DR
```

**Hard blockers:**

- No module UI before Phase 5 primitives (except login in Phase 3)
- No jobs before parties
- No employee work before employees + sub-jobs
- No job create in production path without invoice RPC
- No allocations before invoices + income entries + accounts/categories
- No dashboard/reports before source modules exist (can stub layout earlier)
- No production deploy before RLS + AuthZ tests + backup restore test

---

## 8. Database Implementation Strategy

### 8.1 Authoritative inventory (exactly 12 tables)

`users`, `parties`, `employees`, `job_works`, `sub_jobs`, `sub_job_employee_work`, `invoices`, `accounts`, `categories`, `entries`, `entry_invoice_allocations`

Plus: PostgreSQL enums, `updated_at` trigger function, RPCs, optional views. **No extra business tables.**

Optional implementation-only (allowed if not a business entity):

- `invoice_number_seq` sequence or `business_counters` table for atomic invoice numbers — **not** a 13th business entity; internal. Mark in migration comments.

### 8.2 Enums

```text
user_role: admin
job_type: Sarin | Dropping | Galaxy
job_status: Pending | Progress | Completed
invoice_status: Unpaid | Partially Paid | Paid
  (or snake: unpaid/partially_paid/paid — pick one and map in UI; recommended DB labels match PRD display: 'Unpaid','Partially Paid','Paid')
entry_type: Income | Expense
category_type: Income | Expense   (can share entry_type enum)
```

### 8.3 Column / constraint matrix

#### `users`

| Column | Type | Constraints | Default |
|---|---|---|---|
| id | uuid PK | FK `auth.users.id` ON DELETE CASCADE | — |
| name | text | NOT NULL | — |
| email | text | NOT NULL UNIQUE, stored lowercase | — |
| role | user_role | NOT NULL | `admin` |
| is_active | boolean | NOT NULL | true |
| created_at | timestamptz | NOT NULL | now() |
| updated_at | timestamptz | NOT NULL | now() |

No password columns. Soft-deactivate via `is_active`. Indexes: unique `email`, `name`, `is_active`. Create path writes Auth + this row together.

#### `parties`

| Column | Type | Constraints |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| company_name | text | NOT NULL |
| contact_person_name | text | NULL |
| mobile_number | text | NOT NULL |
| price | numeric(14,2) | NOT NULL, CHECK >= 0 |
| is_active | boolean | NOT NULL default true |
| created_at/updated_at | timestamptz | NOT NULL |

Indexes: `company_name`, `mobile_number`, `is_active`. **No UNIQUE on mobile.**

#### `employees`

Same pattern: `name` NOT NULL, `mobile_number` NOT NULL, `commission numeric(14,2) >= 0`, `is_active`. Indexes on name, mobile, is_active. **No UNIQUE on mobile.**

#### `job_works`

| Column | Constraints |
|---|---|
| lot_number | text NOT NULL UNIQUE; **server-generated** `J01`…; ignore client value |
| party_id | uuid NOT NULL FK parties **ON DELETE RESTRICT** |
| job_type | enum NOT NULL |
| than | numeric(14,3) NOT NULL CHECK > 0 |
| price | numeric(14,2) NOT NULL CHECK >= 0 |
| kapan_number | text NOT NULL |
| weight | numeric(14,3) NOT NULL CHECK >= 0 |
| status | job_status NOT NULL default Pending |

Indexes: lot_number (unique), party_id, job_type, status, created_at.

#### `sub_jobs`

| Column | Constraints |
|---|---|
| job_id | FK job_works ON DELETE RESTRICT |
| sequence_no | int NOT NULL CHECK > 0 |
| UNIQUE (job_id, sequence_no) | |
| than | numeric(14,3) > 0 |
| weight | numeric(14,3) >= 0 |
| status | job_status default Pending |

Index: job_id, (job_id, sequence_no).

**Invariant (function, not a simple CHECK):** `sum(sub_jobs.than) <= parent.than`

#### `sub_job_employee_work`

| Column | Constraints |
|---|---|
| sub_job_id | FK RESTRICT |
| employee_id | FK RESTRICT |
| done_than | numeric(14,3) > 0 |
| commission | numeric(14,2) >= 0  **server-set** |
| earning | numeric(14,2) >= 0  **server-set = done_than × commission** |

Indexes: sub_job_id, employee_id, created_at.

**Invariant:** `sum(done_than) <= sub_jobs.than`

Optional CHECK: `earning = done_than * commission` (numeric caveats — prefer trigger/function set).

#### `invoices`

| Column | Constraints |
|---|---|
| invoice_number | text NOT NULL UNIQUE |
| job_work_id | uuid NOT NULL UNIQUE FK RESTRICT |
| invoice_date | date NOT NULL |
| amount | numeric(14,2) NOT NULL >= 0 |
| status | invoice_status NOT NULL default Unpaid |

Indexes: invoice_number, job_work_id, invoice_date, status.

#### `accounts`

`name` text NOT NULL UNIQUE; `opening_balance numeric(14,2) NOT NULL default 0`; `is_active`.

#### `categories`

`name` NOT NULL; `type` Income/Expense NOT NULL; `is_active`; `UNIQUE (name, type)`.

#### `entries`

| Column | Constraints |
|---|---|
| party_id | FK RESTRICT NULL |
| employee_id | FK RESTRICT NULL |
| account_id | FK RESTRICT NOT NULL |
| category_id | FK RESTRICT NOT NULL |
| entry_type | NOT NULL |
| entry_date | date NOT NULL |
| amount | numeric(14,2) > 0 |
| remarks | text NULL |

**Invariant:** `entry_type = categories.type` for `category_id` (trigger or composite FK pattern).

Indexes per D4 §39.

#### `entry_invoice_allocations`

`entry_id` FK RESTRICT, `invoice_id` FK RESTRICT, `amount > 0`, `created_at`.  
**Invariants:** entry is Income; sum(alloc by entry) <= entry.amount; sum(alloc by invoice) <= invoice.amount.

No `updated_at` (schema as specified).

### 8.4 Soft-delete

No `deleted_at`. Deactivation via `is_active`. Financial rows are not soft-deleted.

### 8.5 RLS

Enable RLS on all 12 tables.

**v1 policy model (default deny):**

- `anon`: no access
- `authenticated`: allowed iff `public.is_active_admin()` is true

`is_active_admin()` reads `users` where `id = auth.uid()` and `role = 'admin'` and `is_active = true`. Write this function with `SECURITY DEFINER` + fixed `search_path=public` **or** a policy that does not recurse. Test for RLS recursion.

Do **not** use “authenticated can do everything” without the active-admin predicate.

Service-role bypasses RLS — application code must authorize first.

### 8.6 Views (read models)

Create after base tables:

| View | Purpose |
|---|---|
| `v_sub_jobs_display` | `id`, `job_id`, `lot_number`, `sequence_no`, `display_no` (`J01-A`) |
| `v_invoice_outstanding` | invoice_id, amount, allocated, outstanding, derived_status |
| `v_account_balances` | account_id, opening, total_in, total_out, current_balance, entry_count |
| `v_party_outstanding` | party_id, outstanding_sum |
| `v_employee_earnings` | employee_id, total_done_than, total_earning |

Views are not a second source of truth; they select from source tables.

### 8.7 Functions / RPCs (atomic)

| Function | Locks | Writes |
|---|---|---|
| `update_job_with_invoice_recalc(payload)` | lock job + invoice | `job_works.than/price`; `invoices.amount` + status |
| `create_sub_job(job_id, than, weight)` | `SELECT … FOR UPDATE` job row | `sub_jobs`; maybe job status |
| `add_employee_work(sub_job_id, employee_id, done_than)` | lock sub-job; read employee commission server-side | work row; sub-job + job status |
| `update_employee_work` / `delete_employee_work` | lock sub-job | work; statuses |
| `allocate_entry_to_invoices(entry_id, items[])` | lock entry + invoices | allocations; invoice statuses |
| `set_invoice_status_from_allocations(invoice_id)` | used internally | invoices.status |
| `next_lot_number()` | sequence `lot_number_seq` | returns `J01`… |
| `next_invoice_number()` | sequence `invoice_number_seq` | returns `INV-0001`… |

All validate arguments; no dynamic SQL; grant execute to `authenticated` only.

### 8.8 Seed data

**Production:** none except first admin (ops), and optionally empty. Do **not** hardcode parties.

**Dev/staging:** sample party, employee, account “Cash”, categories “Job Income” / “Salary”, first admin.

Enums are schema, not seed rows.

### 8.9 Migration sequence (recommended files)

| Migration | Purpose | Reversible | Risk |
|---|---|---|---|
| `0001_extensions_and_updated_at` | pgcrypto/uuid; `set_updated_at()` | Yes | Low |
| `0002_enums` | all enums | Yes if unused | Low |
| `0003_users` | users (id, name, email unique, role, is_active) + FK auth.users | Yes empty | Medium (auth coupling) |
| `0004_parties` | table, checks, indexes, RLS | Yes empty | Low |
| `0005_employees` | same | Yes empty | Low |
| `0006_job_works` | table, unique lot, FKs, RLS | Yes empty | Low |
| `0007_sub_jobs` | unique (job_id, sequence_no) | Yes empty | Low |
| `0008_sub_job_employee_work` | FKs, checks | Yes empty | Low |
| `0009_invoices` | unique number + unique job_work_id | Yes empty | Low |
| `0010_accounts` | unique name | Yes empty | Low |
| `0011_categories` | unique (name,type) | Yes empty | Low |
| `0012_entries` | FKs, amount check | Yes empty | Low |
| `0013_entry_invoice_allocations` | FKs | Yes empty | Low |
| `0014_rls_policies` | enable + admin policies all tables | Yes | **High** if wrong (lockout/leak) |
| `0015_views` | read models | Yes | Low |
| `0016_rpc_create_job_with_invoice` | atomic billing | Yes drop fn | **High** |
| `0017_rpc_create_sub_job` | than lock | Yes | **High** |
| `0018_rpc_employee_work` | than lock + snapshot | Yes | **High** |
| `0019_rpc_allocate` | allocation lock | Yes | **High** |
| `0020_triggers_category_type` | entry_type match | Yes | Medium |
| `0021_grants` | revoke anon; grant authenticated execute | Partial | **High** |

**Never** `ON DELETE CASCADE` on financial/history FKs.

**Application compatibility:** each migration is additive until RPCs exist. App should not call incomplete RPCs. Feature flags: don’t enable Jobs UI until `0016–0018` applied.

**Destructive changes:** none in v1 baseline. Enum additions are additive. Do not change numeric precision in production without a conversion plan.

### 8.10 Data migration

Greenfield: no legacy data. If a previous `serial_no`/`profiles`/`transactions` system exists, it is **out of this plan** until an explicit mapping is provided.

---

## 9. Authentication & Authorization Strategy

### 9.1 Sequence

1. Configure Supabase Auth (email/password; disable public signup)
2. Server/browser Supabase clients
3. Cookie-based session (SSR-compatible); **not** localStorage tokens
4. Login page
5. Middleware redirect unauthenticated → `/auth/login`; authenticated `/auth/login` → `/dashboard`
6. `requireSession()` on every Server Action and protected Server Component
7. `requireActiveAdmin()` loads `users` by `auth.uid()`
8. Inactive user: sign out + error
9. Users module: create Auth user then `users` row in one server transaction (compensate if second fails)
10. Password update: Supabase Admin API server-side; never show existing password
11. Logout: confirm dialog → `signOut` → `/auth/login`
12. Session expiry: safe error + redirect to login

### 9.2 Three-layer enforcement

| Layer | What it does | What it is not |
|---|---|---|
| Frontend | Hide Users nav only if future roles require; disable submit while saving | Not security |
| Next.js server | Session, active, role, Zod, object exists, business rules | Authoritative for operations |
| PostgreSQL | RLS + constraints + RPC locks | Last line of defense |

### 9.3 Record-level

v1: any active admin may access any record. Still: lookup by UUID; reject malformed IDs; do not authorize by lot_number string alone (resolve lot → id in service, then proceed as admin).

### 9.4 Tests (must exist before Users/Jobs ship)

- Unauthenticated Server Action fails
- Inactive user fails
- Direct URL `/jobs` redirects
- Anon key cannot read tables (RLS)
- Knowing `J01` does not bypass auth
- Service role not in client bundle (`grep` CI)

---

## 10. Backend/API Implementation Strategy

### 10.1 Placement rule

```text
UI → Server Action or Server Component → services/<domain> → supabase/rpc
```

No Supabase writes from Client Components.

### 10.2 Shared API conventions

- Pagination: `{ records, page, pageSize, totalCount }`
- Errors: `{ code, message }` mapped: `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTEGRITY`, `RATE_LIMIT`, `INTERNAL`
- Never return SQL/stack
- Explicit column lists
- `pageSize` clamped to 100
- Search strings trimmed, max length (e.g. 100)
- IDs: uuid parse

### 10.3 Endpoint / action catalog

Auth requirement for all except login: **active admin**.

#### Identity

| ID | Action | Purpose | Input | Output | DB | Audit | Notes |
|---|---|---|---|---|---|---|---|
| API-AUTH-01 | `login` | Supabase signIn | email, password | session | auth | no | Rate limit; generic error |
| API-AUTH-02 | `logout` | signOut | — | ok | — | no | |
| API-AUTH-03 | `getCurrentUser` | shell identity | — | name, email, role, is_active | users | no | |

#### Users

| ID | Action | Input | Output | Rules |
|---|---|---|---|---|
| API-USR-01 | `listUsers` | search name/email, page, active | paginated name/email/role/active | users |
| API-USR-02 | `createUser` | name, email, password, confirm | user | Auth admin create + insert users(name,email); no public signup |
| API-USR-03 | `setUserActive` | id, is_active | user | cannot delete; do not delete Auth user |
| API-USR-04 | `updateUserPassword` | id, newPassword, confirm | ok | Admin API; never return hash |
| API-USR-05 | `updateUserProfile` | id, name, email? | user | email change must update Auth + users together if allowed |

#### Parties

| ID | Method-like | Input | Rules |
|---|---|---|---|
| API-PTY-01 | `listParties` | search company/mobile, is_active, page, sort | indexes |
| API-PTY-02 | `getParty` | id | 404 |
| API-PTY-03 | `createParty` | company_name, contact?, mobile, price | required + price>=0 |
| API-PTY-04 | `updateParty` | id + fields | price change does not touch jobs |
| API-PTY-05 | `setPartyActive` | id, is_active | prefer over delete |
| API-PTY-06 | `getPartySummary` | id | jobs count, outstanding (after those modules) |

Delete party: reject if jobs exist (`RESTRICT`).

#### Employees

Analogous: create/update/setActive/list/get/getWorkHistory. Commission update does not rewrite work rows.

#### Jobs

| ID | Action | Atomic RPC | Rules |
|---|---|---|---|
| API-JOB-01 | `createJob` | `create_job_with_invoice` | ignore client lot/invoice numbers; server generates both; party active; kapan required; than>0; price>=0; weight decimal numeric(14,3); status picker default Pending; invoice amount=than×price |
| API-JOB-02 | `updateJob` | transactional | than/price **editable**; recalc invoice amount; reject if allocations or sub-job Than would break; cannot change lot_number; status picker accepted |
| API-JOB-03 | `getJob` | — | include remaining than, sub-jobs, invoice summary |
| API-JOB-04 | `listJobs` | — | search lot OR display sub-job no; filters type, status, party, employee |
| API-JOB-05 | `createSubJob` | RPC | remaining than; sequence next; display derived |
| API-JOB-06 | `updateSubJob` | RPC | than cannot go below already done_than; cannot exceed remaining parent |
| API-JOB-07 | `addEmployeeWork` | RPC | ignore client commission/earning; snapshot from employee; employee should be active for **new** work |
| API-JOB-08 | `updateEmployeeWork` | RPC | R-20 |
| API-JOB-09 | `deleteEmployeeWork` | RPC | recalc status |
| API-JOB-10 | remaining helpers | — | used by forms |

Errors: `Lot Number already in use`; `Sub-job quantity exceeds remaining Than`; `Done Than exceeds remaining sub-job Than`.

#### Invoices

| ID | Action | Notes |
|---|---|---|
| API-INV-01 | `listInvoices` | search number/lot, status, party, date range |
| API-INV-02 | `getInvoice` | job, party, outstanding, allocations |
| API-INV-03 | `getInvoiceOutstanding` | derived |
| API-INV-04 | print page data | same authz |

No public `createInvoice` — only via job create.

#### Accounting

| ID | Action | Rules |
|---|---|---|
| API-ACC-01..05 | accounts CRUD/active | unique name; delete RESTRICT if entries; opening_balance R-23 |
| API-CAT-01..05 | categories | unique (name,type); type immutable if entries |
| API-ENT-01 | `listEntries` | remarks search, date range, type, account, category; **summary for same filters** |
| API-ENT-02 | `createEntry` | account+category active; types match; amount>0; party/employee optional |
| API-ENT-03 | `updateEntry` | R-22 |
| API-ENT-04 | `deleteEntry` | block if allocations |
| API-ALC-01 | `allocate` | RPC; income only; amounts>0; not exceed remainings |
| API-ALC-02 | `listAllocationsForInvoice/Entry` | read |

#### Reports / Dashboard

Read-only services; same filters as UI; no client-side full table download.

#### Export

`GET /api/export/entries?…` authenticated, same filters, row cap, CSV.

### 10.4 Validation library

Zod (Security §10). Shared schemas in `src/lib/validation`. Client may reuse schemas for UX; server always re-parses.

### 10.5 Error cases (standard)

| Case | HTTP/code | User message example |
|---|---|---|
| Unauthenticated | UNAUTHORIZED | Please sign in. |
| Inactive | FORBIDDEN | Your account is inactive. |
| Validation | VALIDATION | field errors |
| Unique lot | CONFLICT | This Lot Number is already in use. |
| Over-allocation | INTEGRITY | Sub Job Than exceeds remaining Main Job Than. |
| Inactive account | VALIDATION | Cannot create an entry under an inactive account. |
| Allocated delete | INTEGRITY | Remove invoice allocations before deleting this entry. |
| Unknown | INTERNAL | Something went wrong. Try again. |

---

## 11. Frontend/UI Implementation Strategy

### 11.1 Order (do not skip)

1. Design tokens (PRD palette) + typography + spacing  
2. `AppShell`: navy sidebar, white topbar, page background `#F6F8FB`  
3. Sidebar nav (PRD §24) + collapse + mobile drawer  
4. Topbar: context title, user **name + email**, logout  
5. Breadcrumbs on detail/nested views (`Jobs / J01 / J01-A`)  
6. Primitives: Button, Input, Select, DatePicker, Textarea, Checkbox, Dialog, Drawer, ConfirmDialog, Table, Pagination, SearchInput, FilterBar, StatusBadge, Tabs, Toast, EmptyState, ErrorState, Skeleton  
7. FormField (label, required `*`, error, helper)  
8. Permission-aware wrappers (pass-through in v1, structure ready)  
9. Login page at `/auth/login` (branded logo prominent)  
10. Module pages in dependency order per D5 §67  

**D5-specific rules that override the old generic FE template:**

- Dedicated routes: `/jobs/new`, `/jobs/[jobId]/edit`, `/parties/[partyId]`, `/invoices/[invoiceId]/print`
- Breadcrumbs on nested/detail views (`Jobs / J01 / J01-A`)
- Job list shows remaining Than when the server provides it
- Sub-job create shows Main/Allocated/Remaining Than before submit
- Status picker on job and sub-job create/edit (default Pending)
- Than/Price remain editable; after save, refresh invoice amount from the server
- Allocation UI must refresh on concurrent conflict (D5 §22.4)
- Invoice print is a chrome-free layout using the sample field names
- Users columns are Name + Email from `public.users`
- Weight inputs accept decimals and display `ct`
- Lot Number is not a create-form field 

### 11.2 Navigation (exact)

```text
Dashboard
Jobs
Parties
Employees
Invoices
Accounting → Entries, Accounts, Categories
Reports → (subpages)
Users
```

### 11.3 Screen list (complete)

| Screen | Route | Primary data |
|---|---|---|
| Login | `/auth/login` | Auth |
| Dashboard | `/dashboard` | aggregations; D5 §10 layout |
| Jobs list | `/jobs` | listJobs |
| Create job | `/jobs/new` | createJob; Lot auto; Kapan required; decimal weight; status picker |
| Job detail | `/jobs/[jobId]` | getJob + remaining Than + sub-jobs + work |
| Edit job | `/jobs/[jobId]/edit` | updateJob; Than/Price editable; invoice amount refreshes; status picker |
| Parties list | `/parties` | listParties |
| Party detail | `/parties/[partyId]` | summary, jobs, invoices, outstanding |
| Employees list | `/employees` | listEmployees |
| Employee detail | `/employees/[employeeId]` | work history, earned vs paid |
| Invoices list | `/invoices` | listInvoices |
| Invoice detail | `/invoices/[invoiceId]` | outstanding + allocations |
| Invoice print | `/invoices/[invoiceId]/print` | chrome-free print |
| Entries | `/accounting/entries` | listEntries + summary |
| Accounts | `/accounting/accounts` | list + derived balances |
| Account detail | `/accounting/accounts/[accountId]` | entries |
| Categories | `/accounting/categories` | list |
| Reports landing | `/reports` | D5 §30.1 |
| Report pages | `/reports/*` | report services |
| Users | `/users` | name, email, role, status |

### 11.4 UX state requirements (every list/detail/form)

Each important screen must include:

- Initial skeleton loading  
- Table/button loading  
- Empty (no records) vs empty (no search results + clear filters)  
- Error + retry where safe  
- Validation inline  
- Disabled submit while pending  
- Success toast  
- Permission-denied (for future; v1 still handle FORBIDDEN)  
- Confirm for logout, deactivate, delete  
- Responsive: desktop table, tablet scroll, mobile stacked/drawer  
- Unsaved-changes guard on dirty forms  
- Duplicate-submit prevention  

### 11.5 Visual rules

- Status never color-only (badge text + color)  
- Income green `+`; Expense red `-`  
- Job hierarchy visible on detail  
- Logo prominent on login and sidebar  
- No excessive gradients/animation  
- WCAG 2.1 AA practices  
- Icon-only buttons named  

### 11.6 URL state

List pages: `search`, `filters`, `page`, `sort`, `dateFrom`, `dateTo` in query string (Architecture §42–43).

---

## 12. Security Implementation Strategy

Security is **per phase**, not a final bolt-on.

| Phase | Controls implemented | How tested |
|---|---|---|
| 1 Foundation | `.gitignore` `.env*`; `.env.example` placeholders; no secrets in git; dependency pin | secret scan; `NEXT_PUBLIC_` review |
| 2 Database | RLS default deny; constraints; no cascade; SECURITY DEFINER search_path | SQL tests; anon client denied |
| 3 Auth | Supabase Auth; cookies; no localStorage tokens; HTTPS later; brute-force via Supabase | unauth tests; inactive user |
| 4 API infra | Zod; UUID parse; pageSize cap; error sanitization; correlation id | malformed input tests |
| 5 UI | XSS: no `dangerouslySetInnerHTML`; React escaping; no secrets in client | XSS strings in names/remarks |
| 6 Users | service-role server-only; password never returned | bundle grep; password tests |
| 7 Masters | IDOR on get-by-id; mass-assignment deny extra fields | extra-field ignored |
| 8 Jobs | RPC locks; server snapshot commission; server invoice amount; unique lot/invoice | concurrent tests |
| 9–10 Finance | allocation RPC; income-only; delete restrictions | over-allocation tests |
| 11 Reports | authz on exports; filter validation | unauthorized export |
| 12 Hardening | security headers, CSP report-only, HSTS, rate limit login/export | header scan; login flood |
| 15 Prod | HTTPS, secrets in host, backup access control, least-privilege DB | checklist |

### 12.1 Control → where → when → test

| Control | Where | When | Test |
|---|---|---|---|
| Authentication | Supabase Auth + middleware + server | Phase 3 | unauth redirect + action fail |
| Authorization | `requireActiveAdmin` + RLS | Phase 3–4 | inactive/forged role |
| Session | SSR cookies HttpOnly Secure SameSite | Phase 3 / prod flags | cookie flags |
| CSRF | Next.js Server Actions origin checks | Phase 4 | cross-origin POST |
| XSS | React + no raw HTML | Phase 5+ | payload in remarks |
| SQLi | query builder / parameterized RPC | Phase 2+ | `' OR 1=1` search |
| Validation | Zod + DB CHECK | every mutation | negatives, huge numbers |
| Mass assignment | parse allowlists | every mutation | extra `role=admin` on party ignored |
| IDOR | UUID + authz | every get | unauth/other role (future) |
| CORS | same-origin app; no public API | Phase 1 | |
| Headers | next.config / host | Phase 12 | |
| HTTPS | host | Phase 15 | |
| Secrets | env, not NEXT_PUBLIC for service role | Phase 1 | CI grep |
| File upload | N/A v1 | — | do not add |
| Rate limit | login, export | Phase 12 | |
| Errors | mapper | Phase 4 | no stack in UI |
| Logging | server logs, no secrets/PII dump | Phase 4/12 | |
| Audit timestamps | triggers | Phase 2 | |
| Dependencies | `npm audit` | Phase 12/15 | |
| DB security | RLS, grants, no cascade | Phase 2 | |
| Backup security | Supabase access | Phase 15 | |
| Prod access | limited | Phase 15 | |

---

## 13. Module-by-Module Implementation Plan

Repeat this vertical slice for every module:

`Requirement → DB → Migration → Zod → Service → Action → AuthZ → Timestamps → Route → UI → Integration → UX states → Tests → Acceptance`

### 13.1 Users

- Create Auth user + `users` row with `name` and `email`  
- List: name, email, role, status, password action, activate/deactivate  
- Create form: name*, email*, password*, confirm*  
- Password dialog: new + confirm, masked, validation  
- Cannot use UI to set password hashes locally  
- Acceptance: unauthorized session cannot list users; created user can log in iff active; email unique  

### 13.2 Parties

- Fields: company*, mobile*, price*, contact optional, status  
- Search company/mobile; pagination  
- Job form consumes party price  
- Acceptance: required fields; price>=0; existing jobs unchanged when party price changes; deactivate works; delete blocked if jobs exist  

### 13.3 Employees

- Fields: name*, mobile*, commission*, active  
- Work history on detail (after jobs)  
- Acceptance: commission change does not alter past work earnings  

### 13.4 Accounts / Categories (build before entries, parallel with parties)

- Account list: name, opening, total in/out, current balance, status  
- Balance always derived  
- Category type Income/Expense; unique (name,type)  
- Acceptance: inactive hidden from entry dropdowns; delete blocked with entries; type change blocked with entries  

### 13.5 Jobs (core)

- Create job page `/jobs/new`: party select → fetch price → editable price; **no Lot input**; type; than; **kapan required**; **decimal weight**; **status picker** (default Pending)  
- Assigned Lot Number shown after save  
- Edit page: Than and Price **remain editable**; invoice amount refreshes from server; status picker  
- Atomic invoice (`INV-0001`…) in same create transaction  
- Detail: hierarchy, remaining Than, breadcrumbs `Jobs / J01`  
- Sub-job form: remaining Than shown; status picker  
- Work form: employee select (active), done than, **display** commission/earning as read-only preview; submit does not send authority values  
- Search one box Lot/Sub-job; filters type, status, employee, party  
- Acceptance: lot auto-unique; than rules; concurrent over-allocation fails; invoice amount matches than×price after job edit  

### 13.6 Invoices

- Created only with job  
- List: number, date, lot, party, amount, status, outstanding  
- Detail: allocations  
- Print later (R-16)  
- Acceptance: amount = than×price; one invoice per job constraint; status derived  

### 13.7 Entries + Allocations

- Tabs; Add Income / Add Expense  
- Filters: remarks, date range, type, account, category, export, reset  
- Summary for **filtered** set  
- Allocation UI from income entry or invoice: remaining amounts; reject over-allocate  
- Salary: expense + employee  
- Acceptance: type match; positive amount; balances update after CUD; allocation 1:N and N:1; expense cannot allocate  

### 13.8 Reports (R-15 v1 columns)

**Job Work:** lot, party, type, than, price, kapan, weight, status, sub-job count, done than, date  

**Payment/Entry:** date, type, account, category, party, employee, amount, remarks  

**Outstanding:** party, invoice number, lot, invoice amount, allocated, outstanding, status  

**Salary:** employee, total earned (work), total paid (expense entries), difference, date range  

**P&L:** date range; total income; total expense; net  

**Party ledger:** party; chronological invoices, income allocations, related entries  

**Entry ledger:** entries with running impact optional; if running balance is ambiguous across accounts, **do not invent** — show entries + filters; account ledger on account detail already covers running account picture  

### 13.9 Dashboard KPIs (PRD §22)

Total/Pending/Progress/Completed jobs; total than; employee earnings; total income; total expense; current account balances (sum or list); outstanding; recent jobs; recent entries. Same sources as modules. Permission: admin. Period: default all-time or current month — `[DECISION REQUIRED]` minor; **recommended current month + all-time outstanding**.

---

## 14. Testing Strategy

### Unit

- Display no. conversion `1→A` … `27→AA`  
- Remaining Than helpers  
- Zod schemas  
- Money formatting  
- Status derivation functions (if not DB-only)  
- Permission helper  

### Integration (API + DB)

- Each Server Action happy path + validation  
- AuthN/AuthZ  
- RPC concurrency (two sub-jobs summing over than)  
- Allocation concurrency  
- Unique lot/invoice  
- Category type mismatch  
- Commission snapshot immutability  

### Database

- CHECK/UNIQUE/FK  
- RLS anon denied  
- Migration up on empty DB  
- Seed  
- `earning` stored correctly  
- No cascade delete of work when employee deactivated (deactivate is not delete)  

### Frontend

- Forms required indicators  
- Tables load/empty/error  
- Dialog focus trap  
- Nav active state not color-only  
- Filter URL round-trip  
- Permission: if FORBIDDEN, safe page  

### E2E (critical path)

1. Login as admin  
2. Create party + employee + account + income/expense categories  
3. Create job J01 → invoice exists with correct amount  
4. Create sub-jobs filling than  
5. Add work; status Progress/Completed  
6. Income entry; allocate to invoice; status Paid  
7. Expense salary for employee  
8. Dashboard/outstanding/P&L reflect same numbers  
9. Logout  

### Security tests

Per Security §69: unauth, expired, inactive, invalid credentials, IDOR, SQLi, XSS, negative numbers, duplicate lot, over-allocation, duplicate invoice, unauthorized delete.

### Regression pack (rerun on every release)

- E2E critical path  
- RPC concurrency tests  
- RLS tests  
- Invoice amount calculation  
- Account balance formula  
- Party price isolation  

---

## 15. QA & Acceptance Strategy

### Feature acceptance template

A feature passes only if:

1. Authorized admin can perform the operation  
2. Unauthenticated request is rejected server-side  
3. Inactive user is rejected  
4. Required fields validated client **and** server  
5. DB constraints reject illegal duplicates/negatives  
6. Successful persist matches DB  
7. `created_at`/`updated_at` set  
8. UI success + authoritative refresh  
9. API errors shown as business copy  
10. Refresh preserves URL filter/page state  
11. Loading/empty/error states exist  
12. Concurrent illegal operation fails cleanly  

### PRD §31 mapping

Every bullet in PRD §31 is a QA checklist item (traceability Section 25).

### Exit criteria per phase

Written in Section 28 / each phase below. Production requires Security §70 + Architecture §68 + Database §75 + Frontend §53.

---

## 16. Parallel Development Strategy

After Phase 5 (shared UI) and Phase 2 (DB):

| Track | Work | Sync point |
|---|---|---|
| A Database | RPCs, views, extra indexes | Before Jobs/Entries UI wire-up |
| B Backend | Parties/Employees/Accounts/Categories services | After Auth |
| C Frontend | List pages with mock-safe empty states **only if** actions exist; otherwise wait | After primitives |
| D Security | RLS tests, header draft | Continuous; gate at Phase 12 |
| E QA | Test plans, fixtures | After each vertical slice |

**Unsafe to parallelize:** Job UI before `create_job_with_invoice`; Allocation UI before entries+invoices; Dashboard before source aggregations (layout ok, numbers not).

**Safe parallel after masters exist:** Parties UI ∥ Employees UI ∥ Accounts UI ∥ Categories UI.

**Sync points:**

- SP1: Schema 0001–0014 + Auth login  
- SP2: Design system  
- SP3: Masters complete  
- SP4: Job+invoice+sub-job+work  
- SP5: Entries+allocations  
- SP6: Reports+dashboard  
- SP7: Security+QA gate  
- SP8: Production  

Suggested team: 1 fullstack lead, 1 FE, 1 BE/DB. Smaller team: sequential slices.

---

## 17. Git / Release Strategy

**Team size assumption:** 1–4 engineers.

```text
main          production-ready
develop       optional if ≥3 people; else feature → main via PR
feature/*     FOUND-001, DB-001, MOD-jobs-create, etc.
hotfix/*      from main
```

Rules:

- PR required; at least one review  
- Migrations in same PR as code that needs them; never edit applied migration; add a new file  
- `main` protected; no force-push  
- Tags: `v0.1.0-staging`, `v1.0.0`  
- Hotfix: branch from tag, PR, migrate forward only  
- CI: lint, typecheck, unit, migration against ephemeral Postgres/Supabase, secret grep  
- Do not commit `.env.local`  

---

## 18. Performance Strategy

- Indexes as D4 §39 (do this in Phase 2, not as a later guess)  
- Server-side pagination/search/sort  
- Dashboard: SQL aggregations, not fetch-all  
- Accounting: indexes on `account_id`, `category_id`, `entry_date`  
- Job employee filter: join via indexed FKs  
- FE: Server Components default; debounce search ~300ms; cancel stale; no unbounded lists  
- Assets: logo compressed; no heavy animation  
- **Caching:** cache active parties/employees/accounts/categories lists briefly; **never cache balances/outstanding without invalidation after mutation**. Prefer revalidate-on-mutation over TTL for financials.  
- Concurrent ops: DB locks, not FE queues  

Do not add Redis/materialized balances until profiling says so (Architecture §25).

---

## 19. Production Readiness Strategy

Must be true before go-live:

- [ ] Separate Supabase prod project  
- [ ] Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server), no extras leaked  
- [ ] Signup disabled; first admin created  
- [ ] All migrations applied; recorded  
- [ ] RLS enabled and tested with anon key  
- [ ] HTTPS + HSTS  
- [ ] Security headers + CSP (report-only then enforce)  
- [ ] Cookie Secure in prod  
- [ ] Backups enabled; **restore tested** to staging  
- [ ] Error monitoring (host logs minimum)  
- [ ] Correlation ids  
- [ ] Smoke: login, create party, create job+invoice, entry, allocate  
- [ ] Rollback: previous Next.js deployment; DB rollback only via new forward migration (do not `down` production blindly)  
- [ ] DR: documented RTO/RPO using R-17  
- [ ] Runbook: bootstrap admin, deactivate user, restore backup  
- [ ] No debug endpoints  
- [ ] `npm audit` acceptable  
- [ ] Performance smoke on list pages with seed volume (1k jobs / 5k entries)  

---

## 20. Risk Register

| Risk | Prob | Impact | Sev | Area | Prevent | Detect | Mitigate | Contingency |
|---|---|---|---|---|---|---|---|---|
| Concurrent Than over-allocation | M | H | **Crit** | Jobs | RPC row locks | concurrency tests | abort txn | repair script after incident |
| Invoice amount drift vs job | M | H | **Crit** | Billing | Recalc amount in same txn as than/price edit | assert amount=than×price after update | reject if allocations exceed | repair with approval |
| Allocation overpay | M | H | **Crit** | Finance | RPC locks | tests | reject | reverse allocations |
| RLS too open | M | H | **Crit** | Sec | default deny | anon tests | tighten | rotate keys |
| RLS too closed / recursion | M | H | High | DB | policy tests | QA login | fix helper | service-role emergency read |
| Service role in client | L | H | **Crit** | Sec | CI grep | bundle analyze | rotate immediately | |
| Auth user without `users` row | M | M | High | Identity | transactional create | login error | compensate delete Auth user | repair job |
| Financial calc in JS float | H | H | **Crit** | Money | numeric in DB | rounding tests | use decimal lib if needed | recalc from source |
| Requirement ambiguity (lot/kapan) | H | M | High | Product | Phase 0 decisions | review | R-08–R-16 | change request |
| Frontend builds GST/quotations | M | M | High | Scope | R-03 | PR review | delete code | |
| Unique mobile added then duplicates | L | L | Low | DB | R-13 no UNIQUE | schema review | do not add UNIQUE | |
| Opening balance edit rewrites history | M | H | High | Acct | R-23 | tests | block | |
| Category type change breaks entries | M | H | High | Acct | trigger/block | tests | | |
| Large unpaginated query | H | M | High | Perf | max 100 | slow query log | indexes | |
| Deploy migration fail | M | H | High | Ops | staging first | CI | abort deploy | restore backup |
| Backup never restored | M | H | **Crit** | Ops | restore drill | calendar | | |
| Status picker vs automation | M | M | Med | Jobs | Picker is stored; automation may advance Pending→Progress and remaining=0→Completed | QA both paths | | |
| Print template mismatch | H | L | Med | Invoice | R-16 | business review | iterate print only | |
| Duplicate entry on double-click | M | M | Med | UX | disable submit | logs | | user deletes unallocated entry |
| Third-party Next/Supabase breaking change | L | M | Med | Deps | pin versions | CI | | |

---

## 21. Technical Debt Controls

| Area | Why it appears | Preventive rule | Pattern |
|---|---|---|---|
| Client-side business rules | Faster UX | UI may preview; RPC is authority | Remaining Than shown from server |
| `any` / untyped Supabase | Speed | Generate `database.ts` | Domain types wrap generated |
| God `AccountingService` | Convenience | Split entries/accounts/categories files | Architecture §23 |
| Fetch from Client Components | Habit | Server Components default | Actions for mutations |
| Extra tables for reports | Misread PRD | D4 §71 | Views only |
| Manual invoice create screen | Matching other ERPs | No public createInvoice | Job transaction |
| Storing outstanding | Perceived speed | Derived | View |
| Copy-pasted tables | FE speed | Shared DataTable | |
| Skipping RLS in dev | Convenience | RLS on from migration 0014 | |
| Editing old migrations | Git pain | New migration always | |
| Caching balances | Perf panic | Invalidate or don’t cache | |
| Inventing GST fields | Frontend template | R-03 | PR checklist |

Temporary shortcuts allowed only with ticket + expiry; none in financial RPCs.

---

## 22. Definition of Done

A feature is done only when applicable items are true:

- [ ] Traced to PRD/Arch/DB/Sec/FE  
- [ ] Schema/migration applied and reversible or additive-safe  
- [ ] Constraints/indexes/RLS in place  
- [ ] Zod + service + Server Action  
- [ ] Server AuthZ (session, active, role)  
- [ ] UI not the security boundary  
- [ ] Screen: loading, empty, error, validation, success, disabled pending  
- [ ] Responsive desktop/tablet/mobile  
- [ ] A11y: labels, focus, keyboard, contrast, not color-only  
- [ ] No secrets in client  
- [ ] Safe errors  
- [ ] Tests: unit/integration as applicable; e2e if on critical path  
- [ ] Regression pack still green  
- [ ] Docs/runbook updated if ops-facing  
- [ ] PR reviewed  
- [ ] No known critical defects  

---

## 23. Master Implementation Backlog

Priority: **P0** blocker/critical path, **P1** required v1, **P2** required but after core, **P3** polish.

Complexity: XS / S / M / L / XL.

### Phase 0 — Requirement & Architecture Baseline

**Objective:** Record accepted product decisions that affect schema.  
**Prerequisites:** None.  
**Deliverables:** Section 5 locked. Remaining items are non-schema.  
**Completion:** Schema-affecting decisions accepted (done 2026-08-15).

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| FOUND-001 | Decision workshop | Lock R-05, R-07–R-13 | P0 | — | Process | D1 §30, D4 §77 | S | **Done.** Auto lot, atomic INV, decimal weight, required kapan, editable than/price with invoice recalc, status picker, mobile not unique, users name+email |
| FOUND-002 | Reject out-of-scope | Confirm no materials/GST/quotations | P0 | — | Process | D1 §4; D5 §3.2 | XS | Checklist in README |
| FOUND-003 | Traceability freeze | Confirm 12 tables, admin-only, D5 as FE authority | P0 | FOUND-001 | Process | D1 §28 | S | No extra entities planned |

### Phase 1 — Project Foundation

**Objective:** Next.js App Router TypeScript app with env split, lint, CI, folder structure.  
**Prerequisites:** FOUND-001 for stack confirmation (already specified).  
**Risks:** Putting service role in `NEXT_PUBLIC_`.  
**Rollback:** Delete repo branch.

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| FOUND-004 | Scaffold Next.js | App Router, TS, src/ layout per Architecture §4 | P0 | — | FE/App | D2 §4 | M | `next build` succeeds |
| FOUND-005 | Folder structure | app, components, lib, services, types, hooks | P0 | FOUND-004 | App | D2 §4 | S | Modules separated |
| FOUND-006 | Env split | `.env.example` public URL+anon only; server service role documented | P0 | FOUND-004 | Sec | D3 §7–8 | S | No real secrets committed |
| FOUND-007 | gitignore secrets | `.env*.local` ignored | P0 | FOUND-006 | Sec | D3 §49 | XS | git check |
| FOUND-008 | Lint/format | ESLint + TypeScript strict | P1 | FOUND-004 | App | D2 | S | CI lint |
| FOUND-009 | CI skeleton | lint, typecheck, secret grep `SERVICE_ROLE` in client | P0 | FOUND-008 | Ops | D3 | M | PR cannot merge secret leak |
| FOUND-010 | Supabase projects | local/staging/prod projects planned; no casual use of prod | P0 | FOUND-006 | Ops | D2 §55 | S | URLs documented |
| OPS-001 | README runbook start | how to run locally | P1 | FOUND-004 | Docs | D2 | S | New dev can start app |

### Phase 2 — Database Foundation

**Objective:** Full schema, RLS, RPCs.  
**Prerequisites:** R-08–R-13 accepted (done).  
**Rollback:** Drop staging DB; never destructive down on prod.

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| DB-001 | Extensions + updated_at | uuid; trigger fn | P0 | FOUND-010 | DB | D4 §38 | S | Trigger exists |
| DB-002 | Enums | role, job_type, job_status, invoice_status, entry_type | P0 | DB-001, FOUND-001 | DB | D4 | S | Invalid enum rejected |
| DB-003 | users table | PK=auth.uid; name; unique lowercase email; role; is_active | P0 | DB-002 | DB | D4 §5 | M | No password columns; unique email |
| DB-004 | parties | columns/checks/indexes; mobile not unique | P0 | DB-001 | DB | D4 §6 | M | price>=0; mobile text |
| DB-005 | employees | columns/checks/indexes; mobile not unique | P0 | DB-001 | DB | D4 §7 | M | commission>=0 |
| DB-006 | job_works | unique auto lot; kapan NOT NULL; weight numeric(14,3); FK party RESTRICT | P0 | DB-004 | DB | D4 §8–9 | L | unique lot; decimal weight |
| DB-007 | sub_jobs | unique (job_id, sequence_no) | P0 | DB-006 | DB | D4 §10 | M | sequence unique per job |
| DB-008 | sub_job_employee_work | FKs; done_than>0 | P0 | DB-007, DB-005 | DB | D4 §13 | M | earning columns exist |
| DB-009 | invoices | unique number; unique job_work_id | P0 | DB-006 | DB | D4 §17–19 | M | one invoice per job |
| DB-010 | accounts | unique name; opening_balance | P0 | DB-001 | DB | D4 §20 | S | |
| DB-011 | categories | unique (name,type) | P0 | DB-002 | DB | D4 §22 | S | |
| DB-012 | entries | FKs; amount>0 | P0 | DB-010, DB-011, DB-004, DB-005 | DB | D4 §23 | L | |
| DB-013 | allocations | FKs; amount>0 | P0 | DB-012, DB-009 | DB | D4 §27 | M | no cascade |
| DB-014 | is_active_admin helper | safe search_path | P0 | DB-003 | DB | D3 §6, D4 | M | no RLS recursion |
| DB-015 | RLS all tables | default deny + admin policies | P0 | DB-014, DB-013 | DB | D3 §6 | L | anon denied; admin allowed |
| DB-016 | Grants | revoke public/anon as needed | P0 | DB-015 | DB | D3 §65 | S | |
| DB-017 | Views | display no, outstanding, balances, earnings, party outstanding | P1 | DB-013 | DB | D4 §44 | L | views match formulas |
| DB-018 | next_lot_number + next_invoice_number | atomic sequences J01 / INV-0001 | P0 | DB-006, DB-009 | DB | D4; R-08; R-09 | M | no duplicate under concurrency |
| DB-019 | RPC create_job_with_invoice | generate lot+invoice; server amount; ignore client numbers | P0 | DB-018 | DB | D4 §49; D3 §39 | XL | fail rolls back both; lot assigned |
| DB-019A | RPC update_job_with_invoice_recalc | than/price edit; recalc amount; reject if allocations or sub-job Than break | P0 | DB-019 | DB | R-12 | L | amount always than×price |
| DB-020 | RPC create_sub_job | lock; remaining than; next sequence | P0 | DB-007 | DB | D4 §46; D3 §12 | XL | concurrent over-alloc fails |
| DB-021 | RPC employee work add/update/delete | lock; snapshot commission; statuses R-05 | P0 | DB-008 | DB | D4 §47; D3 §13,37 | XL | client commission ignored |
| DB-022 | RPC allocate | lock; income only; remainings; invoice status | P0 | DB-013 | DB | D4 §48; D3 §35 | XL | concurrent over-alloc fails |
| DB-023 | Trigger entry/category type | match types | P0 | DB-012 | DB | D4 §24 | M | mismatch rejected |
| DB-024 | Trigger prevent inactive account/category on INSERT | new entries only | P1 | DB-012 | DB | D4 §25 | M | insert rejected |
| DB-025 | Display number function | 1→A, 27→AA | P0 | DB-007 | DB | D4 §11 | S | unit SQL tests |
| DB-026 | Generate TS types | supabase gen types | P0 | DB-015 | App | D2 §36 | S | `database.ts` committed |
| DB-027 | Migration test | apply 0001–0021 on clean DB | P0 | DB-026 | QA | D4 §73 | M | repeatable |
| QA-DB-001 | Constraint tests | negatives, uniques, FKs | P0 | DB-027 | QA | D4 §75 | L | suite green |

### Phase 3 — Authentication & Authorization

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| AUTH-001 | Browser supabase client | anon key only | P0 | FOUND-006 | App | D2 §52 | S | no service role |
| AUTH-002 | Server supabase client | cookie session | P0 | AUTH-001 | App | D3 §22 | M | SSR session works |
| AUTH-003 | Admin supabase client | service role server-only | P0 | AUTH-002 | App | D3 §7 | S | import path not client |
| AUTH-004 | requireSession | throws UNAUTHORIZED | P0 | AUTH-002 | App | D3 §9 | S | |
| AUTH-005 | requireActiveAdmin | users row active admin | P0 | AUTH-004, DB-003 | App | D3 §5 | M | inactive blocked |
| AUTH-006 | Middleware | protect all except login | P0 | AUTH-002 | App | D2 §10 | M | /jobs redirects |
| AUTH-007 | Login page UI | `/auth/login`; labels, mask, loading, generic error | P0 | AUTH-001, Phase5-min | FE | D5 §9 | M | no user enumeration |
| AUTH-008 | Logout + confirm | Confirm Logout dialog | P0 | AUTH-002 | FE | sidebar guide; D5 | S | session cleared |
| AUTH-009 | Session expiry UX | redirect login | P1 | AUTH-006 | FE | D5 §30 | S | |
| AUTH-010 | Disable signup | Supabase dashboard setting | P0 | FOUND-010 | Ops | D3 | XS | public signup fails |
| AUTH-011 | Bootstrap first admin | script Auth+users with name+email | P0 | DB-003, AUTH-003 | Ops | R-18 | M | can log in |
| QA-AUTH-001 | Auth tests | unauth, inactive, bad password | P0 | AUTH-011 | QA | D3 §69 | M | |

**Phase 3 frontend note:** Login can use unstyled form first; restyle in Phase 5.

### Phase 4 — Core Backend/API Infrastructure

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| API-001 | Result/error types | codes in §10.2 | P0 | AUTH-005 | BE | D2 §38 | S | |
| API-002 | Zod helpers | uuid, pagination, dates, numeric | P0 | DB-026 | BE | D3 §10 | M | huge limit rejected |
| API-003 | Pagination clamp | max 100 default 20 | P0 | API-002 | BE | D3 §28 | XS | |
| API-004 | Safe error mapper | no SQL to client | P0 | API-001 | BE | D3 §45 | S | |
| API-005 | Correlation id | request id in logs | P1 | API-001 | BE | D3 §47 | S | |
| API-006 | Logging sanitizer | never log tokens/passwords | P0 | API-005 | BE | D3 §46 | S | |
| API-007 | Explicit select helper | no SELECT * | P1 | AUTH-002 | BE | D3 §58 | S | |
| API-008 | Revalidation helpers | paths after mutation | P1 | FOUND-004 | BE | D2 §44 | S | |
| QA-API-001 | Validation tests | negatives, malformed uuid | P0 | API-002 | QA | D3 | M | |

### Phase 5 — Core Shared UI System

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| UI-001 | Design tokens | PRD colors, type, space | P0 | FOUND-004 | FE | D1 §23 | M | tokens used, not hex scatter |
| UI-002 | AppShell | sidebar+topbar+content | P0 | UI-001 | FE | D5 §4 | L | stable across routes |
| UI-003 | Sidebar nav | D5 §7.2 items; nested accounting; collapse; tooltips; logo | P0 | UI-002 | FE | D5 §7.2 | L | active state not color-only |
| UI-004 | Topbar | title, name, email, logout | P0 | UI-002, API-AUTH-03 | FE | D5 §7.3 | S | |
| UI-005 | PageHeader | title, description, primary action | P0 | UI-001 | FE | D5 §7 | S | |
| UI-006 | Button/Input/Select/Date/Textarea | a11y labels | P0 | UI-001 | FE | D5 §36 | M | |
| UI-007 | FormField | required *, error | P0 | UI-006 | FE | D5 §14–15 | S | |
| UI-008 | Dialog + ConfirmDialog | focus trap, cancel/primary | P0 | UI-006 | FE | D5 §19–20 | M | |
| UI-009 | DataTable | loading skeleton, empty, error | P0 | UI-001 | FE | D5 §10 | L | |
| UI-010 | Pagination | disabled prev/next | P0 | UI-009 | FE | D5 §13 | S | |
| UI-011 | FilterBar + SearchInput | debounce, reset | P0 | UI-006 | FE | D5 §11–12 | M | |
| UI-012 | StatusBadge | text+color | P0 | UI-001 | FE | D5 §22 | S | |
| UI-013 | Tabs | accounting | P0 | UI-001 | FE | D2 §50 | S | |
| UI-014 | Toast | success/error safe | P0 | UI-001 | FE | D5 §27 | S | |
| UI-015 | Empty/Error/Loading states | reusable | P0 | UI-001 | FE | D5 §28–30 | S | |
| UI-016 | Login brand restyle | logo, navy | P1 | UI-001, AUTH-007 | FE | D1 §23 | S | |
| UI-017 | Responsive nav | mobile drawer | P1 | UI-003 | FE | D5 §33 | M | |
| UI-018 | Unsaved changes helper | | P2 | UI-007 | FE | D5 §18 | S | |
| QA-UI-001 | Primitive a11y pass | keyboard, contrast | P1 | UI-017 | QA | D5 §34 | M | |

### Phase 6 — Users Module

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| MOD-USR-001 | Zod user schemas | name, email, password rules | P0 | API-002 | BE | D5 §31 | S | |
| MOD-USR-002 | UserService list/create/active/password | persist name+email; sync Auth | P0 | AUTH-003, AUTH-005 | BE | D2 §8; D4 §5 | L | |
| MOD-USR-003 | Server actions users | | P0 | MOD-USR-002 | BE | D3 §20 | M | re-authz inside action |
| MOD-USR-004 | Users page table | name, email, role, status, actions | P0 | UI-009, MOD-USR-003 | FE | D5 §31 | L | states complete |
| MOD-USR-005 | Create user dialog | name, email, password, confirm | P0 | MOD-USR-004 | FE | D5 §31 | M | |
| MOD-USR-006 | Password dialog | never shows old password | P0 | MOD-USR-004 | FE | D5 §31.4 | M | |
| MOD-USR-007 | Deactivate confirm | history preserved | P0 | MOD-USR-004 | FE | D3 §5 | S | |
| QA-USR-001 | Users tests | create, login, deactivate blocks | P0 | MOD-USR-007 | QA | | M | |

### Phase 7 — Master Data

Parallelizable.

#### Parties

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| MOD-PTY-001 | Party Zod | | P0 | API-002 | BE | D1 §7 | S | |
| MOD-PTY-002 | PartyService CRUD+list+active | | P0 | AUTH-005, DB-004 | BE | D2 §12 | L | |
| MOD-PTY-003 | Party actions | | P0 | MOD-PTY-002 | BE | | M | |
| MOD-PTY-004 | Parties list page | search, filters, pagination | P0 | UI-009, MOD-PTY-003 | FE | D1 §7 | L | |
| MOD-PTY-005 | Create/edit dialog | required indicators | P0 | MOD-PTY-004 | FE | D5 §14 | M | |
| MOD-PTY-006 | Deactivate/delete handling | RESTRICT message | P0 | MOD-PTY-005 | FE | D4 §32 | S | |
| QA-PTY-001 | Party tests | required, price isolation later with jobs | P0 | MOD-PTY-006 | QA | D1 §31 | M | |

#### Employees

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| MOD-EMP-001 | Employee Zod+service+actions | | P0 | AUTH-005, DB-005 | BE | D1 §8 | L | |
| MOD-EMP-002 | Employees list+dialogs | | P0 | UI-009, MOD-EMP-001 | FE | | L | |
| MOD-EMP-003 | Employee detail stub | work history later | P1 | MOD-EMP-002 | FE | D2 §13 | M | |
| QA-EMP-001 | Employee tests | commission persist | P0 | MOD-EMP-002 | QA | | S | |

#### Accounts

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| MOD-ACC-001 | Account Zod+service+actions | derived balance | P0 | DB-017 | BE | D1 §17 | L | |
| MOD-ACC-002 | Accounts tab/table | Total In/Out/Balance | P0 | UI-013, MOD-ACC-001 | FE | D1 §17 | L | |
| MOD-ACC-003 | Account create/edit | opening balance R-23 | P0 | MOD-ACC-002 | FE | D4 §53 | M | |
| MOD-ACC-004 | Account detail | related entries stub until entries | P1 | MOD-ACC-002 | FE | D1 §17 | M | |
| QA-ACC-001 | Account tests | unique name; delete restrict | P0 | MOD-ACC-003 | QA | | M | |

#### Categories

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| MOD-CAT-001 | Category service+actions | | P0 | DB-011 | BE | D1 §18 | M | |
| MOD-CAT-002 | Categories tab UI | | P0 | UI-013 | FE | | M | |
| QA-CAT-001 | Category tests | unique name+type | P0 | MOD-CAT-002 | QA | | S | |

### Phase 8 — Core Jobs Workflow (includes invoice write)

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| MOD-JOB-001 | Job Zod | party, type, than, price, kapan required, decimal weight; no client lot | P0 | API-002 | BE | D1 §9; R-08 | M | |
| MOD-JOB-002 | JobService.create via RPC | | P0 | DB-019, MOD-PTY-002 | BE | D2 §15 | L | invoice created; lot assigned |
| MOD-JOB-003 | JobService.list/get/update | search+filters; than/price edit recalcs invoice (R-12) | P0 | DB-017 | BE | D2 §20 | XL | J01-A search works; amount stays in sync |
| MOD-JOB-004 | SubJobService RPC | | P0 | DB-020 | BE | D2 §16 | L | |
| MOD-JOB-005 | EmployeeWorkService RPC | ignore client rates | P0 | DB-021, MOD-EMP-001 | BE | D2 §17 | L | |
| MOD-JOB-006 | Job actions | | P0 | MOD-JOB-002–005 | BE | D3 §20 | M | |
| MOD-JOB-007 | Jobs list page | filters type/status/employee/party | P0 | UI-009, MOD-JOB-006 | FE | D1 §13 | XL | URL state |
| MOD-JOB-008 | Create job page `/jobs/new` | party price default; no lot input; kapan required; decimal weight; status picker default Pending | P0 | MOD-JOB-007 | FE | D5 §18 | L | assigned lot shown after save |
| MOD-JOB-009 | Job detail hierarchy | | P0 | MOD-JOB-007 | FE | D1 §25 | XL | |
| MOD-JOB-010 | Sub-job form | remaining than; status picker | P0 | MOD-JOB-009 | FE | D1 §10 | L | |
| MOD-JOB-011 | Work form | multiple entries same employee | P0 | MOD-JOB-009 | FE | D1 §11 | L | |
| MOD-JOB-012 | Status picker + badges | create/edit picker; list badges | P0 | MOD-JOB-009 | FE | R-05 | M | |
| MOD-JOB-013 | Edit job Than/Price | recalc invoice; show new amount; error if allocations exceed | P0 | MOD-JOB-003 | FE | R-12 | L | amount matches than×price |
| MOD-EMP-004 | Wire work history + earned | | P1 | MOD-JOB-011 | FE | D1 §19 | M | |
| QA-JOB-001 | Job integration tests | than rules, snapshot, unique lot, invoice recalc on price/than edit, status picker | P0 | MOD-JOB-011 | QA | D1 §31 | XL | |
| QA-JOB-002 | Concurrency tests | two work posts | P0 | DB-021 | QA | D3 §14 | L | |

### Phase 9 — Invoice Read UX

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| MOD-INV-001 | InvoiceService list/get/outstanding | | P0 | DB-017 | BE | D2 §21 | L | |
| MOD-INV-002 | Invoices list | | P0 | UI-009 | FE | D1 §14 | L | |
| MOD-INV-003 | Invoice detail | job fields DATE KAPAN LOT WEIGHT THAN RATE TOTAL | P0 | MOD-INV-002 | FE | D1 §14 | L | |
| MOD-INV-004 | Print page v1 | chrome-free; R-16 | P2 | MOD-INV-003, FOUND-001 | FE | D2 §63 | L | |
| QA-INV-001 | Invoice tests | 1:1 job; amount formula; no tax fields | P0 | MOD-INV-003 | QA | D1 §4 | M | |

### Phase 10 — Entries & Allocations

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| MOD-ENT-001 | Entry Zod+service+actions | filters+summary | P0 | DB-012, MOD-ACC-001, MOD-CAT-001 | BE | D1 §16 | XL | |
| MOD-ENT-002 | Entries table+summary+filters+export | | P0 | MOD-ENT-001, UI-013 | FE | D1 §16 | XL | Net=Income−Expense |
| MOD-ENT-003 | Add Income/Expense dialogs | category filtered by type; inactive hidden | P0 | MOD-ENT-002 | FE | D1 §18 | L | |
| MOD-ENT-004 | Edit/delete entry | R-22 confirm | P1 | MOD-ENT-003 | FE | D4 §51 | M | |
| MOD-ALC-001 | Allocation RPC service | | P0 | DB-022 | BE | D1 §15 | L | |
| MOD-ALC-002 | Allocation UI | 1:N and N:1 | P0 | MOD-ALC-001, MOD-INV-003 | FE | D1 §15 | XL | remaining shown |
| MOD-ACC-005 | Account detail entries live | | P1 | MOD-ENT-001 | FE | D1 §17 | M | |
| QA-ENT-001 | Entry+allocation tests | type match; over-alloc; expense blocked | P0 | MOD-ALC-002 | QA | D3 §35 | XL | |
| QA-ENT-002 | Balance after CUD | | P0 | MOD-ENT-004 | QA | D1 §32.32 | M | |

Export Route Handler: `API-EXP-001` CSV entries, authz, same filters, cap — P1, M.

### Phase 11 — Reports & Dashboard

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| MOD-RPT-001 | ReportService methods | D2 §30 | P1 | Phase 10 | BE | D1 §21 | XL | server aggregation |
| MOD-RPT-002 | Job report page | R-15 | P1 | MOD-RPT-001 | FE | | L | |
| MOD-RPT-003 | Entry report page | | P1 | MOD-RPT-001 | FE | | L | |
| MOD-RPT-004 | Outstanding report | | P1 | MOD-RPT-001 | FE | D1 §20 | L | |
| MOD-RPT-005 | Salary report | earned vs paid | P1 | MOD-RPT-001 | FE | D1 §19 | L | |
| MOD-RPT-006 | P&L report | | P1 | MOD-RPT-001 | FE | D1 §21 | M | |
| MOD-RPT-007 | Party ledger | | P1 | MOD-RPT-001 | FE | | L | |
| MOD-RPT-008 | Entry ledger | | P1 | MOD-RPT-001 | FE | | M | |
| MOD-DSH-001 | DashboardService aggregations | | P1 | Phase 10 | BE | D2 §31 | L | not fetch-all |
| MOD-DSH-002 | Dashboard UI KPIs+recents | | P1 | MOD-DSH-001, UI-002 | FE | D1 §22 | L | numbers match modules |
| QA-RPT-001 | Report vs module totals | | P1 | MOD-DSH-002 | QA | D1 §22 | L | |

### Phase 12 — Security Hardening

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| SEC-001 | Security headers | CSP report-only, HSTS, XCTO, RP, PP | P0 | Phase 5 | Sec | D3 §51–52 | M | headers present |
| SEC-002 | CSP enforce after test | | P1 | SEC-001 | Sec | D3 §51 | M | app still works |
| SEC-003 | Login rate limit | platform or middleware | P1 | AUTH-007 | Sec | D3 §29 | M | |
| SEC-004 | Export rate limit | | P1 | API-EXP-001 | Sec | D3 §55 | S | |
| SEC-005 | Cookie Secure prod | | P0 | AUTH-002 | Sec | D3 §23 | S | |
| SEC-006 | Dependency audit | | P0 | — | Sec | D3 §50 | S | |
| SEC-007 | IDOR suite | lot/invoice number not authz | P0 | Phase 9 | QA | D3 §18 | M | |
| SEC-008 | XSS/SQLi suite | | P0 | Phase 10 | QA | D3 §69 | L | |
| SEC-009 | Bundle secret scan | | P0 | FOUND-009 | Sec | D3 §7 | S | |
| QA-SEC-001 | Security acceptance §70 | | P0 | SEC-008 | QA | D3 §70 | XL | checklist signed |

### Phase 13 — Testing / QA (full)

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| QA-001 | E2E critical path | Section 14 | P0 | Phase 11 | QA | D1 §31 | XL | |
| QA-002 | Responsive pass | all screens | P1 | QA-001 | QA | D5 §33 | L | |
| QA-003 | A11y pass | WCAG practices | P1 | QA-002 | QA | D5 §34 | L | |
| QA-004 | Regression pack CI | | P0 | QA-001 | QA | | M | |
| QA-005 | UAT with business | invoice sample, reports | P0 | FOUND-001, QA-001 | QA | D1 | L | sign-off |

### Phase 14 — Performance

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| PERF-001 | Seed 1k/5k volume staging | | P1 | Phase 11 | QA | D2 §58 | M | |
| PERF-002 | Explain analyze list queries | add indexes only if needed | P1 | PERF-001 | DB | D4 §40 | M | p95 acceptable |
| PERF-003 | Dashboard query budget | | P1 | MOD-DSH-001 | BE | D1 §26 | M | |
| PERF-004 | FE list virtualization only if needed | | P3 | PERF-001 | FE | D5 §43 | S | do not premature |

### Phase 15 — Production

| ID | Task | Description | Pri | Deps | Layer | Req | Cx | Completion criteria |
|---|---|---|---|---|---|---|---|---|
| OPS-002 | Prod Supabase project | | P0 | QA-SEC-001 | Ops | D2 §55 | M | isolated |
| OPS-003 | Apply migrations prod | | P0 | OPS-002 | DB | D4 §73 | L | version match |
| OPS-004 | Secrets on host | | P0 | OPS-002 | Sec | D3 §48 | S | |
| OPS-005 | Backups + restore drill | | P0 | OPS-003 | Ops | D4 §72 | L | restored staging |
| OPS-006 | HTTPS deploy Next.js | | P0 | OPS-004 | Ops | D3 §53 | M | |
| OPS-007 | Bootstrap prod admin | | P0 | OPS-003 | Ops | R-18 | S | |
| OPS-008 | Smoke prod | | P0 | OPS-007 | QA | | M | |
| OPS-009 | Monitoring/logs | | P1 | OPS-006 | Ops | D2 §57 | M | |
| OPS-010 | Runbook DR/rollback | | P0 | OPS-005 | Docs | | M | |
| OPS-011 | Tag v1.0.0 | | P0 | OPS-008 | Git | | XS | |

---

## 24. Critical Path

```text
FOUND-001 (decisions)
  → FOUND-004..010 (repo/env)
  → DB-001..015 (schema+RLS)
  → AUTH-001..011 (login)
  → API-001..004 (validation/errors)
  → UI-001..015 (shell+primitives)
  → MOD-PTY + MOD-EMP + MOD-ACC + MOD-CAT
  → DB-019 + MOD-JOB-002 (atomic job+invoice)     ← longest / riskiest
  → DB-020 + sub-jobs
  → DB-021 + employee work
  → DB-022 + allocations
  → entries UI
  → reports/dashboard
  → QA-SEC-001 + QA-001
  → OPS-003..008
```

**Blocks many tasks:** FOUND-001, DB-015 RLS, AUTH-005, UI-002 shell, MOD-PTY-002, DB-019 job+invoice RPC.

**Implement first:** decisions, schema, auth, design system, parties.

**Parallel after SP2:** four master modules.

**Risky / early validation:** DB-019, DB-020, DB-021, DB-022 (write concurrency tests the same week as the RPC, not at the end).

---

## 25. Requirement Traceability Matrix

| Requirement | Source | Module | Database | API | Frontend | Security | Tests | Tasks |
|---|---|---|---|---|---|---|---|---|
| Admin auth via Supabase | D1 §6 | Identity | users | AUTH-* | `/auth/login` | D3 §2 | QA-AUTH-001 | AUTH-007, AUTH-011 |
| Users name + email | D4 §5; D5 §31 | Identity | users.name, users.email | users APIs | `/users`, topbar | unique email; no password | QA-USR | DB-003, MOD-USR-* |
| No password in users | D1 §6 | Identity | users | — | — | D3 §2 | schema test | DB-003 |
| Auto Lot Number | R-08 | Jobs | lot_number unique | createJob RPC | `/jobs/new` read-only | D3 §61 | concurrency | DB-018, DB-019 |
| Atomic invoice number | R-09 | Invoices | invoice_number unique | createJob RPC | display | D3 §61 | concurrency | DB-018, DB-019 |
| Party CRUD + price | D1 §7 | Parties | parties | API-PTY-* | /parties | validation | QA-PTY-001 | MOD-PTY-* |
| Party price → job default | D1 §7 | Jobs | job_works.price | createJob | Job form | D3 §38 | QA-JOB-001 | MOD-JOB-008 |
| Employee commission snapshot | D1 §8,11 | Work | work.commission | addWork RPC | Work form | D3 §37 | QA-JOB-001 | DB-021, MOD-JOB-011 |
| Earning = done×commission | D1 §11 | Work | earning | RPC | display | D3 §37 | unit+RPC | DB-021 |
| Lot number unique | D1 §9 | Jobs | UNIQUE auto `J01` | createJob | display after save | D3 §61 | conflict test | DB-006, DB-018 |
| Job types Sarin/Dropping/Galaxy | D1 §9 | Jobs | enum | Zod | Select | enum | QA-JOB | DB-002 |
| Job status P/P/C | D1 §9,12 | Jobs | enum | picker + optional automation | Badge + Select | — | QA-JOB | R-05, MOD-JOB-012 |
| Kapan ≠ lot | D1 §5 | Jobs | kapan_number | — | fields | — | UI | MOD-JOB-008 |
| Weight decimal carats | D1 §9; R-10 | Jobs | numeric(14,3) | Zod | input + `ct` | numeric | QA | DB-006 |
| Sub-job J01-A | D1 §10 | Jobs | sequence_no | display fn | hierarchy | not authz | unit | DB-025 |
| Sum sub than ≤ job than | D1 §10 | Jobs | RPC | createSubJob | remaining | D3 §12 | concurrency | DB-020 |
| Multiple work rows / employee | D1 §11 | Work | no unique emp | addWork | table | — | QA | MOD-JOB-011 |
| Sum done ≤ sub than | D1 §11 | Work | RPC | addWork | remaining | D3 §13 | concurrency | DB-021 |
| Search lot/sub-job | D1 §13 | Jobs | view | listJobs | search | bounded | QA | MOD-JOB-003,007 |
| Filters type/status/employee/party | D1 §13 | Jobs | indexes+join | listJobs | FilterBar | — | QA | MOD-JOB-007 |
| 1 job 1 invoice | D1 §14 | Invoices | UNIQUE job_work_id | create job RPC | no extra create | D3 §61 | QA-INV-001 | DB-009, DB-019 |
| Invoice at job create | D1 §14 | Invoices | RPC | createJob | — | atomic | QA-JOB | DB-019 |
| Amount=than×price | D1 §14 | Invoices | RPC | server | display | D3 §39 | QA-INV | DB-019 |
| No GST/discount/due | D1 §4 | Invoices | no columns | — | no fields | — | schema | DB-009 |
| Allocations M:N | D1 §15 | Settle | allocations | allocate RPC | dialog | D3 §35 | QA-ENT-001 | DB-022, MOD-ALC-* |
| Entries income/expense | D1 §16 | Acct | entries | createEntry | Entries tab | D3 §34 | QA-ENT | MOD-ENT-* |
| Account required + balance formula | D1 §17 | Acct | accounts+view | listAccounts | table | derived | QA-ACC | MOD-ACC-*, DB-017 |
| Category type match | D1 §18 | Acct | trigger | Zod | filtered select | D3 §34 | QA-ENT | DB-023 |
| Inactive not in dropdowns | D1 §18 | Acct | trigger insert | filter | select | — | QA | MOD-ENT-003 |
| Cannot delete acct/cat with entries | D1 §17–18 | Acct | RESTRICT | delete | message | D3 §40 | QA | DB-010–012 |
| Salary = expense entry | D1 §19 | Acct | entries.employee_id | createEntry | employee field | — | QA-RPT | MOD-ENT-003 |
| Outstanding derived | D1 §20 | Reports | view | reports | pages | D3 §36 | QA-RPT | DB-017, MOD-RPT-004 |
| Reports list | D1 §21 | Reports | sources §71 | ReportService | /reports/* | export authz | QA-RPT | MOD-RPT-* |
| Dashboard KPIs | D1 §22 | Dash | aggregations | DashboardService | /dashboard | same sources | QA-RPT-001 | MOD-DSH-* |
| Brand UI | D1 §23 | Shell | — | — | tokens | — | visual | UI-001 |
| Nav structure | D1 §24 | Shell | — | — | sidebar | hide≠authz | QA | UI-003 |
| Forms/tables UX | D1 §25 | All | — | — | primitives | — | QA-UI | UI-006–015 |
| Pagination/index accounting | D1 §26 | All | indexes | pageSize | pagination | max 100 | PERF | DB-012, API-003 |
| Users admin | D1 nav; D5 §31 | Users | users.name/email | users APIs | `/users` | service role server | QA-USR | MOD-USR-* |
| RLS | D3 | All | policies | — | — | D3 §6 | QA-DB | DB-015 |
| IDOR | D3 §18 | All | UUID | getById | routes | D3 | SEC-007 | AUTH-005 |
| Concurrency | D3 §14 | Jobs/Alloc | RPC | — | errors | D3 | QA-JOB-002 | DB-020–022 |
| Headers/HTTPS | D3 §52–53 | Ops | — | — | — | D3 | header scan | SEC-001, OPS-006 |
| FE states | D5 | All screens | — | — | every page | — | QA | UI-015 + module UIs |
| A11y | D5 §34 | All | — | — | components | — | QA-003 | UI-* |
| Server Components default | D2 §5 | All | — | RSC | pages | less JS | review | FOUND-005 |

**Unmapped / flagged:** exact print mm dimensions (D1 §30.1) — flagged M-09, task MOD-INV-004 P2. Roles beyond admin — out of v1, R-28. File uploads — none. Audit actor UI — R-19, not implemented.

---

## 26. Blocking Gaps

Schema-blocking decisions from the previous plan are **closed**. Migrations may proceed.

Remaining items that can still break financial correctness if implemented wrongly (but the policy is decided):

1. **Invoice delete/update policy** (R-21) — still recommended blocked delete; confirm before building a delete button.  
2. **First admin process** — R-18 must be executed (AUTH-011), including `name` + `email` on `users`.  
3. **Job Than/Price edit** — `updateJob` must recalc invoice amount in the same transaction and reject illegal reductions. Do not edit amount only in the UI.

---

## 27. Non-Blocking Gaps

Can ship v1 with recommendations:

- Invoice print dimensions and whether sample rows are sub-jobs (R-16; D5 §23)  
- Exact report column extras (R-15; D5 §30)  
- P&L presentation beyond Income−Expense  
- Party/employee mobile uniqueness — **not unique** (R-13 closed)  
- Zero price (R-14)  
- Timezone (R-27) — recommended Asia/Kolkata  
- Hosting vendor (R-17)  
- Backup retention legal policy  
- Future roles  
- Audit log table  
- Opening-balance after activity (R-23)  
- Employee work edit after completed (R-20)  
- Dashboard default period  
- Invoice DESCRIPTION field (no DB column)  
- Sidebar profile image (use initials from `users.name`)  
- Export Excel vs CSV (CSV sufficient)  
- Monitoring vendor  

---

## 28. Final Implementation Sequence

Execute in this order. Do not start a later item if its dependencies are red.

1. **FOUND-001** is complete for schema decisions. Remaining open items are non-blocking.  
2. **FOUND-004–010, OPS-001** repository and env  
3. **DB-001–016** tables, FKs, RLS  
4. **DB-017–025** views + RPCs + type match trigger  
5. **DB-026–027, QA-DB-001** types and DB tests  
6. **AUTH-001–011, QA-AUTH-001** login works  
7. **API-001–007** validation/error/logging  
8. **UI-001–017** shell and primitives; restyle login  
9. **MOD-USR-*** users  
10. **MOD-PTY / MOD-EMP / MOD-ACC / MOD-CAT** in parallel  
11. **MOD-JOB-001–012** including atomic invoice; **QA-JOB-001/002**  
12. **MOD-INV-001–003** invoice read UX  
13. **MOD-ENT + MOD-ALC** including export; **QA-ENT-***  
14. **MOD-RPT + MOD-DSH**; **QA-RPT-001**  
15. **SEC-001–009, QA-SEC-001**  
16. **QA-001–005** e2e, a11y, UAT  
17. **PERF-001–003**  
18. **OPS-002–011** production  
19. **MOD-INV-004** print polish when business confirms template  

### Vertical-slice reminder (every module)

```text
Zod → Service → requireActiveAdmin Action → RPC/SQL
  → Route → UI + all states → tests → DoD
```

### What “complete” means for the project

The project is complete when:

- All 12 tables exist with specified constraints and RLS  
- Admin can execute the full lifecycle in Section 3.1 without spreadsheet workarounds  
- PRD §31 acceptance bullets are all true  
- Security §70, Architecture §68, Database §75, Frontend §53 gates pass  
- Production backup restore has been demonstrated  
- No out-of-scope modules (materials/GST/quotations) exist in code or schema  

---

*End of Master Implementation Plan. Source documents remain the requirement authority; this plan is the execution authority. Do not code until Phase 0 decisions affecting schema are accepted or Section 5 recommendations are formally adopted.*
