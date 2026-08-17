# Maruti Galaxy --- Security Requirements Document

**Project:** Maruti Galaxy\
**Technology:** Next.js + Supabase\
**Database:** PostgreSQL via Supabase\
**Document:** Security Requirements\
**Status:** Baseline / Phase 4

------------------------------------------------------------------------

## 1. Security Objectives

The system must protect:

-   User authentication and sessions
-   Party information
-   Employee information
-   Job and production records
-   Employee earning records
-   Invoice information
-   Accounting entries
-   Invoice settlement/allocation records
-   Administrative operations
-   Database integrity

Security must be enforced at multiple layers:

``` text
Browser
  ↓
Next.js
  ↓
Server-side authorization
  ↓
Supabase
  ↓
PostgreSQL / RLS
```

Client-side controls are not considered sufficient security controls.

------------------------------------------------------------------------

## 2. Authentication

Supabase Auth is the authoritative authentication system.

The application must not store:

``` text
password
password_hash
password_confirmation
```

in the application `users` table.

Authentication credentials remain under Supabase Auth.

The application `users` table stores application-level information such
as:

``` text
id
name
email
role
is_active
created_at
updated_at
```

`name` is the display name. `email` is unique, stored lowercase, and
must match the corresponding Supabase Auth user email at creation.

The application must not store:

``` text
password
password_hash
password_confirmation
```

------------------------------------------------------------------------

## 3. Authorization

Authentication answers:

``` text
Who is the user?
```

Authorization answers:

``` text
What is the user allowed to do?
```

Every protected operation must verify authorization server-side.

Do not rely on:

-   Hidden buttons
-   Disabled UI controls
-   Client-side route checks
-   Client-side role checks
-   JavaScript-only validation

These are usability controls, not security boundaries.

------------------------------------------------------------------------

## 4. User Roles

The initial application role is:

``` text
admin
```

The architecture should allow additional roles later.

Authorization should be centralized so that introducing roles does not
require rewriting every page.

------------------------------------------------------------------------

## 5. Active User Requirement

A user with:

``` text
is_active = false
```

must not be allowed to perform authenticated application operations.

Deactivation must not delete historical records created by that user.

------------------------------------------------------------------------

## 6. Supabase Row Level Security

RLS must be enabled on application tables exposed through Supabase.

The design should follow the principle:

``` text
Default deny
+
Explicit allow
```

Do not create broad policies such as:

``` text
authenticated users can do everything
```

unless that is explicitly justified and restricted by server-side
authorization.

------------------------------------------------------------------------

## 7. Service Role Key

The Supabase service-role key is server-only.

It must never appear in:

``` text
NEXT_PUBLIC_*
```

environment variables.

It must never be:

-   Sent to the browser
-   Embedded in client JavaScript
-   Stored in local storage
-   Included in API responses
-   Committed to Git

If elevated database operations are required, they must run server-side.

------------------------------------------------------------------------

## 8. Public Environment Variables

Only values intended for browser exposure may use:

``` text
NEXT_PUBLIC_*
```

The application must distinguish clearly between:

``` text
public configuration
```

and:

``` text
server secrets
```

------------------------------------------------------------------------

## 9. Server-Side Authorization

Every mutation must validate:

1.  Authenticated session
2.  User exists
3.  User is active
4.  User has required role/permission
5.  Input is valid
6.  Related records are authorized
7.  Business constraints are satisfied

Example:

``` text
Create Job
    ↓
Authenticate
    ↓
Check Active User
    ↓
Check Permission
    ↓
Validate Party
    ↓
Validate Job Data
    ↓
Create Job
```

------------------------------------------------------------------------

## 10. Input Validation

All external input must be validated server-side.

Validation is required for:

-   Party fields
-   Employee fields
-   Job fields
-   Sub-job fields
-   Employee work
-   Invoice data
-   Accounting entries
-   Invoice allocations
-   Search/filter parameters
-   IDs
-   Dates
-   Numeric values

A schema validation library such as Zod may be used.

Client-side validation may improve UX but must never be the only
validation layer.

------------------------------------------------------------------------

## 11. Numeric Validation

The system must reject:

``` text
negative Than
negative weight
negative commission
negative price
negative invoice amount
negative entry amount
negative allocation amount
```

Business quantities must also respect maximum allocation rules.

------------------------------------------------------------------------

## 12. Main Job Than Protection

The system must prevent:

``` text
SUM(sub_jobs.than) > job_works.than
```

This must be enforced atomically.

A malicious request must not be able to bypass the frontend and
over-allocate the main job.

------------------------------------------------------------------------

## 13. Sub Job Employee Work Protection

The system must prevent:

``` text
SUM(done_than) > sub_job.than
```

This must be checked server-side and must be safe under concurrent
requests.

------------------------------------------------------------------------

## 14. Concurrency Protection

Critical operations must use database transactions and appropriate
locking.

Especially:

``` text
Create Sub Job
Add Employee Work
Allocate Entry to Invoice
Generate Sequential Business Numbers
```

Example:

``` text
Request A ─┐
           ├── Database lock/transaction
Request B ─┘
```

The database must remain consistent even when multiple users submit
operations at nearly the same time.

------------------------------------------------------------------------

## 15. Lot Number Security

Lot numbers are business identifiers, not authorization credentials.

They must never be treated as secret values.

If automatically generated, generation must be atomic.

The database must enforce uniqueness.

------------------------------------------------------------------------

## 16. Sub Job Identifier Security

Sub-job display identifiers such as:

``` text
J01-A
J01-B
```

must not be used as authorization mechanisms.

Authorization must be based on the underlying UUID and server-side
access rules.

------------------------------------------------------------------------

## 17. ID Enumeration Protection

Use UUID identifiers for database entities.

Do not expose sequential database IDs where unnecessary.

Public/business identifiers such as:

``` text
J01
J01-A
Invoice Number
```

may be displayed intentionally, but they must not grant access by
themselves.

------------------------------------------------------------------------

## 18. Object-Level Authorization

Every resource lookup must be authorized.

Example:

``` text
GET /job/J01
```

must not simply fetch a record because the user knows `J01`.

The server must verify that the authenticated user is allowed to access
that job.

This protects against IDOR/BOLA vulnerabilities.

------------------------------------------------------------------------

## 19. API Security

API endpoints and Server Actions must:

-   Authenticate the request
-   Authorize the operation
-   Validate input
-   Reject malformed IDs
-   Handle errors safely
-   Avoid exposing internal database errors
-   Avoid returning sensitive information

------------------------------------------------------------------------

## 20. Server Actions

Server Actions must be treated as public security boundaries.

Even if an action is called from a protected page, the action itself
must repeat:

``` text
authentication
authorization
validation
```

Do not assume that only the UI can invoke a Server Action.

------------------------------------------------------------------------

## 21. Route Protection

Protected application routes must be protected server-side.

Unauthenticated users must not be able to access:

``` text
/admin/*
```

or other protected application areas.

Route protection must not rely exclusively on middleware/proxy
redirects.

The actual server-side data operations must also verify authentication
and authorization.

------------------------------------------------------------------------

## 22. Session Security

Use Supabase's supported session mechanisms.

Do not manually create authentication tokens.

Do not store authentication tokens in:

``` text
localStorage
sessionStorage
```

unless there is an explicitly justified architecture requirement.

Prefer secure, framework-compatible session handling.

------------------------------------------------------------------------

## 23. Cookie Security

Authentication cookies should use appropriate:

``` text
HttpOnly
Secure
SameSite
```

attributes according to the deployment architecture.

Production must use HTTPS.

------------------------------------------------------------------------

## 24. CSRF Protection

State-changing requests must be protected against CSRF according to the
chosen Next.js/Supabase architecture.

Particular attention is required for:

``` text
POST
PUT
PATCH
DELETE
```

and Server Actions.

Use framework-supported protections where available rather than
implementing custom cryptographic mechanisms.

------------------------------------------------------------------------

## 25. XSS Protection

All user-controlled text must be treated as untrusted.

Potentially unsafe fields include:

``` text
Company Name
Contact Person
Employee Name
Kapan Number
Lot Number
Remarks
Category Name
Account Name
```

React's default escaping should be preserved.

Avoid `dangerouslySetInnerHTML` unless absolutely necessary.

If HTML rendering is introduced later, sanitize it using a trusted
sanitizer.

------------------------------------------------------------------------

## 26. SQL Injection Protection

Never construct SQL using raw string concatenation from user input.

Use:

-   Supabase query builders
-   Parameterized SQL
-   Safe RPC/database functions

If raw SQL is required, parameters must be bound safely.

------------------------------------------------------------------------

## 27. Search Security

Search inputs must be validated and bounded.

Do not allow unrestricted arbitrary database expressions through search
parameters.

Pagination limits must prevent requests such as:

``` text
limit = 1000000
```

------------------------------------------------------------------------

## 28. Pagination

All large list endpoints should use controlled pagination.

Recommended server-side maximum page size:

``` text
100
```

or another justified business limit.

The client must not be allowed to request unbounded datasets.

------------------------------------------------------------------------

## 29. Rate Limiting

Rate limiting should be applied to sensitive or expensive operations.

Especially:

``` text
Login
Password/reset flows
Public endpoints
Search-heavy endpoints
Export endpoints
Bulk operations
```

The exact implementation depends on deployment infrastructure.

------------------------------------------------------------------------

## 30. Brute Force Protection

Authentication brute-force protection should rely primarily on Supabase
Auth's supported controls.

The application should not expose a custom password authentication
mechanism.

------------------------------------------------------------------------

## 31. Password Management

Password creation, authentication, reset, and password hashing belong to
Supabase Auth.

The application should provide secure password-management workflows
through supported Supabase mechanisms.

No password hash should be added to `users`.

------------------------------------------------------------------------

## 32. Employee Privacy

Employee records contain personal information such as:

``` text
name
mobile number
commission
earnings
```

Access must be restricted to authorized application users.

Do not expose employee information through public APIs.

------------------------------------------------------------------------

## 33. Party Privacy

Party records contain business contact information.

They must not be exposed publicly unless a future requirement explicitly
requires it.

------------------------------------------------------------------------

## 34. Accounting Security

Accounting entries are high-integrity records.

Users must not be able to bypass:

``` text
entry_type
category_type
account relationship
invoice allocation limits
```

through manipulated API requests.

------------------------------------------------------------------------

## 35. Invoice Allocation Security

The server must verify:

``` text
Entry is Income
Invoice exists
Allocation amount > 0
Entry remaining amount >= allocation
Invoice outstanding amount >= allocation
```

All checks must occur inside an atomic database transaction.

------------------------------------------------------------------------

## 36. Financial Data Integrity

Do not calculate financial authority exclusively in the browser.

The browser may display:

``` text
Invoice Outstanding
Account Balance
Party Outstanding
Employee Earnings
```

but authoritative values must be derived server-side/database-side.

------------------------------------------------------------------------

## 37. Employee Earning Integrity

Employee earning must be calculated from:

``` text
done_than × commission_snapshot
```

The commission snapshot must not be accepted blindly from the browser.

The server must read the current employee commission and create the
historical snapshot itself.

------------------------------------------------------------------------

## 38. Price Integrity

Party price is only a default.

When creating a job:

``` text
Party Price
     ↓
Job Price
```

The final job price must be validated server-side.

Changing the party's price must not modify existing jobs.

------------------------------------------------------------------------

## 39. Invoice Integrity

Invoice amount must be generated according to the approved business
logic.

Users should not be able to manipulate invoice amount through a
client-side-only calculation.

The server must determine or validate the final amount.

------------------------------------------------------------------------

## 40. Financial Deletion Rules

Deleting financial records must be heavily restricted.

An entry with invoice allocations must not be deleted in a way that
leaves allocations orphaned.

An invoice with allocations must not be freely deleted.

Where deletion is permitted for the current product requirement, related
financial integrity must still be maintained.

------------------------------------------------------------------------

## 41. Auditability

The system should preserve:

``` text
created_at
updated_at
```

for all important entities.

For high-risk accounting operations, a future audit-log capability
should be considered if regulatory or operational requirements increase.

The current baseline does not require a separate audit-log table unless
introduced as a new requirement.

------------------------------------------------------------------------

## 42. Soft Deactivation

For master records with historical references, prefer:

``` text
is_active = false
```

over deletion.

Applicable to:

``` text
users
parties
employees
accounts
categories
```

Historical records remain intact.

------------------------------------------------------------------------

## 43. Database RLS

RLS policies should be designed around the authenticated user identity.

The application should avoid policies that expose all rows simply
because a user is authenticated.

If the current application has only Admin access, the policy can
initially restrict application tables to authorized active Admin users.

Future roles should be introduced through explicit policies rather than
broadening access indiscriminately.

------------------------------------------------------------------------

## 44. Sensitive Database Operations

Elevated database operations should run only from trusted server-side
code.

Examples:

``` text
Administrative user creation
Sensitive account operations
Atomic allocation operations
Administrative maintenance
```

Never expose privileged database credentials to the browser.

------------------------------------------------------------------------

## 45. Error Handling

Production error responses must not reveal:

-   SQL statements
-   Database hostnames
-   Internal schema details
-   Supabase service credentials
-   Stack traces
-   Environment variables
-   Internal filesystem paths

Users should receive a safe business-level error.

Detailed errors should be logged server-side.

------------------------------------------------------------------------

## 46. Logging

Application logs should record security-relevant failures such as:

``` text
Unauthorized access attempts
Forbidden operations
Validation failures
Allocation failures
Unexpected database failures
Authentication failures where available
```

Do not log:

``` text
Passwords
Auth tokens
Service-role keys
Session secrets
Sensitive personal data unnecessarily
```

------------------------------------------------------------------------

## 47. Logging Correlation

Production logs should include a request/correlation identifier where
practical.

This allows:

``` text
User action
→ API request
→ database operation
→ error
```

to be traced without exposing sensitive information.

------------------------------------------------------------------------

## 48. Secrets Management

Secrets must be stored in environment/secret management systems.

Examples:

``` text
Supabase service role key
Database credentials if directly used
Third-party API secrets
```

Never commit secrets to:

``` text
Git
README
source code
public assets
client bundles
```

------------------------------------------------------------------------

## 49. `.env` Security

Use:

``` text
.env.local
```

for local secrets.

Ensure secret environment files are excluded from Git.

Commit only safe example configuration such as:

``` text
.env.example
```

with placeholder values.

------------------------------------------------------------------------

## 50. Dependency Security

Dependencies must be kept reasonably current.

Security advisories should be reviewed before production deployment.

Avoid unnecessary dependencies, especially packages that:

-   Execute arbitrary code
-   Modify authentication
-   Handle cryptography
-   Inject HTML
-   Manipulate database queries

------------------------------------------------------------------------

## 51. Content Security Policy

A production Content Security Policy should be considered and introduced
after identifying required external resources.

The policy should restrict:

``` text
script-src
style-src
img-src
font-src
connect-src
frame-src
```

to trusted origins.

Do not introduce an overly restrictive CSP that breaks required Supabase
or application functionality; test it in report-only mode first.

------------------------------------------------------------------------

## 52. Security Headers

Production should include appropriate headers such as:

``` text
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

The exact CSP should be derived from actual application dependencies.

------------------------------------------------------------------------

## 53. HTTPS

Production traffic must use HTTPS.

HTTP should redirect to HTTPS where infrastructure permits.

Secure cookies must be used in production.

------------------------------------------------------------------------

## 54. File Uploads

If file uploads are introduced later, they require separate controls:

-   File type validation
-   Size limits
-   Malware/content scanning where appropriate
-   Secure storage
-   Non-executable storage
-   Access control
-   Signed URLs for private files

The current database requirements do not define a file-upload subsystem.

------------------------------------------------------------------------

## 55. Export Security

Reports and invoice exports may contain sensitive business information.

Export operations must:

-   Require authentication
-   Require authorization
-   Validate filters
-   Apply reasonable limits
-   Avoid exposing unrelated records

Generated files must not become publicly accessible unintentionally.

------------------------------------------------------------------------

## 56. Invoice Access

Knowing an invoice number must not automatically grant access.

Invoice retrieval must validate authenticated user permissions.

------------------------------------------------------------------------

## 57. Job Access

Knowing:

``` text
J01
J01-A
```

must not automatically grant access.

The server must authorize the underlying database record.

------------------------------------------------------------------------

## 58. Database Exposure

Only required database fields should be returned to the client.

Avoid:

``` text
SELECT *
```

for sensitive application responses.

Explicit field selection makes accidental exposure less likely when the
schema evolves.

------------------------------------------------------------------------

## 59. API Response Minimization

Do not return:

``` text
internal identifiers
authorization metadata
sensitive audit information
unused personal information
```

unless required by the UI or operation.

UUIDs can be returned where necessary for legitimate client
interactions, but should not be exposed unnecessarily.

------------------------------------------------------------------------

## 60. Mutation Idempotency

Critical financial operations should consider duplicate-submission
protection.

For example:

``` text
Double-click
Network retry
Browser retry
Request replay
```

must not accidentally create duplicate financial records.

This is particularly important for:

``` text
Invoice creation
Entry creation
Invoice allocation
Employee work entry
```

The implementation should use appropriate transaction constraints and/or
idempotency mechanisms.

------------------------------------------------------------------------

## 61. Business Number Uniqueness

Database constraints must enforce uniqueness for:

``` text
lot_number
invoice_number
```

Do not depend solely on application-side:

``` text
check then insert
```

because concurrent requests can bypass such logic.

------------------------------------------------------------------------

## 62. Race Condition Prevention

Unsafe pattern:

``` text
SELECT remaining
IF remaining >= requested
INSERT
```

without locking.

Safe pattern:

``` text
BEGIN
LOCK relevant row
RE-CHECK remaining
INSERT
COMMIT
```

Use database transactions for all quantity-sensitive operations.

------------------------------------------------------------------------

## 63. Security of Database Functions

If PostgreSQL functions/RPCs are used:

-   Validate all arguments.
-   Avoid dynamic SQL where unnecessary.
-   Use controlled `SECURITY DEFINER` functions only when required.
-   Set a safe `search_path` for security-sensitive definer functions.
-   Do not expose privileged functions to anonymous users.
-   Restrict EXECUTE permissions.

------------------------------------------------------------------------

## 64. RLS and Service Role

Supabase service-role access bypasses normal RLS behavior.

Therefore:

``` text
Service Role
=
Trusted Server Boundary
```

Any code using it must perform explicit authorization before executing
privileged operations.

Never assume RLS will protect a service-role operation.

------------------------------------------------------------------------

## 65. Database Permissions

Database permissions should follow least privilege.

Application users should not receive unnecessary direct database
privileges.

Where possible:

``` text
Browser
→ Supabase client / controlled server operation
→ RLS
→ PostgreSQL
```

Administrative maintenance should use controlled privileged operations.

------------------------------------------------------------------------

## 66. Production Database Protection

Production database access should be limited to:

-   Required application infrastructure
-   Authorized developers/administrators
-   Approved operational tooling

Direct database access credentials must not be distributed broadly.

------------------------------------------------------------------------

## 67. Backup Security

Backups contain the full business database and must be treated as
sensitive.

Backup access must be restricted.

Backup copies must receive security controls equivalent to production
data.

------------------------------------------------------------------------

## 68. Data Retention

The current requirements do not define legal retention periods.

Until such requirements are provided:

-   Preserve historical financial records.
-   Preserve employee work records.
-   Preserve invoice allocation history.
-   Avoid destructive cleanup of business history.

------------------------------------------------------------------------

## 69. Security Testing

Before production deployment, test at minimum:

### Authentication

``` text
Unauthenticated access
Expired session
Inactive user
Invalid credentials
```

### Authorization

``` text
Wrong role
Unauthorized record
Direct URL access
Direct API access
```

### Input Security

``` text
SQL injection
XSS
Malformed UUID
Negative numbers
Huge numbers
Invalid enum values
```

### Business Security

``` text
Over-allocation
Duplicate invoice
Duplicate lot
Duplicate submission
Unauthorized deletion
Unauthorized editing
```

------------------------------------------------------------------------

## 70. Security Acceptance Criteria

The security implementation is acceptable when:

-   Supabase Auth handles authentication.
-   No password hashes exist in the application schema.
-   All protected operations authenticate and authorize server-side.
-   RLS is enabled and deliberately configured.
-   Service-role credentials never reach the client.
-   Secrets are not committed to source control.
-   All mutations validate input server-side.
-   SQL injection is prevented.
-   XSS protections remain intact.
-   Object-level authorization prevents IDOR/BOLA.
-   Main Job Than cannot be over-allocated.
-   Sub Job Than cannot be over-allocated.
-   Invoice allocations cannot exceed remaining balances.
-   Only Income entries can settle invoices.
-   Financial deletion cannot break accounting integrity.
-   Historical employee commission/earning records remain stable.
-   Business identifiers are unique at the database level.
-   Critical operations are transaction-safe.
-   Production errors do not expose internal details.
-   Sensitive personal and financial information is not publicly
    exposed.
-   Security headers and HTTPS are configured for production.
-   Security testing is completed before release.

------------------------------------------------------------------------

# 71. Security Architecture Summary

``` text
                    Internet
                       │
                       ▼
                 HTTPS / TLS
                       │
                       ▼
                Next.js Application
                       │
          ┌────────────┴────────────┐
          │                         │
     Authentication            Authorization
     Supabase Auth              Server-side
          │                         │
          └────────────┬────────────┘
                       ▼
                 Input Validation
                       │
                       ▼
               Business Validation
                       │
                       ▼
             Supabase / PostgreSQL
                       │
                       ▼
                  RLS Policies
                       │
                       ▼
                 Data Integrity
                       │
                       ▼
                  PostgreSQL
```

------------------------------------------------------------------------

# 72. Final Security Principle

The application must follow:

``` text
Never trust the browser.
Never trust business identifiers.
Never trust client-side calculations.
Never trust client-side authorization.
Never expose privileged credentials.
Always validate at the server.
Always enforce critical invariants in the database.
Always preserve historical financial integrity.
```

The security model should remain simple, explicit, and auditable:
Supabase Auth for identity, server-side authorization for business
access, PostgreSQL/RLS for data boundaries, and database
transactions/constraints for financial and production integrity.
