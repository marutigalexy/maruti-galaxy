# Maruti Galaxy — Frontend Requirements Document

**Project:** Maruti Galaxy  
**Business:** Diamond polishing and cutting / job-work operations  
**Document:** Frontend Requirements  
**Frontend:** Next.js + React + TypeScript  
**Backend / Database / Auth:** Supabase + PostgreSQL + Supabase Auth  
**Status:** Baseline / Phase 5  
**Prepared:** 2026-08-15  
**Source of truth:** PRD, Architecture Requirements, Database Requirements, Security Requirements, and supplied Maruti Galaxy logo

---

# 1. Purpose

This document defines the frontend/UI requirements for the Maruti Galaxy management system.

It translates the approved product, architecture, database, and security requirements into an implementation-level frontend specification covering:

- Application shell
- Navigation
- Branding and visual system
- Responsive behavior
- Page structure
- Screen requirements
- Forms
- Tables
- Search and filtering
- Dialogs and drawers
- Job hierarchy presentation
- Invoice presentation and printing
- Accounting interfaces
- Reports
- Dashboard
- Users
- Loading, empty, error, and success states
- Validation feedback
- Accessibility
- Frontend performance
- Frontend security behavior
- Component architecture
- State management
- URL state
- Data refresh behavior
- Export behavior
- Acceptance criteria

This document is a frontend implementation contract. It must remain aligned with the PRD and must not introduce business functionality that has not been approved.

---

# 2. Frontend Product Context

Maruti Galaxy is an authenticated B2B business-management platform for diamond polishing and cutting / job-work operations.

The core business lifecycle is:

```text
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

The initial application role is **Admin**, with access to all current modules.

The frontend must make this operational lifecycle easy to understand without turning the interface into a decorative dashboard. The product is a working business console: information density, clarity, speed, accuracy, and predictable interaction take priority.

The approved product direction is **Maruti Galaxy — Premium Diamond Precision**, with a premium, industrial, precise, established, clean, professional B2B character.

---

# 3. Frontend Scope

## 3.1 In Scope

The frontend must provide interfaces for:

1. Authentication / Login
2. Application shell
3. Dashboard
4. Jobs
5. Main Job creation and editing
6. Main Job details
7. Sub Jobs
8. Employee Work
9. Parties
10. Employees
11. Invoices
12. Invoice details
13. Invoice settlement / allocation
14. Invoice printing
15. Accounting — Entries
16. Accounting — Accounts
17. Accounting — Categories
18. Reports
19. Users
20. Search, filters, pagination, sorting, exports, and responsive behavior
21. Shared loading, empty, error, confirmation, and notification patterns

## 3.2 Explicitly Out of Scope

The frontend must not introduce screens, fields, or workflows for:

- Materials / inventory management
- Job-work materials
- GST / tax calculation
- Invoice tax
- Invoice discount
- Invoice due date
- Payment method in accounting entries
- Transaction reference number
- Separate expense module/table
- Separate employee-earning module/table
- Separate invoice-item management for the current model
- Multiple jobs on one invoice
- Multiple invoices for one job
- Any other functionality not approved by the product baseline

These exclusions are important. The frontend must not create empty placeholders, navigation items, data fields, or future-looking UI for excluded modules merely because they are common in ERP products.

---

# 4. Terminology Standard

The frontend must use the approved business terminology consistently.

| Business Concept | Required UI Term |
|---|---|
| Main job identifier | Lot Number |
| Quantity | Than |
| Sub-job identifier | Sub Job Number |
| Employee completed quantity | Done Than |
| Employee rate | Commission |
| Employee calculated amount | Earning |
| Financial record | Entry |
| Money account | Account |
| Financial classification | Category |

The UI must not reintroduce deprecated terminology such as `serial_no` or replace **Entry** with **Transaction** or **Payment** in headings and labels.

Lot Numbers use examples such as `J01`, `J02`, `J03`.

Sub Job Numbers are displayed as `J01-A`, `J01-B`, `J01-C`, while the database internally uses `sequence_no`.

Kapan Number is a separate field and must never be presented as another name for Lot Number.

---

# 5. Brand and Visual Direction

## 5.1 Brand Positioning

The interface must feel:

- Premium
- Industrial
- Precise
- Established
- Clean
- Professional
- B2B
- Operational rather than consumer-oriented

The visual language should communicate reliability and precision rather than flashy technology.

## 5.2 Supplied Logo

The supplied Maruti Galaxy logo contains:

- A deep navy monogram / mark
- A diamond element
- `MARUTI` wordmark
- `GALAXY` wordmark
- `DIAMOND POLISHING & CUTTING` descriptor

The logo is the primary visual identity for the application.

## 5.3 Logo Placement

The logo must be prominent in:

- Login screen
- Application sidebar
- Appropriate authenticated empty/brand states where useful
- Print/invoice branding where compatible with the approved invoice format

The sidebar must preserve enough visual space around the logo so that the mark remains recognizable at normal desktop dimensions.

The logo must not be stretched, distorted, cropped, or placed against a background that reduces its contrast.

## 5.4 Approved Color System

Use the approved palette:

| Token | Hex | Primary Use |
|---|---|---|
| Deep Navy | `#0B1F3A` | Sidebar, primary brand surfaces, strong headings/actions where appropriate |
| Dark Navy | `#07152A` | Dark emphasis, sidebar depth, selected states where appropriate |
| Secondary Navy | `#16345C` | Secondary brand surfaces and emphasis |
| Diamond Silver | `#A7B0BF` | Secondary accents, icon/detail treatment |
| Light Silver | `#E8ECF2` | Subtle surfaces, separators, disabled/background details |
| Page Background | `#F6F8FB` | Main application page background |
| Surface | `#FFFFFF` | Cards, tables, dialogs, forms |
| Border | `#DDE3EB` | Borders and dividers |
| Primary Text | `#172033` | Main content text |
| Secondary Text | `#687386` | Supporting text, metadata, descriptions |

Semantic green, amber, and red may be used for status communication only. They must not become general brand colors.

## 5.5 Overall Layout Direction

The baseline layout is:

```text
┌─────────────────────────────────────────────────────────────┐
│                     WHITE TOPBAR                            │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│  NAVY         │          COOL OFF-WHITE PAGE                │
│  SIDEBAR      │                                             │
│               │       WHITE CARDS / TABLES                  │
│  Logo         │                                             │
│  Navigation   │                                             │
│               │                                             │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

The interface must avoid:

- Excessive gradients
- Decorative animations
- Generic colorful SaaS styling
- Large decorative illustrations that consume operational space
- Excessive glassmorphism
- Excessive shadows
- Unnecessary visual noise

---

# 6. Design Principles

## 6.1 Content Over Chrome

Navigation and application chrome should remain compact. The majority of the viewport should belong to operational content.

## 6.2 Scanability

Users should be able to identify:

- Lot Number
- Party
- Status
- Than
- Remaining Than
- Amount
- Date
- Employee
- Account
- Category

without reading long descriptions.

## 6.3 Predictability

Every list page should use the same structural pattern.

Every form should use the same field/label/error/submission pattern.

Every destructive action should follow the same confirmation pattern.

## 6.4 Progressive Disclosure

Advanced filters and secondary information should not overwhelm the initial view.

Use:

- Filter panels
- Drawers
- Dialogs
- Tabs
- Expandable sections

where appropriate.

## 6.5 Operational Density

The system is intended primarily for desktop business operations. Tables should use the available screen efficiently while remaining readable.

## 6.6 Precision

Numeric values must be visually aligned and easy to compare.

Quantity, weight, commission, earning, invoice amount, account balance, and outstanding values should use consistent numeric formatting.

## 6.7 No Silent Business Logic

The frontend may calculate and preview values for immediate feedback, but authoritative business calculations must come from the server/database.

---

# 7. Application Shell

## 7.1 Authenticated Shell

Authenticated pages must use a shared application shell containing:

- Persistent sidebar on desktop
- Topbar
- Main content area
- Page header area
- Breadcrumbs where useful
- Global notification/toast area
- Responsive navigation behavior

## 7.2 Sidebar

The sidebar must contain the Maruti Galaxy logo and primary navigation.

Recommended navigation hierarchy:

```text
Dashboard

Jobs

Parties
Employees

Invoices

Accounting
  ├── Entries
  ├── Accounts
  └── Categories

Reports

Users
```

The active route must have a clear visual state.

The sidebar must make the current location obvious without relying only on color.

## 7.3 Topbar

The topbar should remain visually quiet and functional.

It should provide the appropriate authenticated-user context and application-level controls required by the final implementation.

The frontend must not place unnecessary marketing content, promotional cards, or decorative content in the topbar.

## 7.4 Breadcrumbs

Breadcrumbs should be used on detail and nested views where they improve orientation.

Example:

```text
Jobs / J01 / J01-A
```

Breadcrumb labels must use business-facing terminology.

## 7.5 Content Container

Pages should use a consistent maximum-width/content-width strategy while allowing wide tables and operational screens to use the available viewport.

Avoid excessive horizontal whitespace around tables.

---

# 8. Route and Screen Map

The frontend route structure should align with the architecture baseline:

```text
/auth
  /login

/dashboard

/jobs
/jobs/new
/jobs/[jobId]
/jobs/[jobId]/edit

/parties
/parties/[partyId]

/employees
/employees/[employeeId]

/invoices
/invoices/[invoiceId]
/invoices/[invoiceId]/print

/accounting
/accounting/entries
/accounting/accounts
/accounting/accounts/[accountId]
/accounting/categories

/reports

/users
```

Exact route naming may be adjusted during implementation, but module boundaries must remain clear.

Protected application routes must not be publicly accessible.

---

# 9. Authentication / Login Screen

## 9.1 Purpose

Provide the secure entry point into the authenticated application.

## 9.2 Visual Structure

The login screen should be brand-led and minimal.

Recommended composition:

```text
┌──────────────────────────────────────┐
│                                      │
│          MARUTI GALAXY LOGO         │
│                                      │
│       Secure Business Access         │
│                                      │
│       Email / Auth Identifier        │
│       Password                       │
│                                      │
│       [ Sign In ]                    │
│                                      │
└──────────────────────────────────────┘
```

The exact authentication fields and recovery workflow must follow the selected Supabase Auth implementation.

## 9.3 Authentication UX

The login screen must provide:

- Clear labels
- Proper input types
- Keyboard navigation
- Visible focus states
- Submit loading state
- Invalid-credential feedback at business level
- Disabled submit state while submission is in progress
- Safe error messages
- No technical backend details

Authentication credentials must not be stored or rendered by the application as database profile fields.

---

# 10. Dashboard Requirements

## 10.1 Purpose

The dashboard is the operational overview of the business, not a decorative analytics page.

## 10.2 Required KPIs

The dashboard must support the approved KPI set:

- Total Jobs
- Pending Jobs
- Progress Jobs
- Completed Jobs
- Total Than
- Employee Earnings
- Total Income
- Total Expense
- Current Account Balances
- Outstanding Amount
- Recent Jobs
- Recent Entries

All figures must come from the same authoritative source records as the underlying modules.

## 10.3 Recommended Layout

```text
Page Header
  Dashboard

KPI Row
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Jobs   │ │Pending │ │Progress│ │Complete│
└────────┘ └────────┘ └────────┘ └────────┘

Financial / Operational Summary
┌────────────────────────┐ ┌────────────────────────┐
│ Income / Expense       │ │ Outstanding / Accounts │
└────────────────────────┘ └────────────────────────┘

Recent Activity
┌──────────────────────────────────────────────────┐
│ Recent Jobs                                      │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Recent Entries                                   │
└──────────────────────────────────────────────────┘
```

The exact charting approach is not a fixed business requirement. If charts are used, they must support operational understanding and not become decorative visualizations.

## 10.4 KPI Cards

Each KPI card should contain:

- Short title
- Primary value
- Optional supporting context
- Semantic status treatment where applicable
- Click-through to the relevant module only when a useful drill-down exists

Do not show unsupported metrics simply because they are common dashboard KPIs.

---

# 11. Common List-Page Pattern

All major list pages should follow a consistent layout.

```text
Page Header
├── Title
├── Description / context where useful
└── Primary Action

Summary / KPI strip where required

Toolbar
├── Search
├── Filters
├── Sort
├── Export where applicable
└── Reset Filters

Data Table

Pagination
```

The pattern may be compressed on smaller screens.

## 11.1 Page Header

The page header must clearly communicate:

- Current module
- Primary action
- Optional supporting description

Only one primary action should dominate the page header.

## 11.2 Toolbar

Toolbar controls must be ordered by frequency of use.

Search should appear before secondary filters when search is the primary interaction.

## 11.3 Tables

Tables must support, where required:

- Search
- Filters
- Pagination
- Sorting
- Clear action controls
- Responsive behavior
- Loading state
- Empty state
- Error state

Large lists must use server-side pagination.

---

# 12. Search Requirements

## 12.1 General

Search must be fast, predictable, and server-backed for large datasets.

Search inputs should use a small debounce interval where interactive requests are required.

## 12.2 Jobs Search

Jobs must support search by:

- Lot Number
- Sub Job Number

Examples:

```text
J01
J01-A
J01-B
```

## 12.3 Other Searchable Records

Search should be provided where the product requirements define or where the list is expected to become large, including appropriate party, employee, invoice, account, category, and remarks searches.

The frontend must not download the complete dataset simply to implement browser-side search.

---

# 13. URL State Requirements

List-page state should use URL/search parameters where practical.

The following should preferably be URL-backed:

- Search
- Filters
- Page
- Sort
- Date range

Example:

```text
/jobs?search=J01&status=Progress&jobType=Sarin&party=...
```

Benefits:

- Refresh-safe state
- Browser back/forward support
- Shareable filtered views
- Consistent report/export behavior

Short-lived UI state such as dialog visibility may remain client-side.

---

# 14. Filtering Requirements

## 14.1 Jobs Filters

Jobs must support:

- Job Type
- Job Status
- Employee
- Party

Employee filtering must include jobs where the employee has work entries under the job's sub-jobs.

## 14.2 Accounting Entry Filters

Entries must support:

- Search by Remarks
- Date Range
- Entry Type
- Account
- Category
- Reset Filters
- Export

## 14.3 Account Detail Filters

Account-related entries should support:

- Date Range
- Entry Type
- Category

## 14.4 Filter UX

The filter UI must clearly distinguish:

- Active filters
- Applied values
- Reset action
- No-result state

On mobile, filters should collapse into a compact filter control or drawer.

---

# 15. Pagination and Sorting

Server-side pagination is required for:

- Jobs
- Parties
- Employees
- Invoices
- Entries
- Accounts
- Categories
- Large report datasets

The UI should display sufficient pagination context for the user to understand their position in the dataset.

The frontend must not request unbounded datasets.

Sorting should be server-backed where the dataset is large.

The visible table ordering must remain synchronized with the URL state where sorting is supported.

---

# 16. Party Management

## 16.1 Party List

The Party list should provide:

- Page title: Parties
- Primary action: Add Party
- Search
- Status filtering where applicable
- Pagination
- Clear actions

Recommended columns:

| Column | Purpose |
|---|---|
| Company Name | Primary party identifier |
| Contact Person | Contact context |
| Mobile Number | Contact identifier |
| Price | Default party price |
| Status | Active / inactive state |
| Actions | View / Edit / permitted lifecycle actions |

The exact status display should reflect the database's `is_active` field.

## 16.2 Add/Edit Party Form

Fields:

- Company Name — required
- Contact Person Name — optional
- Mobile Number — required
- Price — required

The form must clearly distinguish required and optional fields.

Price must be a numeric field and must reject negative values.

## 16.3 Party Detail

The party detail screen should provide a clear summary and access to relevant business records, including where supported:

- Party information
- Default price
- Related jobs
- Related invoices
- Outstanding information
- Relevant accounting information

The frontend must not alter historical job prices when the party default price is edited.

---

# 17. Employee Management

## 17.1 Employee List

Recommended columns:

| Column | Purpose |
|---|---|
| Employee Name | Primary identifier |
| Mobile Number | Contact identifier |
| Commission | Current per-Than commission |
| Status | Active / inactive |
| Actions | View / Edit / permitted status actions |

## 17.2 Add/Edit Employee Form

Fields:

- Name — required
- Mobile Number — required
- Commission — required
- Active status where applicable

Commission is a per-Than rate.

Negative commission values must be rejected.

## 17.3 Employee Detail

The employee detail view should present:

- Employee information
- Current commission
- Active/inactive state
- Work history
- Done Than totals where required
- Historical earnings derived from work records

The UI must make clear that historical work retains the commission used at the time of recording.

Changing the current employee commission must not visually or functionally rewrite historical work records.

---

# 18. Jobs Module

The Jobs module is the core operational interface.

It must make the hierarchy easy to understand:

```text
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

## 18.1 Job List

The Jobs list should provide:

- Search by Lot Number / Sub Job Number
- Job Type filter
- Status filter
- Party filter
- Employee filter
- Pagination
- Sorting where useful
- Add Job action

Recommended main columns:

| Column | Purpose |
|---|---|
| Lot Number | Main business identifier |
| Party | Related party |
| Job Type | Sarin / Dropping / Galaxy |
| Than | Main job quantity |
| Weight | Carat weight |
| Price | Final job price |
| Status | Pending / Progress / Completed |
| Actions | View / Edit |

The table may expose remaining Than as a derived operational value if available from the authoritative server response.

## 18.2 Job Status

Allowed statuses:

- Pending
- Progress
- Completed

Do not display or create unapproved status values such as Started, Done, Closed, or Cancelled.

Create and edit forms must include a status picker. Default is Pending.

Status colors should be semantic and consistent across the application.

## 18.3 Create Job Form

Fields:

- Party — required
- Lot Number — system-generated, not a required manual input
- Job Type — required
- Than — required
- Price — populated from selected Party and editable before and after save
- Kapan Number — required
- Weight — required, decimal carat values (`numeric(14,3)` display)
- Status — required picker: Pending / Progress / Completed (default Pending)

Job Type options:

```text
Sarin
Dropping
Galaxy
```

Weight must support decimal values.

### Party Price Behavior

When a Party is selected:

```text
Party Default Price
        ↓
Populate Job Price
        ↓
Admin may edit
        ↓
Store final Job Price
```

The UI should visibly communicate that the populated price is a default and may be edited before saving.

The frontend must not imply that later Party price changes will update the existing Job Price.

## 18.4 Lot Number

Lot Number is the primary business-facing identifier.

Examples:

```text
J01
J02
J03
```

Lot Number is **automatically generated** when the job is created. The
create-job form must not require the Admin to type it.

UX rules:

- Show helper text that the Lot Number will be assigned on save.
- Do not preview or reserve the next number in the browser. Concurrent
  creates would make a preview stale.
- Display the assigned Lot Number on the success state and job detail.
- Lot Number is read-only after creation.
- Search continues to use Lot Number / Sub Job Number.

## 18.5 Job Detail

The Job detail page should be the operational center for a main job.

Recommended structure:

```text
Job Header
├── Lot Number
├── Party
├── Job Type
├── Status
└── Primary actions

Job Summary
├── Than
├── Allocated Than
├── Remaining Than
├── Weight
├── Price
├── Kapan Number
└── Invoice reference

Sub Jobs
├── J01-A
├── J01-B
└── J01-C

Selected / Expanded Sub Job
├── Sub Job Summary
├── Employee Work
└── Add Work
```

The detail page should prioritize operational progress over secondary metadata.

---

# 19. Sub Job Interface

## 19.1 Create Sub Job

A Create Sub Job action should be available from the relevant Main Job detail context.

Before entry, the UI should display the current remaining Main Job Than.

Example:

```text
Main Job Than       2,000
Allocated Than      1,500
Remaining Than        500
```

The requested Sub Job Than must be validated immediately against the visible remaining quantity.

The backend remains authoritative.

## 19.2 Sub Job Number Display

The UI must display:

```text
J01-A
J01-B
J01-C
```

The numeric sequence is an internal implementation detail and should not normally be exposed as the primary business identifier.

## 19.3 Sub Job Form

Fields:

- Sub Job Number — generated/displayed by the system
- Than — required
- Weight — required
- Status — required picker: Pending / Progress / Completed (default Pending)

The form must show remaining Main Job Than before submission.

## 19.4 Sub Job Detail

The sub-job section should provide:

- Sub Job Number
- Parent Lot Number
- Than
- Completed Done Than
- Remaining Than
- Weight
- Status
- Employee Work history
- Add Employee Work action

## 19.5 Quantity Feedback

When a user enters an amount greater than the remaining Main Job Than, the UI should provide a clear inline message such as:

> Sub Job Than exceeds remaining Main Job Than.

The frontend must not rely on this message as the final integrity mechanism.

---

# 20. Employee Work Interface

## 20.1 Purpose

Employee Work records actual completed work against a Sub Job.

The same employee may appear multiple times under the same Sub Job. These entries must remain separate history records.

## 20.2 Work Entry Form

Fields:

- Employee — required
- Done Than — required
- Commission — system-derived / not user-authoritative
- Earning — system-calculated / not user-authoritative

The UI should display the current employee commission as useful context but must not allow the browser to become the authority for the stored commission snapshot.

## 20.3 Work Calculation Preview

When an employee and Done Than are selected, the UI may preview:

```text
Done Than × Commission = Earning
```

The final value must be calculated or validated by the server.

## 20.4 Remaining Than

Before saving work, show:

```text
Sub Job Than
Completed Done Than
Remaining Than
```

If the requested Done Than exceeds the remaining quantity, show inline validation.

## 20.5 Work History

Employee work history should show:

- Employee
- Done Than
- Commission snapshot
- Earning
- Created date/time where appropriate

Historical values must remain stable when the employee's current commission changes.

---

# 21. Invoice Module

## 21.1 Invoice Relationship

Current baseline:

```text
One Main Job → One Invoice
```

The frontend must not provide a UI for multiple invoices per Main Job under the current requirements.

## 21.2 Invoice List

Recommended columns:

| Column | Purpose |
|---|---|
| Invoice Number | Primary invoice identifier |
| Date | Invoice date |
| Lot Number | Related job |
| Party | Related party |
| Amount | Invoice amount |
| Allocated | Settlement amount where available |
| Outstanding | Remaining invoice balance where available |
| Status | Invoice state |
| Actions | View / Print / allocation-related actions |

Search should support Invoice Number and relevant job/party identifiers where implemented by the server query model.

## 21.3 Invoice Detail

The invoice detail view should present the approved business-facing information.

The supplied invoice sample establishes terminology including:

```text
DATE
KAPAN
DESCRIPTION
LOT
WEIGHT
THAN
RATE
TOTAL
```

The exact final mapping of every sample field remains an open clarification and must not be invented.

## 21.4 Invoice Amount

Invoice amount is automatic:

```text
Invoice Amount = Job Than × Final Job Price
```

The UI may display the calculation breakdown, but the browser must not be the authority for the stored amount.

## 21.5 Invoice Fields That Must Not Appear

The current invoice UI must not include:

- Due Date
- Discount
- Tax Amount
- Subtotal
- Total Amount as a duplicate monetary authority
- GST fields
- Payment method
- Transaction reference number

The current invoice model uses a single `amount` value.

## 21.6 Invoice Status

Invoice status should reflect the approved backend model and must not introduce unsupported status values.

Where status is derived from settlement, the UI should distinguish clearly between:

- Invoice amount
- Allocated income
- Outstanding amount

---

# 22. Invoice Settlement / Allocation Interface

## 22.1 Purpose

A party may pay:

- One invoice using multiple Income Entries
- Multiple invoices using one Income Entry

Therefore the UI must support the allocation relationship without pretending that an Entry and an Invoice are one-to-one.

## 22.2 Allocation UI

The allocation interface should show:

```text
Income Entry
Amount
Remaining Entry Amount

Invoice
Invoice Amount
Allocated Amount
Outstanding Amount

Allocation Amount
[ Allocate ]
```

When selecting invoices for an Income Entry, the UI should show enough balance context to prevent accidental over-allocation.

## 22.3 Allocation Validation

The UI must prevent submission when:

- Allocation amount is not positive
- Entry is not an Income Entry
- Entry remaining amount is insufficient
- Invoice outstanding amount is insufficient

The server/database remains authoritative for all allocation rules.

## 22.4 Atomic Feedback

If a concurrent update causes the allocation to become invalid, the frontend must show a conflict/business error and refresh the affected invoice/entry state rather than assuming the previous displayed balance is still valid.

---

# 23. Invoice Print Interface

Invoice printing must be isolated from the normal operational application layout.

Architecture:

```text
Invoice Data
    ↓
Invoice Template
    ↓
Print-friendly HTML/CSS
    ↓
Browser Print / PDF
```

The print view should:

- Exclude application sidebar
- Exclude application topbar
- Exclude interactive controls
- Use print-safe spacing
- Preserve approved business terminology
- Use the Maruti Galaxy identity appropriately
- Display only authoritative invoice data

The supplied invoice sample is the business-format reference.

The exact printed dimensions and final field mapping remain open and must be resolved before the final print template is considered locked.

---

# 24. Accounting Module

Accounting contains three frontend sections:

```text
Accounting
├── Entries
├── Accounts
└── Categories
```

## 24.1 Accounting Navigation

Use tabs or clear sub-navigation to move between:

- Entries
- Accounts
- Categories

The active section must remain visually obvious.

---

# 25. Entries Interface

## 25.1 Entries List

Entries are the unified Income / Expense ledger.

Recommended columns:

| Column | Purpose |
|---|---|
| Date | Entry date |
| Type | Income / Expense |
| Account | Money account |
| Category | Classification |
| Party | Related party where applicable |
| Employee | Related employee where applicable |
| Amount | Financial amount |
| Remarks | Optional context |
| Actions | View / Edit / permitted delete |

## 25.2 Entry Summary

Show:

- Total Income
- Total Expense
- Net Amount
- Total Entry Count

Calculation:

```text
Net Amount = Total Income - Total Expense
```

Income should use a positive/green semantic presentation.

Expense should use a negative/red semantic presentation.

These semantic colors must remain restrained and consistent.

## 25.3 Entry Form

Fields:

- Entry Type — Income / Expense
- Account — required
- Category — required
- Party — where applicable
- Employee — where applicable
- Entry Date — required
- Amount — required and positive
- Remarks — optional

The frontend must dynamically constrain Category options based on Entry Type.

Example:

```text
Entry Type = Income
        ↓
Show Income Categories
```

```text
Entry Type = Expense
        ↓
Show Expense Categories
```

Inactive Accounts and Categories must not be offered for new entries.

## 25.4 Entry Fields That Must Not Appear

Do not add:

- Payment method
- Payment mode
- Transaction reference number
- Separate transaction ID field

unless a future approved requirement explicitly introduces them.

---

# 26. Accounts Interface

## 26.1 Account List

The list must display:

```text
Account Name
Opening Balance
Total In
Total Out
Current Balance
Status
Actions
```

Current Balance:

```text
Opening Balance + Total In - Total Out
```

The balance should be treated as an authoritative derived value, not a browser-maintained counter.

## 26.2 Account Form

Fields:

- Account Name
- Opening Balance
- Active / inactive status where applicable

Opening Balance must not be negative if the database requirement disallows it.

## 26.3 Account Detail

Show:

- Opening Balance
- Total In
- Total Out
- Current Balance
- Total Entry Count
- Related Entries

Related entry filters:

- Date Range
- Entry Type
- Category

The UI must not offer creation of a new Entry against an inactive Account.

Accounts with existing entries must not expose an ordinary destructive delete flow that would violate historical integrity.

---

# 27. Categories Interface

## 27.1 Category List

Recommended columns:

| Column | Purpose |
|---|---|
| Category Name | Classification name |
| Type | Income / Expense |
| Status | Active / inactive |
| Actions | Edit / permitted status actions |

## 27.2 Category Form

Fields:

- Category Name
- Type — Income / Expense
- Active / inactive status where applicable

## 27.3 Category Behavior

The frontend must enforce the same UX relationship as the database:

```text
Income Entry → Income Category
Expense Entry → Expense Category
```

Inactive categories must be hidden from new Entry dropdowns.

A category linked to historical entries must not be presented as freely deletable.

---

# 28. Employee Salary / Payment Presentation

Employee earnings and actual salary/payment are different concepts.

The frontend must preserve this distinction.

Example:

```text
Employee Earned:     ₹10,000
Actual Payment:      ₹6,000
```

The earned amount comes from employee work history.

Actual payment is represented as an Expense Entry.

The UI must not create a separate employee salary database workflow that duplicates the approved accounting model.

---

# 29. Outstanding Interface

Outstanding is derived from invoices and allocated Income Entries.

Conceptually:

```text
Invoice Outstanding
= Invoice Amount - Allocated Income
```

Party outstanding is the sum of unpaid invoice balances for that party.

Where outstanding is displayed, the UI should provide sufficient context to distinguish:

- Total invoice amount
- Amount allocated/received
- Remaining outstanding

Outstanding values must be refreshed after relevant financial mutations.

---

# 30. Reports Module

Required reports:

1. Job Work Reports
2. Payment / Entry Reports
3. Outstanding Reports
4. Salary Reports
5. Profit & Loss Reports
6. Party-wise Ledger
7. Entry-wise Ledger

## 30.1 Reports Landing Page

The Reports page should present the available reports as clear operational choices rather than decorative cards.

Each report should communicate:

- Report name
- Purpose
- Relevant filters
- Open/View action
- Export action where supported

## 30.2 Report Filters

Report filters must be server-backed and should use URL state where practical.

Likely common filters include:

- Date range
- Party
- Employee
- Job Type
- Job Status
- Account
- Category
- Entry Type

Only filters relevant to each report should be shown.

## 30.3 P&L

The approved baseline is:

```text
Income - Expenses = Net Profit / Loss
```

The exact final P&L presentation remains an open clarification. The frontend must not invent an accounting presentation beyond the approved calculation.

## 30.4 Report Export

Export must operate on the same filtered server-side dataset shown to the user.

```text
Filters
  ↓
Server Query
  ↓
Validated Result Set
  ↓
CSV / Excel / Printable Output
```

The frontend must not export a different or broader dataset than the user's active filters imply.

---

# 31. Users Interface

## 31.1 User List

The Users module should present application-level user records.

The current role is:

```text
Admin
```

Recommended columns:

- Name
- Email
- Role
- Status
- Created date where useful
- Actions

Create/edit user form fields:

- Name — required
- Email — required, unique, used as the login identifier
- Password / Confirm Password — create and password-update only; never
  stored in `users`
- Role — Admin for the current baseline
- Active status

The Users table reads `name` and `email` from `public.users`. The
frontend must not invent password-hash fields.

## 31.2 User Status

Inactive users must not be able to perform authenticated application operations.

The frontend may provide a clear active/inactive status control where permitted.

Deactivation must not delete historical records.

## 31.3 Roles

The initial UI must support Admin.

The component architecture should allow future roles without hard-coding authorization assumptions throughout every screen.

The frontend must hide unauthorized navigation/actions for usability, but server-side authorization remains the real security boundary.

## 31.4 Password Handling

The application must not expose or store application-level password hashes in the `users` table.

Password management belongs to Supabase Auth.

Any password-management UI must use supported authentication workflows and must never create a custom credential-storage mechanism.

---

# 32. Forms System

All forms must use a common structure:

```text
Form
├── Field
│   ├── Label
│   ├── Input / Select
│   ├── Helper text
│   └── Error
└── Submit / Cancel
```

## 32.1 Form Requirements

Every form must support:

- Clear labels
- Useful placeholders
- Required indicators
- Inline validation
- Clear error messages
- Correct input types
- Numeric validation
- Keyboard navigation
- Disabled/loading submit state
- Success feedback
- Cancel behavior

## 32.2 Numeric Inputs

Numeric inputs must:

- Reject invalid non-numeric values
- Reject negative values where prohibited
- Prevent accidental text formatting issues
- Support decimal values for weight where required
- Display appropriate unit/context labels

The UI must not silently round business values unless the approved precision rule requires it.

Exact carat precision and rounding remain open requirements.

## 32.3 Unsaved Changes

For complex forms, the frontend should protect users from accidental navigation when there are unsaved changes where the implementation environment supports reliable detection.

Do not add aggressive confirmation prompts to simple forms where they create friction.

---

# 33. Dialogs, Drawers, and Detail Panels

Use dialogs for focused actions such as:

- Small create/edit forms
- Confirmation
- Simple allocation actions
- Short contextual actions

Use drawers/sheets for:

- Detail previews
- Secondary information
- Mobile-friendly detail views
- Contextual record inspection

Use full pages for complex workflows such as:

- Main Job creation
- Main Job detail
- Invoice print
- Large reports
- Operational screens requiring significant information density

All dialogs must:

- Have a clear title
- Have accessible labels
- Provide an obvious close action
- Preserve keyboard focus correctly
- Prevent accidental double submission
- Show mutation loading state
- Show errors without closing unexpectedly

---

# 34. Confirmation Patterns

Destructive actions must require confirmation where deletion/deactivation is permitted.

Confirmation dialogs should state:

1. What record is affected
2. What action will happen
3. Any important consequence
4. Cancel action
5. Confirm action

Example:

```text
Deactivate Employee?

Ramesh will no longer be available for new employee work entries.
Historical work records will remain available.

[ Cancel ] [ Deactivate ]
```

The exact consequences must match the actual server behavior.

Do not offer deletion simply because a table has an Actions column.

---

# 35. Loading States

Every data-heavy screen must define:

- Initial loading state
- Table loading state
- Mutation loading state
- Detail loading state where applicable

Loading states should preserve layout dimensions where practical to reduce visual movement.

Skeletons may be used for tables/cards, but they should remain restrained and consistent with the B2B visual system.

The UI must not show stale financial totals as if they were current while a mutation is being reconciled.

---

# 36. Empty States

Every list/detail section must have a meaningful empty state.

Examples:

```text
No jobs found.
No entries match the selected filters.
No employees found.
No invoices found.
```

Empty states should distinguish between:

- No records exist
- Filters returned no records
- User has no permission
- Data failed to load

Where a primary action can legitimately resolve an empty state, provide that action.

Example:

```text
No parties found.
[ Add Party ]
```

Do not add actions that are not actually available to the user.

---

# 37. Error States

Errors must be presented at the appropriate level.

## 37.1 Validation Error

Show inline beside the affected field where possible.

Example:

```text
Sub Job Than exceeds remaining Main Job Than.
```

## 37.2 Authorization Error

Use a clear business-level message:

```text
You do not have permission to perform this action.
```

## 37.3 Not Found

Provide a dedicated not-found state with navigation back to the relevant module.

## 37.4 Conflict

Use a specific conflict message where possible.

Example:

```text
This Lot Number is already in use.
```

## 37.5 System Error

Use a safe message such as:

```text
Something went wrong. Please try again.
```

Technical details must remain server-side.

Never display:

- SQL statements
- Stack traces
- Database hostnames
- Internal schema details
- Service credentials
- Environment variables
- Internal file paths

---

# 38. Notifications and Toasts

Use a consistent toast/notification system for short-lived operation feedback.

Examples:

```text
Party created successfully.
Job updated successfully.
Employee work added successfully.
Invoice created successfully.
Entry updated successfully.
```

Errors that require user action should not be hidden only in a toast. They should also be presented in the relevant form or screen context.

Avoid excessive toast notifications for passive data refreshes.

---

# 39. Refresh and Data Revalidation

After mutations:

```text
Create / Update / Delete
        ↓
Invalidate affected data
        ↓
Refresh affected view
```

Affected UI should update without requiring a full browser reload where practical.

Important dynamic values such as:

- Job remaining Than
- Employee work totals
- Invoice outstanding
- Party outstanding
- Account balance
- Accounting totals

must not remain visibly stale after a successful mutation.

Read-heavy reference data may be cached carefully, including:

- Active employees
- Active parties
- Active accounts
- Active categories

Highly dynamic financial and job data requires appropriate invalidation.

---

# 40. Concurrency UX

The frontend must assume that more than one browser tab or user may modify records at the same time.

Critical concurrency areas include:

- Sub Job sequence generation
- Main Job Than allocation
- Employee Done Than allocation
- Invoice allocation
- Invoice numbering
- Entry creation

The UI should not attempt to solve concurrency with client-only counters.

When the server reports a conflict:

1. Show a business-level conflict message.
2. Refresh the affected record/list.
3. Recalculate displayed remaining values.
4. Allow the user to retry with current data.

Example:

```text
The available Than changed while you were entering this Sub Job.
The job has been refreshed. Please review the remaining quantity.
```

---

# 41. Security UX Requirements

The frontend is not a security boundary, but it must support the security architecture correctly.

## 41.1 Route Protection

Protected pages must require authentication.

## 41.2 Action Visibility

Actions the user cannot perform should be hidden or disabled according to the authorization model.

However, hiding a button must never be treated as sufficient authorization.

## 41.3 Sensitive Data

Do not expose:

- Supabase service-role credentials
- Database credentials
- Auth tokens in application UI
- Password hashes
- Internal security configuration

## 41.4 Object Access

The UI may display business identifiers such as:

```text
J01
J01-A
Invoice Number
```

but these identifiers must never be treated as authorization credentials.

## 41.5 Export Security

Export actions must require authenticated and authorized access and must use validated filters and reasonable limits.

Generated export files must not unintentionally become public.

---

# 42. Accessibility Requirements

The application should target a professional accessibility baseline appropriate for a production B2B system.

Requirements:

- Keyboard-accessible controls
- Visible focus indicators
- Semantic buttons and links
- Accessible form labels
- Accessible error associations
- Accessible dialog focus management
- Sufficient text/background contrast
- Status information not conveyed by color alone
- Screen-reader-friendly labels for icon-only actions
- Logical heading hierarchy
- Accessible table structure
- Keyboard-friendly pagination and filters

Icon-only buttons must provide an accessible name through an appropriate label.

Do not use color as the only indication of:

- Job status
- Income/Expense
- Active/inactive state
- Validation state

---

# 43. Responsive Requirements

The application must support:

- Desktop
- Laptop
- Tablet
- Mobile

Desktop is the primary operational environment.

## 43.1 Desktop

Use:

- Full sidebar
- Full data tables
- Multi-column forms where appropriate
- Dense but readable operational layout

## 43.2 Tablet

Use:

- Condensed tables
- Responsive action menus
- Reduced form columns
- Compact filters

## 43.3 Mobile

Use:

- Compact navigation
- Horizontal table scrolling where a table cannot reasonably collapse
- Detail drawers/sheets
- Compact filters
- Stacked form fields
- Responsive action menus

Do not simply shrink the desktop layout until text becomes unusable.

The mobile interface must preserve the same business capabilities, even when the presentation changes.

---

# 44. Table Responsive Strategy

Tables are core to this ERP and must not be redesigned inconsistently by individual modules.

Preferred hierarchy:

```text
Desktop
→ Full table

Tablet
→ Condensed columns + responsive actions

Mobile
→ Horizontal scroll or priority-column presentation + detail drawer
```

Actions should remain discoverable without consuming excessive table width.

Primary business identifiers such as Lot Number and Invoice Number should receive higher visual priority than secondary metadata.

---

# 45. Component Architecture

The frontend must use reusable primitives and business-specific components.

## 45.1 Shared UI Primitives

Required reusable primitives include:

```text
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

## 45.2 Business Component Layer

Business components sit above the primitives.

Example:

```text
UI Primitive
    ↓
Data Table
    ↓
Job Table
```

This prevents every module from creating its own visual language.

---

# 46. Job Component Requirements

Recommended job component set:

```text
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

Components should be composable and should not contain unrelated database/business services.

---

# 47. Accounting Component Requirements

Recommended:

```text
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

Accounting components must use the same table, form, filter, pagination, and error patterns as the rest of the application.

---

# 48. Invoice Component Requirements

Recommended:

```text
invoices/
├── InvoiceTable
├── InvoiceDetails
├── InvoicePrint
├── InvoiceStatusBadge
├── InvoiceAllocation
└── InvoiceSummary
```

The print component must remain isolated from the operational invoice detail layout.

---

# 49. Frontend Data Architecture

The frontend should follow the architecture:

```text
UI
 ↓
Server Action / Route Handler
 ↓
Domain Service
 ↓
Supabase / PostgreSQL
```

For read-heavy server-rendered pages:

```text
Server Component
 ↓
Domain Service
 ↓
Supabase / PostgreSQL
```

Avoid scattered direct Supabase calls throughout arbitrary UI components.

## 49.1 Server Components

Use Server Components by default for:

- Page-level data loading
- Dashboard metrics
- Job lists
- Party lists
- Employee lists
- Invoice lists
- Accounting lists
- Reports
- Account summaries
- Category lists

## 49.2 Client Components

Use Client Components only where interactivity requires them, including:

- Dialogs
- Dropdown interactions
- Search input behavior
- Filter controls
- Tabs
- Expand/collapse sub-jobs
- Employee work forms
- Inline UI updates
- Interactive tables
- Date pickers
- Toast notifications

Do not convert an entire page to a Client Component because one section requires interactivity.

---

# 50. Form Submission Architecture

Complex forms should separate:

```text
Form State
    ↓
Validation
    ↓
Submission
    ↓
Server Mutation
    ↓
UI Feedback
    ↓
Data Refresh
```

The browser should not directly implement authoritative business calculations or constraints.

Examples of server-authoritative rules include:

```text
SUM(SubJob.Than) <= MainJob.Than

SUM(EmployeeWork.DoneThan) <= SubJob.Than

Entry Type = Category Type

Allocation <= Invoice Remaining

Allocation <= Entry Remaining
```

---

# 51. Performance Requirements

The frontend must:

- Paginate large lists
- Avoid downloading complete datasets unnecessarily
- Use server-side search/filtering
- Avoid unnecessary client-side calculations
- Use optimized dashboard queries
- Keep accounting aggregations efficient
- Avoid rendering large hidden datasets in the browser
- Use appropriate caching/revalidation
- Avoid unnecessary component re-renders
- Keep interactive bundles focused

The UI should remain responsive during ordinary operational use.

The accounting module must align with server/database indexing for:

- `account_id`
- `category_id`
- Date

The frontend should not attempt to compensate for poor data access by loading larger datasets.

---

# 52. State Management Requirements

State should be divided by responsibility.

## 52.1 Server State

Authoritative records and derived business data belong to server/database state.

Examples:

- Jobs
- Sub Jobs
- Employee Work
- Invoices
- Entries
- Account balances
- Outstanding
- Reports

## 52.2 URL State

Use URL state for:

- Search
- Filters
- Page
- Sort
- Date range

## 52.3 Local UI State

Use client-side local state for:

- Open dialog
- Active tab
- Expanded sub-job
- Temporary form input
- Dropdown state
- Toast visibility

Do not create a client-side duplicate source of truth for financial or quantity records.

---

# 53. Data Formatting Requirements

## 53.1 Currency

Currency values must be presented consistently throughout:

- Dashboard
- Jobs
- Invoices
- Accounting
- Accounts
- Reports

The interface should use a consistent Indian currency presentation where the final application locale requires it.

## 53.2 Quantities

Use the business term **Than** consistently.

## 53.3 Weight

Use carat context consistently.

Example:

```text
12.50 ct
```

Weight supports decimal values with up to 3 decimal places, matching
`numeric(14,3)`. Do not use JavaScript floating-point as the stored
authority.

## 53.4 Dates

Dates must use one consistent application-wide display format.

The internal timestamp should not be displayed in raw database format.

---

# 54. Actions and Iconography

Use a consistent icon set and action vocabulary.

Recommended action patterns:

```text
View
Edit
Deactivate
Delete (only when actually permitted)
Print
Export
Add
Filter
Search
Refresh
```

Icon-only actions must include accessible labels/tooltips.

Avoid using visually ambiguous icons for high-impact financial actions.

Destructive actions should use semantic danger treatment only when the action is actually destructive.

---

# 55. Audit and Historical Presentation

The UI must preserve the distinction between current master data and historical records.

Examples:

- Current Party Price vs stored Job Price
- Current Employee Commission vs historical commission snapshot
- Active Employee vs historical employee work
- Active Account/Category vs historical Entry

When historical information is displayed, label it clearly enough that users do not confuse it with the current master value.

---

# 56. Deactivation UX

Master records with historical dependencies should prefer deactivation over deletion where required by the backend rules.

Applicable entities include:

- Users
- Parties
- Employees
- Accounts
- Categories

The UI should clearly show:

```text
Active
Inactive
```

Inactive records should remain available for historical context where appropriate but should not appear in new-record selection controls when the business/security rules prohibit their use.

---

# 57. Authorization-Aware UI

The frontend should centralize permission checks rather than embedding role assumptions into every page.

The UI may:

- Hide unauthorized navigation
- Hide unauthorized actions
- Disable unavailable actions
- Display permission messages

The UI must not:

- Trust client-side role state as security
- Assume a hidden button prevents unauthorized mutation
- Send sensitive data merely because a component can render it

Every sensitive mutation remains protected server-side.

---

# 58. Export UX

Where export is approved, the export control should use the current active filters.

Recommended pattern:

```text
[ Export ]
    ↓
Export current filtered result
```

If the dataset is large, the UI should communicate that export is being prepared rather than freezing the interface.

Export errors should return a safe business-level message.

---

# 59. Accessibility of Data-Dense Screens

For tables with many columns:

- Maintain clear header associations
- Keep important columns visible or prioritized
- Provide responsive scrolling where required
- Avoid tiny text merely to fit more columns
- Use consistent numeric alignment
- Keep action controls keyboard accessible

For dense accounting tables, visual grouping should help the user distinguish:

```text
Date
Type
Account
Category
Amount
```

without requiring decorative styling.

---

# 60. Browser and Interaction Reliability

The application must be tested across the supported desktop, tablet, and mobile browsers selected for production.

Frontend implementation must avoid fragile visual behavior caused by unnecessary browser-specific CSS or unsupported APIs.

Interactive components must degrade gracefully when nonessential visual effects cannot run.

Business content must never depend on animation, intersection observers, or decorative client-side effects to become visible.

---

# 61. Animation and Motion

Motion must be restrained.

Permitted uses include:

- Dialog entrance/exit
- Drawer entrance/exit
- Subtle loading transitions
- Small state transitions
- Navigation feedback

Avoid:

- Large animated hero sections
- Continuous decorative movement
- Excessive parallax
- Animation that delays access to data
- Animation as a dependency for core content visibility

The application is an ERP/business console, not a marketing website.

---

# 62. Frontend Security Checklist

Before production, verify:

- [ ] Protected routes require authentication
- [ ] Client cannot access service-role credentials
- [ ] No secret uses `NEXT_PUBLIC_`
- [ ] No password hashes exist in application UI/data models
- [ ] Server-side authorization exists for every mutation
- [ ] Client-side validation is not treated as security
- [ ] Business quantities are validated server-side
- [ ] Invoice allocations are validated server-side
- [ ] Object-level access is validated server-side
- [ ] Search/filter parameters are bounded
- [ ] Pagination cannot request unbounded datasets
- [ ] Export endpoints require authentication/authorization
- [ ] Error messages do not expose technical details
- [ ] Auth/session tokens are not stored in inappropriate browser storage
- [ ] Production uses HTTPS
- [ ] Security headers/CSP are configured according to actual dependencies

---

# 63. Frontend Implementation Checklist

## Foundation

- [ ] Next.js App Router established
- [ ] TypeScript enabled
- [ ] Shared application shell created
- [ ] Shared design tokens created
- [ ] Shared UI primitives created
- [ ] Logo integrated
- [ ] Responsive navigation implemented

## Authentication

- [ ] Login page implemented
- [ ] Supabase Auth integration connected
- [ ] Protected routes implemented
- [ ] Auth loading state implemented
- [ ] Auth error state implemented

## Dashboard

- [ ] KPI cards implemented
- [ ] Recent Jobs implemented
- [ ] Recent Entries implemented
- [ ] Financial summaries implemented
- [ ] Outstanding summary implemented
- [ ] Loading/error states implemented

## Parties

- [ ] Party list
- [ ] Party search
- [ ] Party form
- [ ] Party detail
- [ ] Active/inactive behavior

## Employees

- [ ] Employee list
- [ ] Employee form
- [ ] Employee detail
- [ ] Work history
- [ ] Historical commission presentation

## Jobs

- [ ] Job list
- [ ] Search
- [ ] Filters
- [ ] Create Job
- [ ] Edit Job
- [ ] Job detail
- [ ] Sub Job list
- [ ] Create Sub Job
- [ ] Employee Work form
- [ ] Employee Work history
- [ ] Remaining Than display
- [ ] Status display

## Invoices

- [ ] Invoice list
- [ ] Invoice detail
- [ ] Amount presentation
- [ ] Outstanding presentation
- [ ] Allocation interface
- [ ] Print view

## Accounting

- [ ] Entries list
- [ ] Entry form
- [ ] Entry filters
- [ ] Entry summary
- [ ] Accounts list
- [ ] Account form
- [ ] Account detail
- [ ] Categories list
- [ ] Category form

## Reports

- [ ] Job Work Report
- [ ] Payment / Entry Report
- [ ] Outstanding Report
- [ ] Salary Report
- [ ] P&L Report
- [ ] Party Ledger
- [ ] Entry Ledger
- [ ] Filter state
- [ ] Export state

## Users

- [ ] User list
- [ ] Role display
- [ ] Active/inactive state
- [ ] Authorization-aware actions

## Quality

- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Conflict states
- [ ] Confirmation dialogs
- [ ] Toast feedback
- [ ] Accessibility review
- [ ] Responsive review
- [ ] Performance review
- [ ] Security review

---

# 64. Frontend Acceptance Criteria

The frontend baseline is acceptable when:

1. The application presents the approved Maruti Galaxy visual identity.
2. The supplied logo is clearly and correctly represented in the login and authenticated shell.
3. The application uses the approved navy / silver / white visual system.
4. The interface feels premium, industrial, precise, established, clean, and B2B.
5. Navigation matches the approved module structure.
6. All authenticated application routes are protected.
7. Dashboard KPIs use authoritative application data.
8. Parties can be created, edited, searched, and viewed.
9. Employees can be created and managed.
10. Jobs can be created with the approved fields.
11. Party price is populated into a new Job and remains editable.
12. Lot Number is presented as the main job identifier.
13. Kapan Number remains distinct from Lot Number.
14. Job Type is limited to Sarin, Dropping, and Galaxy.
15. Job Status is limited to Pending, Progress, and Completed.
16. Sub Jobs are displayed as J01-A, J01-B, etc.
17. Remaining Main Job Than is visible when creating/allocating Sub Jobs.
18. Employee Work is presented under the correct Sub Job.
19. Remaining Sub Job Than is visible when adding Employee Work.
20. Employee work history can contain repeated entries for the same employee.
21. Historical commission and earning information is presented without being rewritten by current employee commission changes.
22. Invoice information uses the approved terminology and current one-job/one-invoice model.
23. Invoice amount is displayed as an authoritative calculated value.
24. Invoice settlement supports the approved allocation model.
25. Entries support Income and Expense.
26. Category selection respects Entry Type.
27. Account and Category status are reflected in new-entry selection.
28. Account balances are presented as derived values.
29. Outstanding values are presented from invoice/allocation data.
30. Required reports are available.
31. Export uses the same filtered dataset shown to the user.
32. Large lists use server-side pagination.
33. Search and filters use server-side data operations for large datasets.
34. Search/filter/page/sort state is URL-backed where appropriate.
35. Every data-heavy screen has loading, empty, and error states.
36. Business validation errors are shown inline where possible.
37. Technical errors are never exposed to users.
38. Destructive actions use appropriate confirmation and do not bypass historical integrity rules.
39. The interface is responsive across desktop, laptop, tablet, and mobile.
40. Keyboard navigation and accessible labels are implemented.
41. Core business content does not depend on decorative animation or fragile browser-only visual effects.
42. No materials/inventory functionality is introduced.
43. No GST/tax/discount/due-date/payment-method/reference-number functionality is introduced beyond an explicitly approved future requirement.

---

# 65. Open Frontend Decisions

The following items remain open and must not be silently invented by
frontend implementation:

1. Exact invoice print dimensions.
2. Exact final invoice field mapping from the supplied invoice sample.
3. Whether multiple invoice sample rows represent Sub Jobs or another business grouping.
4. Exact report columns for each report beyond the source-entity baseline.
5. Exact P&L presentation beyond Income minus Expense.
6. Exact future permission model beyond Admin.

Closed for frontend implementation:

- Lot Number is auto-generated (`J01`, …) and read-only after save.
- Invoice number is atomically generated (`INV-0001`, …).
- Kapan Number is required.
- Weight is decimal (`numeric(14,3)` / up to 3 dp).
- Job and sub-job Status is a picker (Pending / Progress / Completed), default Pending.
- Job Than and Price remain editable after the invoice exists. Invoice amount is recalculated from the server; the UI must refresh the invoice amount after a successful job edit.
- Party and employee mobile numbers are not unique.
- Users display Name and Email from `public.users`.

The implementation should make these decisions configurable or isolated where practical rather than creating unnecessary rework.

---

# 66. Frontend-to-Backend Alignment Rules

The frontend must remain aligned with the architecture and database requirements.

## Rule 1 — Database Is the Source of Truth

The browser must not maintain authoritative copies of:

- Job quantities
- Employee earnings
- Invoice balances
- Account balances
- Outstanding amounts

## Rule 2 — Server Operations Are Security Boundaries

Every mutation must be validated server-side even if the UI already validated it.

## Rule 3 — Historical Data Must Remain Historical

Changing master records must not silently rewrite historical operational or financial records.

## Rule 4 — Use Approved Entity Names

The baseline contains 12 tables:

```text
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

The frontend should map to these domains without inventing parallel entities.

## Rule 5 — Business Logic Must Not Be Duplicated Incorrectly

Client-side previews may improve UX, but final business calculations must be validated or generated by the server/database.

---

# 67. Recommended Frontend Delivery Sequence

The frontend should be implemented in the same dependency order as the architecture baseline.

```text
Phase 1
Project Foundation
├── Next.js App Router
├── Design Tokens
├── Shared Components
├── Logo / Branding
├── Application Shell
└── Authentication UI

Phase 2
Reference Data
├── Users
├── Parties
└── Employees

Phase 3
Operations
├── Jobs
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
└── Job Work Reports

Phase 7
Dashboard
├── KPIs
├── Recent Activity
└── Financial Summaries

Phase 8
Production Hardening
├── Security Review
├── Performance Review
├── Accessibility Review
├── Responsive Review
├── Error Handling Review
├── Export / Print Review
└── Deployment Verification
```

---

# 68. Traceability to Project Documents

This frontend document derives its requirements from the existing project baselines.

```text
Product Requirements
        ↓
Architecture Requirements
        ↓
Database Requirements
        ↓
Security Requirements
        ↓
Frontend Requirements
        ↓
Implementation
```

The PRD establishes the product scope, terminology, business workflows, dashboard, reports, and approved UI/UX direction.

The Architecture Requirements establish the Next.js structure, Server/Client Component strategy, form architecture, error handling, loading states, pagination, URL state, responsive behavior, shared components, export, and invoice printing approach.

The Database Requirements establish the authoritative entities, relationships, derived values, search/filter capabilities, and transactional integrity that the frontend must consume rather than duplicate.

The Security Requirements establish authentication, authorization, input validation, secure errors, export security, object-level access, session handling, and protection of sensitive information that the frontend must respect.

---

# 69. Final Frontend Principle

Maruti Galaxy should feel like a serious business instrument built for people who need to run operations accurately every day.

The interface should therefore follow one simple standard:

```text
Premium in appearance.
Precise in information.
Fast in operation.
Clear in hierarchy.
Strict in validation.
Quiet in decoration.
Consistent across every module.
```

The design should use the supplied Maruti Galaxy identity to establish trust, while the information architecture and interaction design remain focused on the real diamond job-work workflow.

The frontend is successful when an Admin can move naturally from Party → Job → Sub Job → Employee Work → Invoice → Entry → Report without losing context, misreading quantities, or questioning where the authoritative value came from.

---

# 70. Document Status

**Status:** Baseline Frontend Requirements  
**Project:** Maruti Galaxy  
**Frontend:** Next.js / React / TypeScript  
**Backend:** Supabase / PostgreSQL  
**Authentication:** Supabase Auth  
**Primary Role:** Admin  
**Design Direction:** Maruti Galaxy — Premium Diamond Precision

This document should be treated as the frontend/UI-UX implementation baseline unless a later approved requirement explicitly changes it.
