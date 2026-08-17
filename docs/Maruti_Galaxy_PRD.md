# Maruti Galaxy --- Product Requirements Document (PRD)

**Project:** Maruti Galaxy\
**Business:** Diamond polishing and cutting / job-work operations\
**Technology:** Next.js + Supabase\
**Status:** Baseline / Phase 1\
**Prepared:** 2026-08-15

------------------------------------------------------------------------

## 1. Purpose

This document defines the agreed product scope, business workflows,
terminology, functional requirements, rules, and user-facing behavior
for the Maruti Galaxy management system.

The system is an authenticated business-management platform for managing
parties, employees, jobs, sub-jobs, employee work, invoices, accounting
entries, accounts, categories, and reports.

------------------------------------------------------------------------

## 2. Product Overview

Maruti Galaxy manages diamond polishing and cutting job-work operations.

Core lifecycle:

``` text
Party
  ↓
Main Job / Lot
  ↓
Sub Jobs
  ↓
Employee Work Entries
  ↓
Employee Earnings
  ↓
Invoice
  ↓
Accounting Entries
  ↓
Reports / Outstanding / Ledger / P&L
```

The initial application role is **Admin**. Admin can manage all modules
and business operations.

------------------------------------------------------------------------

## 3. Goals

-   Centralize business operations.
-   Track every main job using a Lot Number.
-   Divide main jobs into sub-jobs.
-   Track employee work against sub-jobs.
-   Preserve employee work history.
-   Calculate employee earnings from Done Than and commission.
-   Generate invoices.
-   Track invoice settlement and party outstanding.
-   Maintain unified Income and Expense accounting entries.
-   Maintain Accounts and Categories.
-   Provide job, salary, outstanding, ledger, and P&L reporting.
-   Provide searchable and filterable operational records.
-   Provide a professional Maruti Galaxy branded B2B interface.

------------------------------------------------------------------------

## 4. Explicitly Out of Scope

-   Materials/inventory management.
-   Materials or job-work-material tables.
-   GST/tax calculation.
-   Invoice discount.
-   Invoice due date.
-   Invoice tax amount.
-   Payment method in accounting entries.
-   Transaction reference number.
-   Separate expense table.
-   Separate expense-category table.
-   Separate employee-earnings table.
-   Separate invoice-items table for the current agreed model.
-   Multiple jobs on one invoice for the current agreed rule.
-   Multiple invoices for one job for the current agreed rule.

------------------------------------------------------------------------

## 5. Terminology

  Business concept              System term
  ----------------------------- ----------------
  Main job identifier           Lot Number
  Quantity                      Than
  Sub-job identifier            Sub Job Number
  Employee completed quantity   Done Than
  Employee rate                 Commission
  Employee calculated amount    Earning
  Financial record              Entry
  Money account                 Account
  Financial classification      Category

### Lot Number

Main jobs use business Lot Numbers such as:

``` text
J01
J02
J03
```

The previous integer `serial_no` concept is removed.

### Sub Job Number

Sub-jobs are displayed using the parent Lot Number plus alphabetic
sequence:

``` text
J01-A
J01-B
J01-C
```

The database stores an internal numeric `sequence_no` and the UI derives
the display identifier.

### Kapan Number

Kapan Number is separate from Lot Number.

The supplied invoice sample contains values such as `C100-25A`; these
are Kapan-related values, not Lot Numbers. The sample also contains the
business-facing fields `DATE`, `KAPAN`, `DESCRIPTION`, `LOT`, and
`WEIGHT`.

------------------------------------------------------------------------

## 6. Authentication and Users

Initial role:

``` text
Admin
```

Admin can manage all modules.

Authentication uses **Supabase Auth**. Application-level password hashes
are not stored in the `users` table.

------------------------------------------------------------------------

## 7. Party Management

### Fields

``` text
parties
├── id
├── company_name
├── contact_person_name
├── mobile_number
├── price
├── created_at
└── updated_at
```

Required:

-   Company Name
-   Mobile Number
-   Price

Optional:

-   Contact Person Name

### Party Price

Party price is the default price for a new job.

Flow:

``` text
Party Price
    ↓
Create Job
    ↓
Fetch Price
    ↓
Allow Admin to edit
    ↓
Store final Job Price
```

Changing the party default price must not change existing jobs.

------------------------------------------------------------------------

## 8. Employee Management

### Fields

``` text
employees
├── id
├── name
├── mobile_number
├── commission
├── is_active
├── created_at
└── updated_at
```

Commission is the employee's earning rate per Than.

``` text
Earning = Done Than × Commission
```

The commission applicable when work is recorded must be stored with the
employee-work record so historical earnings do not change when the
employee's current commission changes.

------------------------------------------------------------------------

## 9. Main Job Management

### Fields

``` text
job_works
├── id
├── lot_number
├── party_id
├── job_type
├── than
├── price
├── kapan_number
├── weight
├── status
├── created_at
└── updated_at
```

### Job Type

Dropdown:

``` text
Sarin
Dropping
Galaxy
```

### Job Status

``` text
Pending
Progress
Completed
```

### Main Job Fields

-   Party: required selection.
-   Lot Number: business identifier, e.g. `J01`.
-   Than: main job quantity.
-   Price: fetched from Party and editable because it is the final job
    price.
-   Kapan Number: separate business identifier.
-   Weight: diamond weight in carats.
-   Status: Pending, Progress, Completed.

Weight must support decimal values.

------------------------------------------------------------------------

## 10. Sub Jobs

A main job may contain multiple sub-jobs.

### Fields

``` text
sub_jobs
├── id
├── job_id
├── sequence_no
├── than
├── weight
├── status
├── created_at
└── updated_at
```

### Numbering

``` text
Main Job: J01

sequence_no 1 → J01-A
sequence_no 2 → J01-B
sequence_no 3 → J01-C
```

The complete display value is not the database primary key.

If more than 26 sub-jobs are ever required, alphabetic continuation can
use `AA`, `AB`, `AC`, etc.

### Quantity Rule

The combined Than of all sub-jobs cannot exceed the parent main-job
Than.

Example:

``` text
Main Job = 2,000 Than

J01-A = 800
J01-B = 700
J01-C = 500

Total = 2,000
```

A total greater than 2,000 must be rejected.

------------------------------------------------------------------------

## 11. Employee Work

Employee work is recorded inside a sub-job and can be added multiple
times.

Example:

``` text
J01-A

Ramesh → 100 Than
Suresh → 150 Than
Ramesh → 50 Than
```

The repeated Ramesh entry is valid and must remain separate history.

### Fields

``` text
sub_job_employee_work
├── id
├── sub_job_id
├── employee_id
├── done_than
├── commission
├── earning
├── created_at
└── updated_at
```

### Rules

``` text
earning = done_than × commission
```

The combined `done_than` for a sub-job cannot exceed the sub-job's Than.

Employee work history is the source of truth for employee earnings.

------------------------------------------------------------------------

## 12. Job Status Automation

Main jobs and sub-jobs use:

``` text
Pending
Progress
Completed
```

Sub-job completion is based on its required Than being fully completed
through employee work.

The main job can automatically become Completed when its required
sub-job work is fully completed according to the quantity rules.

------------------------------------------------------------------------

## 13. Job Search and Filters

### Search

-   Main Job Lot Number.
-   Sub Job Number.

Examples:

``` text
J01
J01-A
J01-B
```

### Filters

-   Job Type.
-   Job Status.
-   Employee.
-   Party.

Employee filtering must include jobs whose sub-jobs contain work entries
for that employee.

------------------------------------------------------------------------

## 14. Invoice Management

The supplied invoice sample uses business-facing fields including:

``` text
DATE
KAPAN
DESCRIPTION
LOT
WEIGHT
THAN
RATE
TOTAL
```

The current application must preserve this terminology.

### Current relationship

``` text
One Main Job → One Invoice
```

### Creation

The agreed workflow is to create the invoice when the job is created.

### Amount

The invoice amount is automatic:

``` text
Invoice Amount = Job Than × Final Job Price
```

No discount or tax is currently included.

Therefore the invoice uses one monetary field, `amount`, rather than
both `subtotal` and `total_amount`.

### Fields

``` text
invoices
├── id
├── invoice_number
├── job_work_id
├── invoice_date
├── amount
├── status
├── created_at
└── updated_at
```

Removed:

-   `due_date`
-   `discount`
-   `tax_amount`
-   `subtotal`
-   `total_amount`
-   GST fields

Invoice number is automatically generated.

------------------------------------------------------------------------

## 15. Invoice Settlement

A party may pay:

-   One invoice using multiple entries.
-   Multiple invoices using one entry.

Therefore:

``` text
entry_invoice_allocations
├── id
├── entry_id
├── invoice_id
├── amount
└── created_at
```

Example:

``` text
Entry = ₹75,000

Invoice 1 → ₹20,000
Invoice 2 → ₹30,000
Invoice 3 → ₹25,000
```

Allocation must not exceed the entry amount or the remaining invoice
balance.

------------------------------------------------------------------------

## 16. Accounting

Accounting contains:

``` text
Accounting
├── Entries
├── Account
└── Categories
```

The Entries tab is the unified Income/Expense ledger.

### Entries fields

``` text
entries
├── id
├── party_id
├── employee_id
├── account_id
├── category_id
├── entry_type
├── entry_date
├── amount
├── remarks
├── created_at
└── updated_at
```

Entry fields:

-   Entry Type: Income / Expense.
-   Account: required.
-   Category: required.
-   Amount: required and positive.
-   Date: required.
-   Remarks: optional.

No payment method and no reference number.

### Entry filters

-   Search by Remarks.
-   Date Range.
-   Entry Type.
-   Account.
-   Category.
-   Export.
-   Reset Filters.

### Entry summary

-   Total Income.
-   Total Expense.
-   Net Amount.
-   Total Entry Count.

``` text
Net Amount = Total Income - Total Expense
```

Income is visually positive/green; Expense is visually negative/red.

Pagination and sorting are required.

------------------------------------------------------------------------

## 17. Accounts

### Fields

``` text
accounts
├── id
├── name
├── opening_balance
├── status
├── created_at
└── updated_at
```

### Account List

``` text
Account Name
Opening Balance
Total In
Total Out
Current Balance
Status
Actions
```

### Calculation

``` text
Total In = Income entries for account

Total Out = Expense entries for account

Current Balance =
Opening Balance + Total In - Total Out
```

Current balance should be dynamically calculated.

### Account Detail

Show:

-   Opening Balance.
-   Total In.
-   Total Out.
-   Current Balance.
-   Total Entry Count.
-   Related Entries.

Related entry filters:

-   Date Range.
-   Entry Type.
-   Category.

Rules:

-   Cannot create an entry under an inactive account.
-   Account with existing entries cannot be deleted.

------------------------------------------------------------------------

## 18. Categories

### Fields

``` text
categories
├── id
├── name
├── type
├── status
├── created_at
└── updated_at
```

Category type:

``` text
Income
Expense
```

### Rules

-   Income category can only be used for Income entries.
-   Expense category can only be used for Expense entries.
-   Inactive categories are hidden from entry dropdowns.
-   Category linked to entries cannot be deleted.

------------------------------------------------------------------------

## 19. Employee Salary

Employee earnings come from work history.

Actual employee salary/payment is an accounting Expense entry.

Example:

``` text
Employee earning:
₹10,000

Actual payment:
Expense Entry
Employee: Ramesh
Amount: ₹6,000
```

This preserves the distinction between:

``` text
Earned amount
vs.
Actually paid amount
```

------------------------------------------------------------------------

## 20. Outstanding

Outstanding is derived from invoices and their allocated Income entries.

Conceptually:

``` text
Invoice Outstanding =
Invoice Amount - Allocated Income
```

Party outstanding is the sum of unpaid invoice balances for that party.

------------------------------------------------------------------------

## 21. Reports

Required reports:

-   Job Work Reports.
-   Payment / Entry Reports.
-   Outstanding Reports.
-   Salary Reports.
-   Profit & Loss Reports.
-   Party-wise ledger.
-   Entry-wise ledger.

Profit & Loss:

``` text
Income - Expenses = Net Profit / Loss
```

------------------------------------------------------------------------

## 22. Dashboard

Recommended dashboard KPIs:

-   Total Jobs.
-   Pending Jobs.
-   Progress Jobs.
-   Completed Jobs.
-   Total Than.
-   Employee Earnings.
-   Total Income.
-   Total Expense.
-   Current Account Balances.
-   Outstanding Amount.
-   Recent Jobs.
-   Recent Entries.

All dashboard figures must use the same source records as the underlying
modules.

------------------------------------------------------------------------

## 23. UI / UX Direction

The approved brand direction is:

**Maruti Galaxy --- Premium Diamond Precision**

Visual qualities:

-   Premium.
-   Industrial.
-   Precise.
-   Established.
-   Clean.
-   Professional B2B.

Primary palette:

``` text
Deep Navy       #0B1F3A
Dark Navy       #07152A
Secondary Navy  #16345C
Diamond Silver  #A7B0BF
Light Silver    #E8ECF2
Page Background #F6F8FB
Surface         #FFFFFF
Border          #DDE3EB
Primary Text    #172033
Secondary Text  #687386
```

Use green, amber, and red only for semantic states.

### Layout

``` text
Navy Sidebar | White Topbar
              |
              | Cool Off-white Page
              | White Cards
              | Clean Tables
```

The logo should remain prominent in the sidebar and login experience.

Avoid excessive gradients, decorative animation, or generic colorful
SaaS styling.

------------------------------------------------------------------------

## 24. Navigation

Recommended navigation:

``` text
Dashboard

Jobs
Parties
Employees

Invoices

Accounting
  Entries
  Accounts
  Categories

Reports

Users
```

------------------------------------------------------------------------

## 25. General UX Requirements

Forms must have:

-   Clear labels.
-   Useful placeholders.
-   Required indicators.
-   Inline validation.
-   Clear errors.
-   Proper numeric inputs.
-   Confirmation for destructive actions.
-   Consistent dialogs/drawers.

Tables must provide:

-   Search where required.
-   Filters.
-   Pagination.
-   Sorting where applicable.
-   Clear action controls.
-   Responsive behavior.

Job hierarchy must be visually clear:

``` text
J01
├── J01-A
│   ├── Employee Work
│   ├── Employee Work
│   └── Employee Work
├── J01-B
│   └── Employee Work
└── J01-C
    └── Employee Work
```

------------------------------------------------------------------------

## 26. Performance

The application must:

-   Paginate large lists.
-   Avoid loading full datasets unnecessarily.
-   Use efficient server-side/data-layer filtering.
-   Optimize accounting aggregation.
-   Index frequently filtered fields.
-   Keep dashboard calculations efficient.
-   Avoid unnecessary client-side processing.

The Accounting Module specifically requires indexes for `account_id`,
`category_id`, and date.

------------------------------------------------------------------------

## 27. Technology

### Frontend

-   Next.js.
-   React.
-   TypeScript.
-   Responsive component-based UI.

### Backend / Database

-   Supabase.
-   PostgreSQL.
-   Supabase Auth.

------------------------------------------------------------------------

## 28. Final Data Entities

The agreed baseline is:

``` text
users
parties
employees

job_works
sub_jobs
sub_job_employee_work

invoices

accounts
categories
entries
entry_invoice_allocations
```

Total:

``` text
12 tables
```

Detailed column types, constraints, indexes, foreign keys, RLS policies,
and database-level validation belong in the Database Requirements and
Security Requirements documents.

------------------------------------------------------------------------

## 29. Important Business Rules

1.  Party Company Name is required.
2.  Party Mobile Number is required.
3.  Party Price is required.
4.  Contact Person is optional.
5.  Employee Commission is a per-Than rate.
6.  Main Job uses Lot Number, not Serial Number.
7.  Sub Job uses alphabetic suffixes such as `J01-A`.
8.  Kapan Number is separate from Lot Number.
9.  Job Type is Sarin, Dropping, or Galaxy.
10. Job Status is Pending, Progress, or Completed.
11. Weight is measured in carats.
12. Party price is fetched into a new job but job price is independently
    editable.
13. Main Job Than limits total Sub Job Than.
14. Sub Job Than limits total Employee Done Than.
15. Same employee may have multiple work entries under one Sub Job.
16. Employee commission is snapshotted into each work record.
17. Employee earning = Done Than × Commission.
18. Invoice amount is automatic.
19. Current invoice model is one Job to one Invoice.
20. Invoice uses one amount field.
21. One Income entry can be allocated across multiple invoices.
22. Multiple Income entries can be allocated to one invoice.
23. Accounting Entry Type is Income or Expense.
24. Account and Category are required for entries.
25. Category Type must match Entry Type.
26. Inactive Accounts/Categories cannot be used.
27. Account balance = Opening + Income - Expense.
28. Employee salary paid is an Expense Entry.
29. No materials module.
30. No GST/tax/discount functionality in the current version.
31. Financial entry amount must be positive.
32. Accounting totals must recalculate after entry creation, update, or
    deletion.

------------------------------------------------------------------------

## 30. Open Clarifications

The following points should remain explicitly open rather than being
silently invented:

1.  Exact printed invoice dimensions and final print template.
2.  Exact invoice numbering format beyond automatic sequencing.
3.  Exact carat decimal precision and rounding.
4.  Exact report columns for each report.
5.  Exact P&L accounting presentation beyond Income minus Expense.
6.  Exact mapping between every field visible on the supplied invoice
    and the application invoice layout.
7.  Whether the multiple rows in the supplied invoice represent sub-jobs
    or another business grouping.
8.  Exact backup/restore and retention policy.
9.  Exact permission model if roles beyond Admin are introduced.
10. Exact manual-versus-automatic status transition UX where the
    business rule has not yet been specified.

These items should be resolved in the relevant technical document before
implementation if they affect database structure or core behavior.

------------------------------------------------------------------------

## 31. Acceptance Criteria

The product baseline is functionally aligned when:

-   Admin can authenticate through Supabase Auth.
-   Parties can be created, edited, searched, and viewed.
-   Employees can be created and managed.
-   Jobs can be created with Lot Number, Party, Job Type, Than, Price,
    Kapan Number, Weight, and Status.
-   Party price is fetched and job price remains editable.
-   Multiple sub-jobs can be created under a main job.
-   Sub-job Than cannot exceed remaining main-job Than.
-   Sub-job identifiers display as `J01-A`, `J01-B`, etc.
-   Employee work can be added multiple times.
-   Employee Done Than cannot exceed remaining sub-job Than.
-   Employee commission and earning history are preserved.
-   Job and sub-job status follows the agreed automation.
-   Job search and filters work as specified.
-   Invoice is created according to the agreed job/invoice workflow.
-   Invoice amount is automatically calculated.
-   Accounting supports Income and Expense entries.
-   Accounts calculate Opening + In - Out.
-   Categories enforce Income/Expense matching.
-   Invoice settlements support one-to-many and many-to-one allocation.
-   Outstanding balances can be derived from invoices and allocations.
-   Employee salary payments are recorded as Expense entries.
-   Required reports are available.
-   Accounting balances update after entry create/update/delete.
-   The UI follows the approved Maruti Galaxy visual identity.
-   No materials/inventory functionality is introduced.

------------------------------------------------------------------------

## 32. Document Alignment

This PRD is the product-level baseline for the subsequent documents:

``` text
PRD
 │
 ├── Architecture Requirements
 │       ↓
 ├── Database Requirements
 │       ↓
 ├── Security Requirements
 │       ↓
 └── Frontend / UI-UX Requirements
```

All later documents must use the terminology and business rules defined
here.

If a later technical decision conflicts with this PRD, the conflict must
be explicitly identified and resolved rather than silently changing the
business requirement.
