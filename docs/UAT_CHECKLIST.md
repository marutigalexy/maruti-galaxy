# UAT checklist (QA-005)

**Project:** Maruti Galaxy  
**Standard:** PRD §31 + Master Plan Section 14 critical path  
**Prepared:** 2026-08-17  
**Business sign-off:** pending (this file is the UAT script, not a signature)

Walk this list on staging with a real invoice sample and the live reports. Automated coverage is `npm run test:e2e` when `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` are set.

## Critical path

| Step | Check | Pass |
|---|---|---|
| 1 | Admin signs in through Supabase Auth | |
| 2 | Create party, employee, account, income category, expense category | |
| 3 | Create job; lot assigned; invoice exists; amount = Than × Price | |
| 4 | Create sub-jobs that fill remaining Than; display `J01-A` | |
| 5 | Add employee work; status moves Progress/Completed; earning snapshot stored | |
| 6 | Income entry; allocate to invoice; invoice status Paid | |
| 7 | Expense salary for the employee | |
| 8 | Dashboard, outstanding, and P&L show the same source numbers | |
| 9 | Logout confirm; session ended | |

## PRD §31

| Criterion | Pass |
|---|---|
| Admin can authenticate through Supabase Auth | |
| Parties can be created, edited, searched, and viewed | |
| Employees can be created and managed | |
| Jobs can be created with Lot, Party, Type, Than, Price, Kapan, Weight, Status | |
| Party price is fetched and job price remains editable | |
| Multiple sub-jobs can be created under a main job | |
| Sub-job Than cannot exceed remaining main-job Than | |
| Sub-job identifiers display as `J01-A`, `J01-B`, etc. | |
| Employee work can be added multiple times | |
| Employee Done Than cannot exceed remaining sub-job Than | |
| Employee commission and earning history are preserved | |
| Job and sub-job status follows the agreed automation | |
| Job search and filters work as specified | |
| Invoice is created with the job | |
| Invoice amount is automatically calculated | |
| Accounting supports Income and Expense entries | |
| Accounts calculate Opening + In − Out | |
| Categories enforce Income/Expense matching | |
| Invoice settlements support 1:N and N:1 allocation | |
| Outstanding is derived from invoices and allocations | |
| Employee salary payments are Expense entries | |
| Required reports are available | |
| Accounting balances update after entry create/update/delete | |
| UI follows Maruti Galaxy visual identity | |
| No materials/inventory functionality is introduced | |

## Sign-off

| Role | Name | Date | Result |
|---|---|---|---|
| Business | | | |
| Implementer | | | Automated pack: `npm run qa:regression` |
