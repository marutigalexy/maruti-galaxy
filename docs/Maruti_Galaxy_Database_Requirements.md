# Maruti Galaxy --- Database Requirements Document

**Project:** Maruti Galaxy\
**Database:** PostgreSQL via Supabase\
**Authentication:** Supabase Auth\
**Status:** Baseline / Phase 3\
**Prepared:** 2026-08-15

------------------------------------------------------------------------

# 1. Purpose

This document defines the database structure required for the Maruti
Galaxy application.

It converts the approved Product Requirements Document and Architecture
Requirements Document into an implementation-level PostgreSQL
specification.

The database must preserve the agreed business terminology and rules:

-   `users` instead of `profiles`
-   Main job uses `lot_number`
-   Sub jobs use identifiers such as `J01-A`
-   Quantity uses `than`
-   Employee completed quantity uses `done_than`
-   Financial records are called `entries`
-   No separate expense table
-   No separate employee earning table
-   No materials tables
-   No tax/discount/due-date invoice fields
-   Invoice settlement uses an allocation table
-   Employee commission is historically snapshotted

------------------------------------------------------------------------

# 2. Database Design Principles

## 2.1 PostgreSQL is the Source of Truth

All persistent business data must reside in PostgreSQL.

The frontend must not maintain authoritative copies of:

-   Job quantities
-   Employee earnings
-   Invoice balances
-   Account balances
-   Outstanding amounts

These values must be calculated from database records.

## 2.2 Referential Integrity

Foreign keys must be used for relationships.

The database should reject orphaned records rather than relying on
application code alone.

## 2.3 Historical Integrity

Historical financial and employee-work data must remain correct even
when master data changes.

Examples:

-   Changing employee commission must not change old earnings.
-   Changing party price must not change existing job price.
-   Deactivating an employee must not remove historical work.
-   Deactivating an account/category must not alter historical entries.

------------------------------------------------------------------------

# 3. Final Table Inventory

The baseline contains **12 tables**:

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

No additional material, expense-category, employee-earning, payment,
transaction, or invoice-item tables are required by the current
requirements.

------------------------------------------------------------------------

# 4. Entity Relationship Overview

``` text
users
  │
  └── application authentication/profile information

parties
  │
  └── job_works
        │
        ├── sub_jobs
        │      │
        │      └── sub_job_employee_work
        │                 │
        │                 └── employees
        │
        └── invoices
                  │
                  └── entry_invoice_allocations
                              │
                              └── entries
                                    ├── accounts
                                    └── categories
```

------------------------------------------------------------------------

# 5. Users

## Table

``` text
users
├── id
├── name
├── email
├── role
├── is_active
├── created_at
└── updated_at
```

The application `users` table is the profile/role record. It is not a
credential store. Supabase Auth remains the only system that stores
passwords.

## Column Requirements

### `id`

-   UUID.
-   Primary key.
-   References the corresponding Supabase Auth user ID.
-   Should use the Auth UUID as the application user identifier.

### `name`

-   Text.
-   Required.
-   Application display name shown in the Users module, topbar, and
    confirmation dialogs.
-   Not an authentication credential.

### `email`

-   Text.
-   Required.
-   Unique.
-   The login identifier displayed by the application.
-   Must be stored in lowercase.
-   Must match the corresponding Supabase Auth user email at creation.
-   Changing email, if permitted later, must update Auth and this row in
    the same server-side operation.
-   Do not treat `users.email` as a second authentication system. Auth
    still owns sign-in.

### `role`

Initial allowed value:

``` text
admin
```

The design should allow future roles without requiring a structural
redesign.

### `is_active`

-   Boolean.
-   Default: `true`.

Used to deactivate application access without deleting historical user
records.

### `created_at`

-   Timestamp with timezone.
-   Default current timestamp.

### `updated_at`

-   Timestamp with timezone.
-   Updated whenever the application user record changes.

## Constraints

``` text
PRIMARY KEY (id)
name IS NOT NULL
email IS NOT NULL
UNIQUE (email)
```

Foreign key:

``` text
users.id → auth.users.id
```

Deletion behavior must not allow an application user to leave an invalid
application record.

Do not add:

``` text
password
password_hash
password_confirmation
```

## Email uniqueness and casing

Store email as lowercase text.

Recommended unique index:

``` text
UNIQUE (email)
```

Application/server validation must reject empty name, empty email, and
malformed email before insert.

## Auth synchronization

Creating an application user is a two-step server-side operation:

``` text
Create Supabase Auth user (email + password)
        ↓
Insert public.users (id, name, email, role, is_active)
```

If the `users` insert fails, the Auth user must be compensated/removed
so the two stores do not drift.

The Users list, topbar, and get-current-user responses read `name` and
`email` from `public.users`. They must not require a client-side join to
`auth.users`.

------------------------------------------------------------------------

# 6. Parties

## Table

``` text
parties
├── id
├── company_name
├── contact_person_name
├── mobile_number
├── price
├── is_active
├── created_at
└── updated_at
```

## Columns

### `id`

-   UUID.
-   Primary key.

### `company_name`

-   Text.
-   Required.

### `contact_person_name`

-   Text.
-   Optional.

### `mobile_number`

-   Text.
-   Required.

Do not use an integer type because mobile numbers are identifiers, not
quantities.

### `price`

-   Numeric.
-   Required.
-   Must be non-negative.

This is the party's default price.

### `is_active`

-   Boolean.
-   Default `true`.

### Timestamps

Use timezone-aware timestamps.

## Constraints

``` text
company_name IS NOT NULL
mobile_number IS NOT NULL
price >= 0
```

Mobile number is required and is **not unique**. Two parties may share
the same mobile number. Index `mobile_number` for search only.

------------------------------------------------------------------------

# 7. Employees

## Table

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

## Columns

### `id`

-   UUID.
-   Primary key.

### `name`

-   Text.
-   Required.

### `mobile_number`

-   Text.
-   Required.

### `commission`

-   Numeric.
-   Required.
-   Non-negative.

Represents employee earning per Than.

### `is_active`

-   Boolean.
-   Default `true`.

### Timestamps

Standard timezone-aware timestamps.

## Constraints

``` text
name IS NOT NULL
mobile_number IS NOT NULL
commission >= 0
```

Employee mobile number is required and is **not unique**. Index
`mobile_number` for search only.

------------------------------------------------------------------------

# 8. Main Jobs

## Table

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

## Columns

### `id`

-   UUID.
-   Primary key.

### `lot_number`

-   Text.
-   Required.
-   Unique.
-   System-generated. Not supplied by the client as an authoritative
    value.

Examples:

``` text
J01
J02
J03
```

This replaces the earlier `serial_no` concept. Generation rules are in
section 9.

### `party_id`

-   UUID.
-   Required.
-   Foreign key to `parties.id`.

### `job_type`

Allowed values:

``` text
Sarin
Dropping
Galaxy
```

Prefer a PostgreSQL enum or a CHECK constraint.

### `than`

-   `numeric(14,3)`.
-   Required.
-   Greater than zero.

This is the main job quantity.

### `price`

-   `numeric(14,2)`.
-   Required.
-   Non-negative.

This is the final price for the job.

It is initially fetched from the party but must be stored independently
because the final job price is editable.

### `kapan_number`

-   Text.
-   Required.
-   `NOT NULL`.

Kapan Number must remain separate from Lot Number.

### `weight`

-   `numeric(14,3)`.
-   Required.
-   Non-negative.
-   Must support decimal carat values such as `12.500`.
-   Must not use PostgreSQL `float`, `real`, or `double precision`.

Represents diamond weight in carats.

### `status`

Allowed values:

``` text
Pending
Progress
Completed
```

### Timestamps

Standard timezone-aware timestamps.

------------------------------------------------------------------------

# 9. Lot Number Rules

Lot Number is the main job business identifier.

Example:

``` text
J01
```

It is not the Kapan Number.

The database must enforce uniqueness:

``` text
UNIQUE (lot_number)
```

Lot Number is **automatically generated** by the database. Admin must
not type or edit it.

Approved format:

``` text
J01
J02
J03
```

Generation rules:

-   Prefix `J`.
-   Integer sequence starting at `1`.
-   Zero-padded to at least 2 digits (`J01` … `J09`, `J10` … `J99`,
    then `J100`).
-   Generated atomically inside `create_job_with_invoice()` using a
    PostgreSQL sequence (for example `lot_number_seq`) or an equivalent
    locked counter.
-   `nextval` / locked counter is the allocator. `UNIQUE (lot_number)`
    is the safety net.
-   Sequence gaps after a rolled-back transaction are allowed. Do not
    reuse numbers.
-   The generated value is immutable after insert.

Do not implement check-then-insert in application code as the only
uniqueness mechanism.

------------------------------------------------------------------------

# 10. Sub Jobs

## Table

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

## Columns

### `id`

-   UUID.
-   Primary key.

### `job_id`

-   UUID.
-   Required.
-   Foreign key to `job_works.id`.

### `sequence_no`

-   Integer.
-   Required.
-   Positive.
-   Unique within a main job.

Examples:

``` text
1
2
3
```

Display identifiers become:

``` text
J01-A
J01-B
J01-C
```

### `than`

-   Numeric.
-   Required.
-   Greater than zero.

### `weight`

-   Numeric.
-   Required.
-   Non-negative.

Weight is measured in carats.

### `status`

Allowed values:

``` text
Pending
Progress
Completed
```

### Timestamps

Standard timezone-aware timestamps.

## Constraint

``` text
UNIQUE (job_id, sequence_no)
```

------------------------------------------------------------------------

# 11. Sub Job Display Number

The database stores:

``` text
job_id
sequence_no
```

The application displays:

``` text
J01-A
J01-B
J01-C
```

The display number should not be used as the primary key.

Recommended conversion:

``` text
1 → A
2 → B
...
26 → Z
27 → AA
28 → AB
```

This avoids an artificial limitation if a job eventually contains more
than 26 sub-jobs.

------------------------------------------------------------------------

# 12. Main Job Than Allocation

The following invariant must always hold:

``` text
SUM(sub_jobs.than)
<=
job_works.than
```

Example:

``` text
J01 = 2000 Than

J01-A = 800
J01-B = 700
J01-C = 500

Total = 2000
```

The database/application must reject:

``` text
J01-D = 1
```

because the main job has no remaining Than.

This validation must be concurrency-safe.

------------------------------------------------------------------------

# 13. Sub Job Employee Work

## Table

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

## Columns

### `id`

-   UUID.
-   Primary key.

### `sub_job_id`

-   UUID.
-   Required.
-   Foreign key to `sub_jobs.id`.

### `employee_id`

-   UUID.
-   Required.
-   Foreign key to `employees.id`.

### `done_than`

-   Numeric.
-   Required.
-   Greater than zero.

### `commission`

-   Numeric.
-   Required.
-   Non-negative.

This is a historical snapshot of the employee's commission at the moment
work is recorded.

### `earning`

-   Numeric.
-   Required.
-   Non-negative.

Calculated as:

``` text
earning = done_than × commission
```

The stored value provides a historical financial snapshot.

### Timestamps

Standard timezone-aware timestamps.

------------------------------------------------------------------------

# 14. Employee Work Allocation

Invariant:

``` text
SUM(sub_job_employee_work.done_than)
<=
sub_jobs.than
```

Example:

``` text
Sub Job J01-A = 500 Than

Employee A = 200
Employee B = 150
Employee A = 150

Total Done = 500
```

A further work entry must be rejected unless additional Than becomes
available through an allowed business process.

------------------------------------------------------------------------

# 15. Employee Commission Snapshot

When employee work is created:

``` text
employees.commission
        ↓
sub_job_employee_work.commission
```

Then:

``` text
earning =
done_than × commission
```

If the employee's commission later changes:

``` text
employees.commission = new rate
```

existing:

``` text
sub_job_employee_work.commission
```

must remain unchanged.

This is mandatory for historical salary/earning correctness.

------------------------------------------------------------------------

# 16. Employee Earnings

No separate `employee_earnings` table is required.

Employee earnings are derived from:

``` text
sub_job_employee_work
```

Example:

``` text
Employee
Done Than
Commission
Earning
```

Total employee earning:

``` text
SUM(sub_job_employee_work.earning)
```

filtered by employee and date/job as required.

------------------------------------------------------------------------

# 17. Invoices

## Table

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

## Columns

### `id`

-   UUID.
-   Primary key.

### `invoice_number`

-   Text.
-   Required.
-   Unique.
-   Automatically generated by an atomic database sequence. Admin must
    not type or edit it.

Approved format:

``` text
INV-0001
INV-0002
INV-0003
```

Generation rules:

-   Prefix `INV-`.
-   Integer sequence starting at `1`.
-   Zero-padded to at least 4 digits (`INV-0001` … `INV-9999`, then
    `INV-10000`).
-   Generated atomically inside `create_job_with_invoice()` using a
    PostgreSQL sequence (for example `invoice_number_seq`) or an
    equivalent locked counter.
-   Sequence gaps after rollback are allowed. Do not reuse numbers.
-   The generated value is immutable after insert.

### `job_work_id`

-   UUID.
-   Required.
-   Foreign key to `job_works.id`.
-   Unique under the current one-job-to-one-invoice requirement.

### `invoice_date`

-   Date.
-   Required.

### `amount`

-   Numeric.
-   Required.
-   Non-negative.

The invoice amount is derived from the final job price and job Than:

``` text
amount = job_works.than × job_works.price
```

After an invoice exists for the job, `job_works.than` and
`job_works.price` remain **editable**.

Any change to `than` or `price` must atomically recalculate:

``` text
invoices.amount = job_works.than × job_works.price
```

Integrity guards, all in the same transaction:

-   New `than` must still be greater than zero.
-   New `than` must be `>= SUM(sub_jobs.than)` for that job.
-   New `invoices.amount` must be `>= SUM(entry_invoice_allocations.amount)`
    for that invoice. If allocations would exceed the new amount, reject
    the update.
-   Re-derive invoice status (Unpaid / Partially Paid / Paid).

Lot Number and invoice number remain immutable.

### `status`

Recommended baseline values:

``` text
Unpaid
Partially Paid
Paid
```

Exact capitalization can be standardized during implementation.

### Timestamps

Standard timezone-aware timestamps.

------------------------------------------------------------------------

# 18. Removed Invoice Fields

The following are intentionally NOT included:

``` text
due_date
subtotal
discount
tax_amount
total_amount
payment_mode
```

Only:

``` text
amount
```

is required for the current invoice model.

There is no need to store both `subtotal` and `total_amount` because tax
and discount are currently removed.

------------------------------------------------------------------------

# 19. Invoice Relationship

Current rule:

``` text
One Main Job
      ↓
One Invoice
```

Database constraint:

``` text
UNIQUE (job_work_id)
```

This prevents multiple invoices from being accidentally created for one
main job.

------------------------------------------------------------------------

# 20. Accounts

## Table

``` text
accounts
├── id
├── name
├── opening_balance
├── is_active
├── created_at
└── updated_at
```

## Columns

### `id`

-   UUID.
-   Primary key.

### `name`

-   Text.
-   Required.
-   Unique.

### `opening_balance`

-   Numeric.
-   Required.
-   Default `0`.

### `is_active`

-   Boolean.
-   Default `true`.

### Timestamps

Standard timezone-aware timestamps.

------------------------------------------------------------------------

# 21. Account Balance

Do not store a manually editable current balance.

Calculate:

``` text
Current Balance =
Opening Balance
+ Total Income
- Total Expense
```

Where:

``` text
Total Income = SUM(entries.amount WHERE entry_type = Income)

Total Expense = SUM(entries.amount WHERE entry_type = Expense)
```

The calculation must be scoped to the account.

------------------------------------------------------------------------

# 22. Categories

## Table

``` text
categories
├── id
├── name
├── type
├── is_active
├── created_at
└── updated_at
```

## Columns

### `id`

-   UUID.
-   Primary key.

### `name`

-   Text.
-   Required.

### `type`

Allowed:

``` text
Income
Expense
```

### `is_active`

-   Boolean.
-   Default `true`.

### Timestamps

Standard timezone-aware timestamps.

Recommended uniqueness:

``` text
UNIQUE (name, type)
```

This permits the same textual name to exist independently as an Income
and Expense category if the business later requires it.

------------------------------------------------------------------------

# 23. Entries

## Table

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

## Columns

### `id`

-   UUID.
-   Primary key.

### `party_id`

-   UUID.
-   Optional.
-   Foreign key to `parties.id`.

Used when an entry relates to a party.

### `employee_id`

-   UUID.
-   Optional.
-   Foreign key to `employees.id`.

Used for employee-related expenses such as salary payment.

### `account_id`

-   UUID.
-   Required.
-   Foreign key to `accounts.id`.

### `category_id`

-   UUID.
-   Required.
-   Foreign key to `categories.id`.

### `entry_type`

Allowed:

``` text
Income
Expense
```

### `entry_date`

-   Date.
-   Required.

### `amount`

-   Numeric.
-   Required.
-   Greater than zero.

### `remarks`

-   Text.
-   Optional.

This replaces the need for a separate expense-category/notes structure
and provides contextual detail.

### Timestamps

Standard timezone-aware timestamps.

------------------------------------------------------------------------

# 24. Entry Type / Category Integrity

The following must always be true:

``` text
entries.entry_type = categories.type
```

Example:

``` text
Entry Type = Expense
Category Type = Expense
```

Valid.

``` text
Entry Type = Expense
Category Type = Income
```

Invalid.

This should be enforced server-side and, where practical, through
database logic.

------------------------------------------------------------------------

# 25. Entry Account Integrity

Only active accounts can be used for new entries.

Historical entries remain associated with an account if the account
later becomes inactive.

------------------------------------------------------------------------

# 26. Employee Salary Payment

Employee earnings are not the same as employee payment.

### Employee earning

Stored through:

``` text
sub_job_employee_work
```

### Actual salary/payment

Stored as:

``` text
entries
```

with:

``` text
entry_type = Expense
employee_id = employee
category = appropriate Expense category
```

This allows:

``` text
Earned: ₹10,000
Paid:   ₹6,000
```

without creating a redundant employee-payment table.

------------------------------------------------------------------------

# 27. Entry Invoice Allocations

## Table

``` text
entry_invoice_allocations
├── id
├── entry_id
├── invoice_id
├── amount
└── created_at
```

## Purpose

This table connects Income Entries with Invoices.

It supports:

``` text
One Entry → Many Invoices
Many Entries → One Invoice
```

## Constraints

### `entry_id`

-   UUID.
-   Required.
-   Foreign key to `entries.id`.

### `invoice_id`

-   UUID.
-   Required.
-   Foreign key to `invoices.id`.

### `amount`

-   Numeric.
-   Required.
-   Greater than zero.

### `created_at`

-   Timestamp with timezone.

------------------------------------------------------------------------

# 28. Allocation Integrity

Only Income entries may be allocated to invoices.

The database/application must reject:

``` text
Expense Entry → Invoice
```

Allocation amount cannot exceed:

``` text
Entry Remaining Amount
```

and cannot exceed:

``` text
Invoice Outstanding Amount
```

Formally:

``` text
SUM(allocations for entry) <= entry.amount
```

and:

``` text
SUM(allocations for invoice) <= invoice.amount
```

These checks must be atomic to prevent concurrent over-allocation.

------------------------------------------------------------------------

# 29. Invoice Outstanding

Do not store a manually editable outstanding amount.

Calculate:

``` text
Invoice Outstanding =
Invoice Amount
-
SUM(Allocated Income)
```

If:

``` text
Outstanding = 0
```

then:

``` text
Paid
```

If:

``` text
Allocated > 0
AND Outstanding > 0
```

then:

``` text
Partially Paid
```

If:

``` text
Allocated = 0
```

then:

``` text
Unpaid
```

The exact status synchronization mechanism can be implemented through a
database function, trigger, or server-side calculation.

------------------------------------------------------------------------

# 30. Party Outstanding

Party outstanding is:

``` text
SUM(
  Invoice Amount
  -
  Invoice Allocations
)
```

for that party's invoices.

It must not be stored as a separate mutable field.

------------------------------------------------------------------------

# 31. Foreign Key Relationships

Required relationships:

``` text
users.id
    → auth.users.id

job_works.party_id
    → parties.id

sub_jobs.job_id
    → job_works.id

sub_job_employee_work.sub_job_id
    → sub_jobs.id

sub_job_employee_work.employee_id
    → employees.id

invoices.job_work_id
    → job_works.id

entries.party_id
    → parties.id

entries.employee_id
    → employees.id

entries.account_id
    → accounts.id

entries.category_id
    → categories.id

entry_invoice_allocations.entry_id
    → entries.id

entry_invoice_allocations.invoice_id
    → invoices.id
```

------------------------------------------------------------------------

# 32. Delete / Update Behavior

The database must protect historical business data.

## Parties

A party with jobs/invoices should normally be deactivated rather than
deleted.

## Employees

Employees with work history should normally be deactivated rather than
deleted.

## Accounts

Accounts with entries should not be hard deleted.

## Categories

Categories used by entries should not be hard deleted.

## Jobs

A job with sub-jobs or invoices should not be freely hard deleted.

## Invoices

Invoices with allocations should not be hard deleted without a
deliberate reversal/void strategy.

## Employee Work

Historical employee work should not be cascade-deleted merely because an
employee is deactivated.

Exact hard-delete permissions should be restricted in the application
and protected by referential constraints.

------------------------------------------------------------------------

# 33. Recommended Referential Actions

Default recommendation:

``` text
Master → Child
```

should use restrictive deletion when historical records exist.

Examples:

``` text
parties → job_works
employees → employee_work
accounts → entries
categories → entries
invoices → allocations
entries → allocations
```

Do not use broad:

``` text
ON DELETE CASCADE
```

on financial/history relationships unless the deletion is explicitly
intended and safe.

For child records whose parent must always exist, use restrictive
foreign keys.

------------------------------------------------------------------------

# 34. Numeric Precision

Money and commission values should use PostgreSQL `numeric`, not
floating-point types.

Approved types:

``` text
Money / price / commission / earning / amount /
opening_balance / allocation:
numeric(14,2)

Weight (carats):
numeric(14,3)

Than / done_than:
numeric(14,3)
```

Weight must support decimal carat values. PostgreSQL `float`, `real`,
and `double precision` are forbidden for money, commission, than, and
weight. JavaScript IEEE floats must not be used as the authoritative
calculator.

Display weight with up to 3 decimal places (example: `12.500 ct`).

------------------------------------------------------------------------

# 35. Weight

Weight represents diamond weight in carats.

It must support decimal values.

Approved type:

``` text
numeric(14,3)
```

Examples: `0.125`, `12.5`, `12.500`.

Do not use floating-point column types.

------------------------------------------------------------------------

# 36. Than

`than` and `done_than` use:

``` text
numeric(14,3)
```

This allows whole and decimal quantities without IEEE float rounding.

------------------------------------------------------------------------

# 37. Timestamps

Use:

``` text
timestamptz
```

for:

``` text
created_at
updated_at
```

Use:

``` text
date
```

for business dates such as:

``` text
invoice_date
entry_date
```

The application should display dates in the business timezone.

------------------------------------------------------------------------

# 38. Standard Timestamp Defaults

New records should use:

``` text
created_at = now()
updated_at = now()
```

`updated_at` should be automatically maintained by a reusable PostgreSQL
trigger/function or consistently by the server layer.

Database-level automation is preferred for consistency.

------------------------------------------------------------------------

# 39. Index Requirements

Indexes should be created for frequently queried relationships and
filters.

## Users

``` text
users.email   (unique)
users.name
users.is_active
```

## Parties

``` text
parties.company_name
parties.mobile_number
parties.is_active
```

## Employees

``` text
employees.name
employees.mobile_number
employees.is_active
```

## Jobs

``` text
job_works.lot_number
job_works.party_id
job_works.job_type
job_works.status
job_works.created_at
```

## Sub Jobs

``` text
sub_jobs.job_id
sub_jobs.sequence_no
```

## Employee Work

``` text
sub_job_employee_work.sub_job_id
sub_job_employee_work.employee_id
sub_job_employee_work.created_at
```

## Invoices

``` text
invoices.invoice_number
invoices.job_work_id
invoices.invoice_date
invoices.status
```

## Entries

``` text
entries.account_id
entries.category_id
entries.party_id
entries.employee_id
entries.entry_type
entries.entry_date
```

## Allocations

``` text
entry_invoice_allocations.entry_id
entry_invoice_allocations.invoice_id
```

Do not blindly index every column. Indexes should support actual query
patterns.

------------------------------------------------------------------------

# 40. Search Indexing

For ordinary operational search:

``` text
lot_number
invoice_number
company_name
employee.name
```

standard B-tree indexes may be sufficient depending on query pattern.

If partial/fuzzy search becomes a performance concern,
PostgreSQL-specific search indexes such as trigram indexes can be
introduced.

Do not introduce advanced indexing without measuring actual query
performance.

------------------------------------------------------------------------

# 41. Job Search

The database layer must support:

``` text
Search Lot Number
Search Sub Job Number
```

Sub-job display number is derived from:

``` text
Parent Lot Number + sequence_no
```

A database view or query can expose a searchable display identifier if
required.

------------------------------------------------------------------------

# 42. Job Filters

The database layer must support:

``` text
job_type
status
party_id
employee_id
```

Employee filtering requires joining:

``` text
job_works
→ sub_jobs
→ sub_job_employee_work
```

Indexes must support these relationships.

------------------------------------------------------------------------

# 43. Accounting Filters

Entries must support efficient filtering by:

``` text
entry_date
entry_type
account_id
category_id
party_id
employee_id
```

Date-range filtering is expected to be common.

------------------------------------------------------------------------

# 44. Database Views

Views may be used for read-heavy derived information.

Recommended candidates:

``` text
job/sub-job display view
invoice outstanding view
account balance view
employee earning summary view
party outstanding view
```

Views should not duplicate source data.

They should provide consistent read models for the application.

------------------------------------------------------------------------

# 45. Database Functions

Database functions are recommended for operations where atomicity is
essential.

Required functions:

``` text
next_lot_number()
next_invoice_number()
create_job_with_invoice()
update_job_with_invoice_recalc()
create_sub_job()
add_employee_work()
allocate_entry_to_invoice()
```

`create_job_with_invoice()` must call the atomic lot-number and
invoice-number generators in the same transaction.

`update_job_with_invoice_recalc()` must recalculate invoice amount when
Than or Price changes, and reject updates that would break sub-job Than
or invoice allocation remaining-balance rules.

The objective is to make multi-step business operations atomic.

------------------------------------------------------------------------

# 46. Sub Job Creation Transaction

Conceptual operation:

``` text
BEGIN

Lock relevant Main Job

Calculate:
Main Job Than
-
Existing Sub Job Than

Validate requested Than

Determine next sequence_no

Insert Sub Job

COMMIT
```

If validation fails:

``` text
ROLLBACK
```

This prevents concurrent requests from exceeding Main Job Than.

------------------------------------------------------------------------

# 47. Employee Work Transaction

Conceptual:

``` text
BEGIN

Lock Sub Job

Calculate remaining Than

Validate Done Than

Read Employee Commission

Calculate Earning

Insert Employee Work

Update status if required

COMMIT
```

This prevents concurrent employees/work entries from exceeding the
sub-job quantity.

------------------------------------------------------------------------

# 48. Invoice Allocation Transaction

Conceptual:

``` text
BEGIN

Lock Invoice

Lock Income Entry

Calculate:
Invoice Remaining
Entry Remaining

Validate allocation amount

Insert Allocation

Update/derive invoice status

COMMIT
```

This prevents over-allocation under concurrent requests.

------------------------------------------------------------------------

# 49. Invoice Creation Consistency

When a job is created and invoice creation is part of the agreed
workflow, the operation should be atomic.

Conceptually:

``` text
Create Job
     ↓
Calculate Invoice Amount
     ↓
Create Invoice
     ↓
Commit
```

If invoice creation fails, the job creation transaction should not leave
an inconsistent partially completed state.

------------------------------------------------------------------------

# 50. Invoice Amount Source

The authoritative job-level values are:

``` text
job_works.than
job_works.price
```

Invoice amount:

``` text
than × price
```

Approved policy (editable job Than/Price):

After invoice creation, `job_works.than` and `job_works.price` may be
edited. The linked invoice `amount` must be recalculated in the same
transaction as `than × price`.

If existing invoice allocations would exceed the new amount, the
mutation must be rejected. If the new Than would be less than already
allocated sub-job Than, the mutation must be rejected.

Do not leave invoice amount and job Than/Price out of sync.

------------------------------------------------------------------------

# 51. Accounting Entry Mutation

Entries are currently editable and deletable according to the agreed
requirement.

However:

-   Entry updates must preserve accounting consistency.
-   Entry allocations must be revalidated after changes.
-   Deleting an entry with invoice allocations must either be blocked or
    require allocation removal/reversal first.
-   Account balances must immediately reflect the final state.

A direct delete that silently leaves invoice allocations orphaned is
prohibited.

------------------------------------------------------------------------

# 52. Category Mutation

Categories are editable.

Changing a category's type after it has been used by entries may create
an invalid relationship.

Recommended rule:

``` text
If category has entries:
    prevent changing type
```

Name can remain editable.

------------------------------------------------------------------------

# 53. Account Mutation

Accounts are editable.

If an account already has entries:

-   Name may be editable.
-   Active status may be changed.
-   Opening balance changes require controlled handling because they
    affect historical/current balance.

The final product should avoid allowing arbitrary opening-balance
changes after accounting activity exists unless explicitly authorized.

------------------------------------------------------------------------

# 54. Employee Mutation

Employees are editable.

Changing:

``` text
name
mobile_number
commission
```

must not alter historical employee work.

Changing:

``` text
is_active = false
```

must preserve historical work and earnings.

------------------------------------------------------------------------

# 55. Party Mutation

Party default `price` can be changed.

Existing jobs retain their own:

``` text
job_works.price
```

Therefore:

``` text
Change Party Price
        ↓
Future Jobs use new default
        ↓
Existing Jobs remain unchanged
```

This separation is mandatory.

------------------------------------------------------------------------

# 56. Job Status Integrity

Allowed values must be constrained.

Invalid examples:

``` text
Started
Done
Closed
Cancelled
```

must not be inserted unless the status model is officially expanded.

Current baseline:

``` text
Pending
Progress
Completed
```

Admin may set these values through a status picker. Default on create is
`Pending`. Quantity-driven automation may still advance `Pending` to
`Progress` when work is recorded and may set `Completed` when remaining
Than is 0. Admin may also set status explicitly to any of the three
allowed values. Quantity allocation invariants are independent of
status.

Allowed values:

``` text
Sarin
Dropping
Galaxy
```

The database should reject arbitrary job types.

------------------------------------------------------------------------

# 58. Entry Type Integrity

Allowed:

``` text
Income
Expense
```

The database should reject arbitrary values.

------------------------------------------------------------------------

# 59. Positive Amount Rules

The following must be greater than zero when a transaction represents an
actual quantity:

``` text
job_works.than
sub_jobs.than
sub_job_employee_work.done_than
entries.amount
entry_invoice_allocations.amount
```

Rates/prices may be zero if the business permits zero pricing, but
negative values must be rejected.

------------------------------------------------------------------------

# 60. Database-Level Integrity Summary

The following rules are considered critical:

``` text
Unique Lot Number

Unique Invoice Number

One Invoice per Main Job

Unique Sub Job Sequence within Main Job

Sub Job Than <= Main Job Remaining Than

Employee Done Than <= Sub Job Remaining Than

Employee Earning = Done Than × Commission Snapshot

Invoice Allocation <= Invoice Remaining

Invoice Allocation <= Entry Remaining

Only Income Entries can be allocated

Entry Type = Category Type

Amount > 0

Account must be Active for new Entry

Category must be Active for new Entry
```

------------------------------------------------------------------------

# 61. No Materials Tables

The current project has explicitly removed materials functionality.

Do not create:

``` text
materials
job_materials
material_transactions
material_inventory
```

unless a future requirement explicitly introduces inventory/material
management.

------------------------------------------------------------------------

# 62. No Separate Expense Table

Expenses are represented through:

``` text
entries.entry_type = Expense
```

There is no:

``` text
expenses
```

table.

Expense classification is handled by:

``` text
categories
```

and contextual information can be stored in:

``` text
remarks
```

------------------------------------------------------------------------

# 63. No Separate Employee Earning Table

Employee earning is represented through:

``` text
sub_job_employee_work
```

This table contains:

``` text
done_than
commission
earning
```

Therefore no:

``` text
employee_earnings
employee_salary
```

table is required for earning calculation.

Actual salary paid is an Expense Entry.

------------------------------------------------------------------------

# 64. No Payment Table

The previous concept of a separate payment table is removed.

Financial movements are represented by:

``` text
entries
```

Settlement of invoices is represented by:

``` text
entry_invoice_allocations
```

This provides a cleaner accounting model:

``` text
Entry = financial movement

Allocation = which invoice(s) that income settled
```

------------------------------------------------------------------------

# 65. No Transaction Table

The old `transactions` terminology is replaced by:

``` text
entries
```

The database must use:

``` text
entries
```

as the table name.

Do not create a duplicate:

``` text
transactions
```

table.

------------------------------------------------------------------------

# 66. No Payment Mode

The accounting entry schema must not contain:

``` text
payment_mode
payment_method
```

unless a future requirement explicitly adds it.

------------------------------------------------------------------------

# 67. No Reference Number

The accounting entry schema must not contain:

``` text
reference_number
```

according to the current requirement.

------------------------------------------------------------------------

# 68. No Invoice Due Date

The invoice schema must not contain:

``` text
due_date
```

------------------------------------------------------------------------

# 69. No Invoice Tax / Discount

The current schema must not contain:

``` text
tax_amount
discount
subtotal
total_amount
```

The current invoice amount is represented by:

``` text
amount
```

------------------------------------------------------------------------

# 70. Business Data Flow

## Party

``` text
Party
 └── Default Price
```

## Job

``` text
Party
 ↓
Main Job
 ↓
Lot Number
 ↓
Sub Jobs
 ↓
Employee Work
 ↓
Employee Earnings
```

## Billing

``` text
Main Job
 ↓
Invoice
 ↓
Income Entry
 ↓
Invoice Allocation
```

## Accounting

``` text
Entry
 ├── Account
 └── Category
```

## Employee Payment

``` text
Employee Earnings
        │
        │ separate operational concept
        ▼
Actual Salary Paid
        │
        ▼
Expense Entry
```

------------------------------------------------------------------------

# 71. Reporting Data Sources

Reports must use the following authoritative sources:

  Report                 Source
  ---------------------- --------------------------------------------------
  Job Work               `job_works`, `sub_jobs`, `sub_job_employee_work`
  Employee Earnings      `sub_job_employee_work`
  Invoice                `invoices`
  Outstanding            `invoices`, `entry_invoice_allocations`
  Account Balance        `accounts`, `entries`
  Ledger                 `entries`, invoices, allocations as applicable
  P&L                    `entries`
  Salary Expense         `entries` joined to `employees`
  Party Financial View   `parties`, `invoices`, allocations, entries

Do not create duplicate report tables merely to display summaries.

------------------------------------------------------------------------

# 72. Backup and Recovery

Production Supabase/PostgreSQL must have an appropriate backup and
recovery strategy.

The database design must support restoration without requiring
application-generated state that is not stored in PostgreSQL.

Migrations must be version-controlled so a restored database can be
brought to the correct schema version.

Exact backup retention and recovery objectives remain a
deployment/security decision.

------------------------------------------------------------------------

# 73. Migration Strategy

Schema must be implemented using migrations.

Recommended order:

``` text
001_users
002_parties
003_employees
004_job_works
005_sub_jobs
006_employee_work
007_invoices
008_accounts
009_categories
010_entries
011_invoice_allocations
012_constraints_indexes_functions
```

Actual migration grouping can differ, but dependencies must be
respected.

------------------------------------------------------------------------

# 74. Seed Data

Development/staging may include:

``` text
Job Types:
Sarin
Dropping
Galaxy

Job Statuses:
Pending
Progress
Completed

Entry Types:
Income
Expense
```

Production seed data should be limited to genuinely required system
defaults.

Business-specific parties, employees, accounts, and categories should
not be hardcoded into application code.

------------------------------------------------------------------------

# 75. Database Acceptance Criteria

The database implementation is acceptable when:

-   Exactly the agreed baseline entities exist.
-   `profiles` is not used; application table is `users`.
-   `users` includes `name` and `email`; `email` is unique and stored
    lowercase.
-   Supabase Auth owns authentication credentials.
-   No password hash is stored in `users`.
-   No materials tables exist.
-   No expense table exists.
-   No employee earning table exists.
-   No payment/transaction table exists.
-   Financial records are stored in `entries`.
-   Invoice allocation is modeled separately.
-   Main jobs use unique, atomically generated Lot Numbers (`J01`, …).
-   Invoice numbers are unique and atomically generated (`INV-0001`, …).
-   Sub-jobs use unique sequence numbers per main job.
-   Job Type is restricted to Sarin, Dropping, Galaxy.
-   Job Status is restricted to Pending, Progress, Completed.
-   Than uses `numeric(14,3)` and weight uses `numeric(14,3)` so decimal
    carat values are stored without floating-point types.
-   `kapan_number` is required and remains separate from Lot Number.
-   Employee commission is snapshotted on work records.
-   Employee earnings are historically stable.
-   Main-job Than cannot be over-allocated to sub-jobs.
-   Sub-job Than cannot be over-allocated to employee work.
-   One main job cannot have multiple invoices.
-   Invoice amount uses one amount field.
-   Invoice due date/tax/discount/subtotal/total_amount are absent.
-   Entry type is Income or Expense.
-   Category type matches entry type.
-   Only Income entries can be allocated to invoices.
-   Invoice and entry allocations cannot exceed remaining balances.
-   Account balance is derived from opening balance and entries.
-   Historical records are protected from unsafe cascaded deletion.
-   Required indexes exist for operational queries.
-   Critical multi-step operations are atomic.
-   Schema is migration-based.

------------------------------------------------------------------------

# 76. Final Schema Summary

``` text
users
├── id
├── name
├── email
├── role
├── is_active
├── created_at
└── updated_at

parties
├── id
├── company_name
├── contact_person_name
├── mobile_number
├── price
├── is_active
├── created_at
└── updated_at

employees
├── id
├── name
├── mobile_number
├── commission
├── is_active
├── created_at
└── updated_at

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

sub_jobs
├── id
├── job_id
├── sequence_no
├── than
├── weight
├── status
├── created_at
└── updated_at

sub_job_employee_work
├── id
├── sub_job_id
├── employee_id
├── done_than
├── commission
├── earning
├── created_at
└── updated_at

invoices
├── id
├── invoice_number
├── job_work_id
├── invoice_date
├── amount
├── status
├── created_at
└── updated_at

accounts
├── id
├── name
├── opening_balance
├── is_active
├── created_at
└── updated_at

categories
├── id
├── name
├── type
├── is_active
├── created_at
└── updated_at

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

entry_invoice_allocations
├── id
├── entry_id
├── invoice_id
├── amount
└── created_at
```

------------------------------------------------------------------------

# 77. Closed Pre-Migration Decisions

The following items were previously open and are now approved for
migration:

1.  `lot_number` is automatically generated (`J01`, `J02`, …) by an
    atomic sequence inside job creation.
2.  `invoice_number` is automatically generated (`INV-0001`, …) by an
    atomic sequence inside job+invoice creation.
3.  Weight uses `numeric(14,3)` so decimal carat values are stored
    exactly. Than/done_than use `numeric(14,3)`. Money fields use
    `numeric(14,2)`. No `float`/`real`/`double precision`.
4.  `kapan_number` is required (`NOT NULL`).
5.  After invoice creation, job `than` and `price` remain editable. The
    invoice amount is recalculated atomically. The edit is rejected if
    it would break sub-job Than allocation or invoice allocations.
6.  Invoice status is derived: Unpaid / Partially Paid / Paid.
7.  Party and employee mobile numbers are required and **not unique**.
8.  Job and sub-job status is user-selectable via a picker (`Pending`,
    `Progress`, `Completed`), default `Pending`. Quantity automation may
    still advance Pending→Progress and set Completed when remaining Than
    is 0; Admin may also set status explicitly.
9.  Job/party price may be zero (`>= 0`). Than and financial amounts
    must be `> 0`.
10. `users` stores `name` and `email` in addition to `id`, `role`,
    `is_active`, and timestamps. No password columns.
11. Hard-delete vs deactivate: deactivate master records that have
    history; restrictive FKs prevent unsafe hard deletes.

Remaining non-schema items (print template, report extras, hosting,
backup retention, roles beyond Admin) do not block the baseline
migration.
