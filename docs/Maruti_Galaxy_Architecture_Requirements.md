# Maruti Galaxy --- Architecture Requirements Document

**Project:** Maruti Galaxy\
**Business:** Diamond polishing and cutting / job-work operations\
**Frontend:** Next.js\
**Backend / Database / Auth:** Supabase + PostgreSQL\
**Status:** Baseline / Phase 2\
**Prepared:** 2026-08-15

------------------------------------------------------------------------

# 1. Purpose

This document defines the technical architecture required to implement
the Maruti Galaxy product requirements.

It translates the approved PRD into:

-   Application architecture
-   Frontend architecture
-   Supabase architecture
-   Data-access architecture
-   Authentication architecture
-   Module boundaries
-   Business-logic placement
-   Server/client responsibilities
-   Validation strategy
-   Error handling
-   State management
-   Search/filter architecture
-   Reporting architecture
-   File/print considerations
-   Performance requirements
-   Deployment architecture
-   Maintainability requirements

This document must remain aligned with the PRD and must not introduce
business functionality that has not been agreed.

------------------------------------------------------------------------

# 2. Architectural Principles

The application should follow these principles:

## 2.1 Single Source of Truth

PostgreSQL/Supabase is the authoritative source for:

-   Parties
-   Employees
-   Jobs
-   Sub Jobs
-   Employee Work
-   Invoices
-   Accounts
-   Categories
-   Entries
-   Invoice allocations

Derived values such as account balances and outstanding should be
calculated from authoritative records.

## 2.2 Business Logic Must Not Live Only in the UI

Critical business rules must not rely solely on client-side validation.

Examples:

``` text
Main Job Than
    ↓
Sub Job Than cannot exceed remaining Main Job Than

Sub Job Than
    ↓
Employee Done Than cannot exceed remaining Sub Job Than

Entry Type
    ↓
Category Type must match

Invoice
    ↓
Allocation cannot exceed remaining balance
```

The frontend should provide immediate feedback, but the server/database
layer must protect the final state.

## 2.3 Keep Modules Independent

Each business area should have clear boundaries:

``` text
Authentication
Dashboard
Parties
Employees
Jobs
Invoices
Accounting
Reports
Users
```

Avoid a large shared service containing unrelated business logic.

## 2.4 Prefer Server-Side Data Operations

Large lists, searches, filters, sorting, pagination, and reporting
should be handled through the server/database rather than downloading
the complete dataset into the browser.

## 2.5 Preserve Historical Records

Employee work must preserve the commission used at the time of work.

Changing an employee's current commission must not alter historical
earning records.

------------------------------------------------------------------------

# 3. High-Level Architecture

Recommended architecture:

``` text
┌──────────────────────────────────────────────┐
│                  Browser                     │
│                                              │
│  Next.js UI                                  │
│  Server Components                           │
│  Client Components                           │
│  Forms / Tables / Dialogs                    │
└──────────────────────┬───────────────────────┘
                       │
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────┐
│                 Next.js                      │
│                                              │
│  App Router                                  │
│  Route Handlers / Server Actions             │
│  Server-side Services                        │
│  Validation                                  │
│  Authorization checks                        │
└──────────────────────┬───────────────────────┘
                       │
                       │ Supabase
                       ▼
┌──────────────────────────────────────────────┐
│                 Supabase                     │
│                                              │
│  Auth                                        │
│  PostgreSQL                                  │
│  Row Level Security                          │
│  Database Functions / Triggers where needed  │
└──────────────────────────────────────────────┘
```

The browser must not be treated as a trusted environment.

------------------------------------------------------------------------

# 4. Recommended Next.js Structure

The project should use the Next.js App Router.

Recommended high-level structure:

``` text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── parties/
│   │   ├── employees/
│   │   ├── invoices/
│   │   ├── accounting/
│   │   │   ├── entries/
│   │   │   ├── accounts/
│   │   │   └── categories/
│   │   ├── reports/
│   │   └── users/
│   │
│   └── api/
│       └── ...
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── jobs/
│   ├── parties/
│   ├── employees/
│   ├── invoices/
│   ├── accounting/
│   └── reports/
│
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── validation/
│   ├── permissions/
│   ├── utils/
│   └── formatters/
│
├── services/
│   ├── parties/
│   ├── employees/
│   ├── jobs/
│   ├── invoices/
│   ├── accounting/
│   └── reports/
│
├── types/
│   ├── database.ts
│   ├── jobs.ts
│   ├── invoices.ts
│   └── accounting.ts
│
└── hooks/
```

The exact folder names may change during implementation, but business
modules should remain clearly separated.

------------------------------------------------------------------------

# 5. Server and Client Component Strategy

## 5.1 Server Components

Use Server Components by default for:

-   Page-level data loading
-   Dashboard metrics
-   Job lists
-   Party lists
-   Employee lists
-   Invoice lists
-   Accounting lists
-   Reports
-   Account summaries
-   Category lists

Advantages:

-   Less client JavaScript.
-   Direct server-side data access.
-   Better performance for data-heavy pages.
-   Reduced exposure of implementation details.

## 5.2 Client Components

Use Client Components only where interactivity requires them:

-   Dialogs
-   Dropdown interactions
-   Search input behavior
-   Filter controls
-   Tabs
-   Expand/collapse sub-jobs
-   Employee work entry forms
-   Inline UI updates
-   Interactive tables
-   Date pickers
-   Toast notifications

Do not turn entire pages into Client Components simply because one
section needs interactivity.

------------------------------------------------------------------------

# 6. Supabase Architecture

Supabase provides:

``` text
Supabase
├── Authentication
├── PostgreSQL
├── Row Level Security
└── Database Functions / Triggers where required
```

Supabase should be the primary backend platform.

The application should use:

-   Supabase Auth for authentication.
-   PostgreSQL for persistent data.
-   RLS for authorization boundaries.
-   Database constraints for structural integrity.
-   Database functions/transactions for operations that require
    atomicity.

------------------------------------------------------------------------

# 7. Supabase Authentication

Authentication flow:

``` text
Login Page
    ↓
Supabase Auth
    ↓
Authenticated Session
    ↓
Next.js Server
    ↓
Authorization Check
    ↓
Application
```

The application must not implement its own password storage.

Do not create:

``` text
password
password_hash
password_confirmation
```

in the `users` application table.

Supabase Auth owns credential storage.

------------------------------------------------------------------------

# 8. Users Architecture

The application-level table is:

``` text
users
```

It represents application profile/role information.

Supabase Auth owns authentication identity.

Conceptually:

``` text
Supabase Auth User
        │
        │ auth user id
        ▼
users
```

The application should use the authenticated user's ID to identify the
corresponding application user.

Initial role:

``` text
Admin
```

The architecture should allow additional roles later without requiring a
complete redesign.

------------------------------------------------------------------------

# 9. Authorization Architecture

Authorization should be enforced at multiple layers.

## Layer 1 --- UI

Hide navigation/actions that the current role cannot use.

## Layer 2 --- Server

Every protected mutation and sensitive server operation must verify
authentication and authorization.

## Layer 3 --- Database

RLS must prevent unauthorized direct access to protected records.

The UI is not a security boundary.

------------------------------------------------------------------------

# 10. Route Protection

All authenticated application routes should be protected.

Examples:

``` text
/dashboard
/jobs
/parties
/employees
/invoices
/accounting/*
/reports
/users
```

Unauthenticated users should be redirected to:

``` text
/login
```

Public access should be limited to the login/authentication surface
unless a future requirement explicitly adds public pages.

------------------------------------------------------------------------

# 11. Domain Architecture

The system is divided into the following domains:

``` text
Identity
Party Management
Employee Management
Job Management
Invoice Management
Accounting
Reporting
```

------------------------------------------------------------------------

# 12. Party Domain

Responsibilities:

-   Create party.
-   Update party.
-   Search party.
-   Retrieve party.
-   Retrieve party jobs.
-   Retrieve party invoices.
-   Retrieve party outstanding.
-   Retrieve party accounting information.

Service boundary:

``` text
PartyService
├── createParty()
├── updateParty()
├── getParty()
├── listParties()
└── getPartySummary()
```

Party price is stored independently from jobs.

------------------------------------------------------------------------

# 13. Employee Domain

Responsibilities:

-   Create employee.
-   Update employee.
-   Activate/deactivate employee.
-   Search employee.
-   Retrieve employee work history.
-   Retrieve employee earning totals.

Service boundary:

``` text
EmployeeService
├── createEmployee()
├── updateEmployee()
├── setEmployeeStatus()
├── listEmployees()
└── getEmployeeWorkHistory()
```

Employee commission changes must not modify historical employee-work
records.

------------------------------------------------------------------------

# 14. Job Domain

The Job domain is the core operational domain.

Responsibilities:

-   Create main job.
-   Update job.
-   Search/filter jobs.
-   Create sub-jobs.
-   Update sub-jobs.
-   Track job status.
-   Track employee work.
-   Calculate remaining Than.
-   Generate sub-job display identifiers.
-   Maintain work history.

Recommended service boundaries:

``` text
JobService
├── createJob()
├── updateJob()
├── getJob()
├── listJobs()
└── updateJobStatus()

SubJobService
├── createSubJob()
├── updateSubJob()
├── listSubJobs()
└── getSubJob()

EmployeeWorkService
├── addWork()
├── updateWork()
├── deleteWork()
└── getWorkHistory()
```

------------------------------------------------------------------------

# 15. Main Job Creation Flow

``` text
Admin opens Create Job
        ↓
Select Party
        ↓
Fetch Party Price
        ↓
Populate Job Price
        ↓
Admin optionally edits Price
        ↓
Enter Job Type
        ↓
Enter Than
        ↓
Enter Kapan Number (required)
        ↓
Enter Weight (decimal carats)
        ↓
Create Main Job
        ↓
System assigns Lot Number (J01, …) and Invoice Number (INV-0001, …)
        ↓
Create associated Invoice in the same transaction
```

The final Job Price is stored on the job and becomes the authoritative
price for that job.

------------------------------------------------------------------------

# 16. Sub Job Creation Flow

``` text
Open Main Job J01
        ↓
Create Sub Job
        ↓
Check remaining Main Job Than
        ↓
Enter Sub Job Than
        ↓
Validate quantity
        ↓
Generate sequence_no
        ↓
Display J01-A / J01-B / ...
        ↓
Save
```

The sequence number should be generated safely so concurrent creation
does not create duplicate sub-job numbers.

------------------------------------------------------------------------

# 17. Employee Work Flow

``` text
Open Sub Job
       ↓
Add Done Work
       ↓
Select Employee
       ↓
Enter Done Than
       ↓
Read Employee Commission
       ↓
Validate Remaining Than
       ↓
Calculate Earning
       ↓
Store Work + Commission Snapshot + Earning
```

The operation should be atomic.

If two users attempt to allocate the remaining Than simultaneously, the
backend must prevent the combined amount from exceeding the allowed
quantity.

------------------------------------------------------------------------

# 18. Quantity Integrity

Three levels exist:

``` text
Main Job Than
      ↓
Sub Job Than
      ↓
Employee Done Than
```

Rules:

``` text
SUM(SubJob.Than) <= MainJob.Than

SUM(EmployeeWork.DoneThan) <= SubJob.Than
```

These are critical business constraints.

The application should validate them before submission, but the final
operation must be protected server-side/database-side.

------------------------------------------------------------------------

# 19. Job Status Architecture

Statuses:

``` text
Pending
Progress
Completed
```

The UI must provide a **status picker** on job and sub-job create/edit
forms. Default is `Pending`.

Allowed transitions are any of the three approved values. There is no
Cancelled/Closed status.

Quantity automation remains a convenience, not the only path:

``` text
Pending
   ↓  first work recorded (if still Pending)
Progress
   ↓  remaining Than = 0
Completed
```

Admin may also set status explicitly from the picker. Automation must
not invent unapproved status values. Quantity rules (sub-job Than,
Done Than) are enforced regardless of the selected status.

------------------------------------------------------------------------

# 20. Job Search Architecture

Job search should query both:

``` text
job_works.lot_number
```

and:

``` text
sub_jobs derived/display number
```

The UI may present one search box:

``` text
Search Lot / Sub Job
```

The server/data layer determines whether the search matches a main job
or sub-job.

Filters:

``` text
Job Type
Job Status
Employee
Party
```

Filtering by employee requires joining through:

``` text
job_works
 → sub_jobs
 → sub_job_employee_work
 → employees
```

------------------------------------------------------------------------

# 21. Invoice Architecture

Current business rule:

``` text
One Main Job → One Invoice
```

Invoice creation is triggered by the agreed job-creation workflow.

Invoice amount:

``` text
Job Than × Final Job Price
```

No tax, discount, or due date processing.

The invoice service should own invoice-number generation and invoice
creation rather than placing invoice logic directly in UI components.

Recommended service:

``` text
InvoiceService
├── createInvoiceForJob()
├── getInvoice()
├── listInvoices()
├── updateInvoice()
├── deleteInvoice()
└── getInvoiceOutstanding()
```

------------------------------------------------------------------------

# 22. Invoice Allocation Architecture

Financial settlement is many-to-many:

``` text
Entries
    ↕
entry_invoice_allocations
    ↕
Invoices
```

Supported cases:

``` text
One Entry → Many Invoices
Many Entries → One Invoice
```

Allocation must be atomic.

Example:

``` text
Entry = ₹75,000

Invoice A = ₹20,000
Invoice B = ₹30,000
Invoice C = ₹25,000
```

The allocation operation must verify available balances before writing.

------------------------------------------------------------------------

# 23. Accounting Architecture

Accounting is organized into:

``` text
Entries
Accounts
Categories
```

The accounting domain should have one service boundary:

``` text
AccountingService
├── Entries
├── Accounts
└── Categories
```

Separate internal service modules should still be used for
maintainability.

------------------------------------------------------------------------

# 24. Entry Creation

Flow:

``` text
Select Entry Type
        ↓
Select Account
        ↓
Select Category
        ↓
Enter Amount
        ↓
Select Date
        ↓
Optional Remarks
        ↓
Validate
        ↓
Create Entry
```

Validation:

``` text
Entry Type ∈ {Income, Expense}

Category.Type = Entry.Type

Account.Status = Active

Category.Status = Active

Amount > 0
```

------------------------------------------------------------------------

# 25. Account Balance Architecture

Account balance is derived:

``` text
Current Balance =
Opening Balance
+ Income
- Expense
```

Do not create a second manually maintained balance source unless
required for performance after profiling.

If aggregation becomes expensive at scale, optimized database queries or
materialized/reporting structures may be introduced without changing the
business model.

------------------------------------------------------------------------

# 26. Category Architecture

Categories are typed:

``` text
Income
Expense
```

The backend must enforce:

``` text
Entry.Type = Category.Type
```

Inactive categories cannot be used for new entries.

------------------------------------------------------------------------

# 27. Employee Earning Architecture

Employee earnings are operational records, not a separate accounting
table.

Source:

``` text
sub_job_employee_work
```

Calculation:

``` text
Done Than × Commission Snapshot
```

Actual employee payment is a separate financial concept and is recorded
as:

``` text
entries
entry_type = Expense
```

This architecture avoids an unnecessary employee-payment table while
preserving both:

``` text
Employee Earned
Employee Paid
```

------------------------------------------------------------------------

# 28. Outstanding Architecture

Outstanding is derived from:

``` text
Invoice Amount
-
Invoice Allocations
```

For each invoice:

``` text
Outstanding =
Invoice.amount
-
SUM(entry_invoice_allocations.amount)
```

Party outstanding:

``` text
SUM(all invoice outstanding for party)
```

Outstanding should not be stored as a manually editable number.

------------------------------------------------------------------------

# 29. Ledger Architecture

Party ledger should be derived from relevant invoices, allocations, and
accounting entries.

The ledger service should expose normalized records to the frontend
rather than requiring the UI to reconstruct accounting relationships.

Recommended:

``` text
LedgerService
├── getPartyLedger()
├── getEntryLedger()
└── getAccountLedger()
```

------------------------------------------------------------------------

# 30. Reporting Architecture

Reports should be implemented as read-oriented queries/services.

Recommended:

``` text
ReportService
├── getJobWorkReport()
├── getEntryReport()
├── getOutstandingReport()
├── getSalaryReport()
└── getProfitLossReport()
```

Reports should use server-side filtering and aggregation.

They should not duplicate business records into separate report tables
unless future scale requirements justify it.

------------------------------------------------------------------------

# 31. Dashboard Architecture

Dashboard is a read-only aggregation layer.

Recommended data groups:

``` text
Dashboard
├── Job KPIs
├── Than KPIs
├── Employee Earnings
├── Financial KPIs
├── Outstanding
├── Recent Jobs
└── Recent Entries
```

Dashboard queries should be optimized independently from transactional
forms.

------------------------------------------------------------------------

# 32. Database Access Layer

Database access should be centralized.

Avoid scattered direct Supabase calls across arbitrary UI components.

Preferred pattern:

``` text
UI
 ↓
Server Action / Route Handler
 ↓
Domain Service
 ↓
Supabase / PostgreSQL
```

For read-heavy server-rendered pages:

``` text
Server Component
 ↓
Domain Service
 ↓
Supabase / PostgreSQL
```

------------------------------------------------------------------------

# 33. Server Actions vs Route Handlers

Use Server Actions for internal application mutations where they provide
a clean boundary:

``` text
createParty
updateParty
createJob
createSubJob
addEmployeeWork
createEntry
updateEntry
```

Use Route Handlers where an HTTP endpoint is required for:

-   External integrations.
-   File/export downloads.
-   Specialized API consumption.
-   Future third-party integrations.

Do not create API endpoints merely to proxy every internal database
query.

------------------------------------------------------------------------

# 34. Transactional Operations

The following operations should be treated as atomic:

### Job creation

Where invoice creation is part of the same agreed creation workflow.

### Employee work creation

Must not save employee work if the quantity constraint fails.

### Invoice allocation

Must not partially allocate an entry.

### Entry mutation

The final accounting state must remain consistent after
create/update/delete.

Where multiple database operations must succeed or fail together, use a
PostgreSQL transaction/function rather than multiple independent client
requests.

------------------------------------------------------------------------

# 35. Validation Architecture

Validation should exist at three levels.

## Level 1 --- UI

Immediate user feedback.

## Level 2 --- Server

Validate all incoming mutation data.

## Level 3 --- Database

Use:

-   NOT NULL
-   UNIQUE
-   CHECK constraints
-   Foreign keys
-   RLS
-   Database functions where required

Critical business rules must not depend exclusively on UI validation.

------------------------------------------------------------------------

# 36. Type Safety

TypeScript types should be generated from the Supabase database schema
where practical.

Recommended:

``` text
types/database.ts
```

Domain-specific types may wrap generated database types:

``` text
types/jobs.ts
types/invoices.ts
types/accounting.ts
```

Avoid manually maintaining duplicate database interfaces when generated
types can be used.

------------------------------------------------------------------------

# 37. Form Architecture

Forms should use reusable components and schema validation.

Recommended conceptual structure:

``` text
Form
├── Field
├── Label
├── Input
├── Select
├── Error
└── Submit
```

Complex forms should separate:

``` text
Form State
Validation
Submission
Server Mutation
UI Feedback
```

------------------------------------------------------------------------

# 38. Error Handling

Errors should be classified.

## Validation Error

Example:

``` text
Sub Job Than exceeds remaining Main Job Than.
```

Display inline.

## Authorization Error

Display:

``` text
You do not have permission to perform this action.
```

## Not Found

Display a clear not-found state.

## Conflict

Example:

``` text
This Lot Number is already in use.
```

## Database / System Error

Show a safe user-facing message and log technical details server-side.

Never expose raw SQL errors, database credentials, stack traces, or
internal infrastructure details to users.

------------------------------------------------------------------------

# 39. Loading and Empty States

Every data-heavy module must have:

-   Initial loading state.
-   Table loading state.
-   Empty state.
-   Error state.
-   Retry path where appropriate.

Examples:

``` text
No jobs found.
No entries match the selected filters.
No employees found.
No invoices found.
```

------------------------------------------------------------------------

# 40. Pagination

Pagination should be implemented server-side for:

-   Jobs.
-   Parties.
-   Employees.
-   Invoices.
-   Entries.
-   Accounts.
-   Categories.
-   Reports where datasets can become large.

The API/service should return:

``` text
records
page
pageSize
totalCount
```

or an equivalent pagination structure.

------------------------------------------------------------------------

# 41. Search Debouncing

Search inputs should avoid sending a request for every keystroke.

Use a small debounce interval for interactive search where appropriate.

The final implementation should balance responsiveness and database
load.

------------------------------------------------------------------------

# 42. Filtering

Filters should be represented in URL/search parameters where practical.

Example:

``` text
/jobs?search=J01&status=Progress&jobType=Sarin&party=...
```

Benefits:

-   Refresh-safe state.
-   Shareable filtered views.
-   Browser navigation.
-   Easier report/export consistency.

------------------------------------------------------------------------

# 43. URL State

List-page state should preferably use URL parameters for:

-   Search.
-   Filters.
-   Page.
-   Sort.
-   Date range.

Modal open state and short-lived UI state can remain client-side.

------------------------------------------------------------------------

# 44. Caching and Revalidation

Read-heavy reference data may be cached carefully:

-   Active employees.
-   Active parties.
-   Active accounts.
-   Active categories.

Highly dynamic financial and job data should use appropriate
revalidation/invalidation after mutations.

After mutations:

``` text
Create / Update / Delete
        ↓
Invalidate affected data
        ↓
Refresh affected view
```

Do not rely on stale cached balances or outstanding amounts.

------------------------------------------------------------------------

# 45. Concurrency

Concurrency matters for:

-   Sub-job sequence generation.
-   Than allocation.
-   Employee Done Than allocation.
-   Invoice allocation.
-   Invoice numbering.
-   Entry creation.

The backend must assume multiple browser tabs/users may submit changes
simultaneously.

Use database constraints and atomic database operations to protect
critical invariants.

------------------------------------------------------------------------

# 46. Number Generation

## Main Job Lot Number

The business uses values such as:

``` text
J01
J02
J03
```

Lot Number is **automatically generated** by an atomic database sequence
inside job creation. The UI must not treat Lot Number as a required
manual input. The generated value is displayed after save and is
immutable.

## Invoice

Invoice number is automatically generated by an atomic database sequence
inside the same job-creation transaction.

Approved format:

``` text
INV-0001
INV-0002
```

## Sub Job

Sub-job sequence is numeric internally:

``` text
1
2
3
```

Display:

``` text
J01-A
J01-B
J01-C
```

------------------------------------------------------------------------

# 47. Responsive Architecture

The application must support:

-   Desktop.
-   Laptop.
-   Tablet.
-   Mobile.

Desktop is the primary operational environment.

Responsive patterns:

``` text
Desktop:
Full tables + sidebar

Tablet:
Condensed tables + responsive actions

Mobile:
Horizontal table scrolling / detail drawers / compact filters
```

The data architecture must not depend on desktop-only assumptions.

------------------------------------------------------------------------

# 48. UI Component Architecture

Create reusable primitives for:

``` text
Button
Input
Select
DatePicker
Dialog
Drawer
Tabs
Badge
Table
Pagination
Dropdown
Tooltip
Toast
EmptyState
ConfirmDialog
```

Business-specific components should sit above these primitives.

Example:

``` text
UI Primitive
    ↓
Data Table
    ↓
Job Table
```

This prevents each module from developing its own inconsistent UI
system.

------------------------------------------------------------------------

# 49. Job Component Architecture

Recommended:

``` text
jobs/
├── JobTable
├── JobFilters
├── JobForm
├── JobDetails
├── SubJobList
├── SubJobCard
├── SubJobForm
├── EmployeeWorkTable
├── EmployeeWorkForm
├── JobStatusBadge
└── JobSummary
```

------------------------------------------------------------------------

# 50. Accounting Component Architecture

Recommended:

``` text
accounting/
├── AccountingTabs
├── EntryTable
├── EntryFilters
├── EntryForm
├── EntrySummary
├── AccountTable
├── AccountForm
├── AccountSummary
├── AccountDetails
├── CategoryTable
├── CategoryForm
└── AccountingExport
```

------------------------------------------------------------------------

# 51. Invoice Component Architecture

Recommended:

``` text
invoices/
├── InvoiceTable
├── InvoiceDetails
├── InvoicePrint
├── InvoiceStatusBadge
├── InvoiceAllocation
└── InvoiceSummary
```

The invoice print view should be isolated from the operational invoice
detail UI.

------------------------------------------------------------------------

# 52. Supabase Client Separation

Use separate clients for appropriate execution contexts:

``` text
Browser Supabase Client
Server Supabase Client
Admin / Service Role Client
```

The service-role key must never be exposed to the browser.

If an elevated server-side client is required, it must only be used in
trusted server execution paths.

------------------------------------------------------------------------

# 53. Environment Variables

Public configuration may use:

``` text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Sensitive server-only secrets must not use `NEXT_PUBLIC_`.

Never expose:

``` text
SUPABASE_SERVICE_ROLE_KEY
```

to the browser.

------------------------------------------------------------------------

# 54. Database Migrations

Database changes must be version-controlled through migrations.

Do not manually modify production schema without a migration.

Recommended process:

``` text
Local Migration
      ↓
Test
      ↓
Review
      ↓
Staging
      ↓
Production
```

Every schema change should be reproducible.

------------------------------------------------------------------------

# 55. Development Environments

Recommended:

``` text
Local
 ↓
Staging
 ↓
Production
```

The production Supabase project must not be used for casual development.

Local development should use environment-specific credentials.

------------------------------------------------------------------------

# 56. Deployment Architecture

Recommended production:

``` text
User
 ↓
HTTPS
 ↓
Next.js Deployment
 ↓
Supabase
 ├── Auth
 └── PostgreSQL
```

Production deployment should have:

-   HTTPS.
-   Environment variables managed by deployment platform.
-   Production Supabase project.
-   Database migrations.
-   Build verification.
-   Error monitoring.

------------------------------------------------------------------------

# 57. Observability

Production should capture:

-   Server errors.
-   Failed mutations.
-   Authentication failures where appropriate.
-   Important business-operation failures.
-   Database operation failures.

Logs must not contain:

-   Passwords.
-   Auth tokens.
-   Service-role keys.
-   Sensitive credentials.

------------------------------------------------------------------------

# 58. Performance Architecture

Priority areas:

### Job Lists

Use:

-   Pagination.
-   Indexed filters.
-   Server-side search.

### Accounting

Use:

-   Indexed dates.
-   Indexed account/category foreign keys.
-   Efficient aggregation.
-   Pagination.

### Dashboard

Use optimized aggregation queries rather than loading all underlying
records.

### Reports

Use database aggregation rather than client-side calculations for large
datasets.

------------------------------------------------------------------------

# 59. Security Architecture Baseline

Security is detailed in the separate Security Requirements Document, but
the architecture must provide:

-   Supabase Auth.
-   RLS.
-   Server-side authorization.
-   Secure cookies/session handling.
-   No service-role key in browser.
-   Input validation.
-   Database constraints.
-   Protected routes.
-   Safe error messages.
-   HTTPS in production.

------------------------------------------------------------------------

# 60. Data Integrity Architecture

Critical relationships:

``` text
parties
   ↓
job_works
   ↓
sub_jobs
   ↓
sub_job_employee_work
   ↓
employees
```

And:

``` text
job_works
   ↓
invoices
   ↓
entry_invoice_allocations
   ↓
entries
   ↓
accounts
   ↓
categories
```

Foreign keys must protect these relationships.

------------------------------------------------------------------------

# 61. Deletion Strategy

Deletion must be handled deliberately.

Operational records may have downstream dependencies.

Recommended principle:

``` text
Reference data:
Deactivate rather than delete where history exists.

Financial records:
Do not silently cascade-delete related financial history.

Historical employee work:
Do not destroy records merely because an employee becomes inactive.
```

Specific delete behavior should be finalized in the Database
Requirements Document.

------------------------------------------------------------------------

# 62. Export Architecture

Exports should be generated from the same filtered server-side dataset
displayed to the user.

Example:

``` text
Filters
 ↓
Server Query
 ↓
Validated Result Set
 ↓
CSV / Excel / Printable Output
```

Do not export a different dataset from what the user filtered.

------------------------------------------------------------------------

# 63. Invoice Printing Architecture

Invoice rendering should be separate from normal application layout.

Recommended:

``` text
Invoice Data
    ↓
Invoice Template
    ↓
Print-friendly HTML/CSS
    ↓
Browser Print / PDF
```

The supplied invoice sample should be treated as the business-format
reference.

Exact print dimensions and final field mapping remain open until
confirmed.

------------------------------------------------------------------------

# 64. Architecture Dependency Map

``` text
Authentication
      │
      ▼
Users
      │
      ├───────────────┐
      ▼               ▼
Parties          Employees
      │               │
      ▼               │
Main Jobs             │
      │               │
      ▼               │
Sub Jobs ─────────────┘
      │
      ▼
Employee Work
      │
      ├──────────────► Employee Earnings
      │
      ▼
Invoices
      │
      ▼
Invoice Allocations
      │
      ▼
Entries
   ┌──┴──┐
   ▼     ▼
Accounts Categories
      │
      ▼
Reports / Dashboard
```

------------------------------------------------------------------------

# 65. Architecture Decisions

The following decisions are fixed for the current baseline:

1.  Next.js is the frontend/application framework.
2.  Supabase is the backend platform.
3.  PostgreSQL is the database.
4.  Supabase Auth manages authentication.
5.  No application password hash is stored in `users`.
6.  `profiles` is renamed to `users`.
7.  Main job identifier is `lot_number`.
8.  Sub-job display uses `J01-A`, `J01-B`, etc.
9.  Internal sub-job sequencing uses `sequence_no`.
10. Kapan Number is separate from Lot Number.
11. Quantity terminology is `than`.
12. Employee completion terminology is `done_than`.
13. Employee earning is calculated from Done Than × commission snapshot.
14. No separate employee earning table.
15. Financial records are called `entries`, not transactions or
    payments.
16. No separate expense table.
17. Entry type is Income or Expense.
18. No payment method field.
19. No transaction reference number.
20. Accounts represent money accounts.
21. Categories represent Income/Expense classifications.
22. Invoice amount uses one `amount` field.
23. No invoice due date.
24. No invoice tax amount.
25. No invoice discount.
26. Invoice allocation supports one entry to many invoices and many
    entries to one invoice.
27. No materials module.
28. Accounting is Entries / Accounts / Categories.
29. Initial application role is Admin.

------------------------------------------------------------------------

# 66. Open Architecture Decisions

The following should not be silently decided:

1.  Exact invoice print dimensions.
2.  Exact invoice row mapping if the sample's multiple rows represent a
    special business grouping.
3.  Exact role/permission expansion beyond Admin.
4.  Exact report/export formats beyond the currently requested export
    capability.
5.  Exact production hosting provider.
6.  Exact monitoring provider.
7.  Exact backup/retention policy.

Closed for implementation:

-   Lot Number is auto-generated (`J01`, …).
-   Invoice number is atomically generated (`INV-0001`, …).
-   Job and sub-job status is selected with a picker; default Pending.
-   Job Than/Price remain editable after invoice creation; invoice
    amount is recalculated atomically with allocation/Than guards.

These should be resolved before the implementation of affected areas.

------------------------------------------------------------------------

# 67. Implementation Sequence

Recommended implementation order:

``` text
Phase 1
Project foundation
├── Next.js setup
├── Supabase integration
├── Authentication
├── Layout
└── Design system

Phase 2
Reference data
├── Users
├── Parties
└── Employees

Phase 3
Operations
├── Main Jobs
├── Sub Jobs
└── Employee Work

Phase 4
Billing
└── Invoices

Phase 5
Accounting
├── Accounts
├── Categories
├── Entries
└── Invoice Allocations

Phase 6
Reporting
├── Outstanding
├── Salary
├── Ledger
├── P&L
└── Job Reports

Phase 7
Dashboard
├── KPIs
├── Recent activity
└── Financial summaries

Phase 8
Production hardening
├── Security review
├── Performance review
├── Accessibility
├── Error handling
├── Backup verification
└── Deployment
```

------------------------------------------------------------------------

# 68. Architecture Acceptance Criteria

The architecture is acceptable when:

-   Next.js and Supabase responsibilities are clearly separated.
-   Authentication is handled by Supabase Auth.
-   Sensitive Supabase service credentials remain server-only.
-   Protected routes require authentication.
-   RLS protects database access.
-   Business-critical validation does not depend solely on client-side
    code.
-   Job quantity constraints are protected against concurrent updates.
-   Employee commission history remains immutable through current
    employee changes.
-   Invoice allocation is atomic.
-   Account balances are derived consistently.
-   Accounting category/type matching is enforced.
-   Search and filters are server-side for large datasets.
-   Lists are paginated.
-   Dashboard/report aggregation does not require loading entire tables
    into the browser.
-   Database changes are migration-based.
-   Modules remain independently maintainable.
-   The architecture supports the full PRD without introducing excluded
    functionality.

------------------------------------------------------------------------

# 69. Relationship to Other Project Documents

The document set should remain synchronized:

``` text
01 — Product Requirements Document
      ↓
02 — Architecture Requirements Document
      ↓
03 — Database Requirements Document
      ↓
04 — Security Requirements Document
      ↓
05 — Frontend / UI-UX Requirements Document
      ↓
Implementation
```

The PRD defines **what the system must do**.

This document defines **how the application should be structured to do
it**.

The Database Requirements Document must define the exact PostgreSQL
schema and constraints without changing the business rules established
here.

The Security Requirements Document must define the security controls
without changing the product scope.

The Frontend / UI-UX Requirements Document must define the visual and
interaction system without changing business logic.
