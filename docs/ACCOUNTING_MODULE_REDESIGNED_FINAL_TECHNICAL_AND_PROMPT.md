
# 📘 ACCOUNTING MODULE – REDESIGNED FINAL ARCHITECTURE
## (Developer Technical Specification + Functional Flow + AI Prompt Template)

---

# 1. ACCOUNTING MODULE STRUCTURE

The Accounting Module is structured using a tab-based layout.

Accounting
├── Entries
├── Account
└── Categories

All financial management operations are handled within these three tabs.

---

# 2. UI LAYOUT STRUCTURE

The Accounting page consists of three main horizontal sections:

1. Tab Bar (Top Level Navigation)
2. Dynamic Action & Filter Bar (Below Tab Bar)
3. Data List / Content Section

The Action & Filter Bar changes dynamically based on the selected tab.

---

# 3. TAB BAR (STATIC)

Tabs:

- Entries
- Account
- Categories

Switching tabs updates:

- Action buttons
- Filters
- Displayed data
- Export behavior

---

# 4. DYNAMIC ACTION & FILTER BAR

This bar appears below the tab bar and changes based on selected tab.

It includes:

- Action Buttons (Left)
- Search Field
- Filter Controls
- Export Button
- Reset Filters Button

---

# 5. TAB-WISE ACTION & FILTER BEHAVIOR

## 5.1 When "Entries" Tab is Selected

### Action Buttons:
- Add Income
- Add Expense

Both buttons must be visible simultaneously.

### Filters & Controls:
- Search (by Remarks)
- Date Range Filter
- Entry Type Filter (Income / Expense / Both)
- Account Filter
- Category Filter
- Export Button
- Reset Filters

---

# 6. ENTRIES TAB – FUNCTIONAL STRUCTURE

## 6.1 Purpose

Manage all financial transactions in a unified list (Income + Expense combined).

---

## 6.2 Entry Fields

Each entry must contain:

- Entry Type (Income / Expense)
- Account (Required)
- Category (Required)
- Amount (Required)
- Date (Required)
- Remarks (Optional)

---

## 6.3 Entries Table Structure

| Date | Type | Account | Category | Amount | Remarks | Actions |

UI Rules:

- Income → Green amount with "+" prefix
- Expense → Red amount with "-" prefix
- Pagination required
- Sorting enabled

---

## 6.4 Financial Logic

If Entry Type = Income:

Account Balance += Amount

If Entry Type = Expense:

Account Balance -= Amount

On Update:
Adjust difference accordingly.

On Delete:
Reverse previous balance impact.

---

## 6.5 Entries Summary Section (Above Table)

Display:

- Total Income (Filtered)
- Total Expense (Filtered)
- Net Amount
- Total Transactions Count

Net = Total Income - Total Expense

---

# 7. WHEN "ACCOUNT" TAB IS SELECTED

## 7.1 Action Button:
- Add Account

## 7.2 Filters & Controls:
- Search by Account Name
- Status Filter
- Export Button
- Reset Filters

---

# 8. ACCOUNT LIST VIEW STRUCTURE

| Account Name | Opening Balance | Total In | Total Out | Current Balance | Status | Actions |

---

## 8.1 Account Calculations

Total In  = SUM(income.amount WHERE account_id = X)  
Total Out = SUM(expense.amount WHERE account_id = X)  
Current Balance = Opening Balance + Total In - Total Out  

Dynamic calculation recommended.

---

# 9. ACCOUNT DETAIL VIEW (ON ACCOUNT SELECTION)

Selecting an account opens a detail panel/page.

## 9.1 Summary Cards:
- Opening Balance
- Total In
- Total Out
- Current Balance
- Total Entry Count

## 9.2 Related Entries List

Auto-filtered by selected account.

Filters:
- Date Range
- Entry Type
- Category

---

## 9.3 Prevention Rules

- Cannot delete account if entries exist
- Cannot create entry under inactive account

---

# 10. WHEN "CATEGORIES" TAB IS SELECTED

## 10.1 Action Button:
- Add Category

## 10.2 Filters & Controls:
- Search by Category Name
- Type Filter (Income / Expense)
- Status Filter
- Export Button
- Reset Filters

---

# 11. CATEGORIES LIST VIEW

| Category Name | Type | Status | Actions |

---

## 11.1 Add Category Form Fields

- Category Name (Required)
- Category Type (Income / Expense) (Required)
- Status (Active / Inactive)

---

## 11.2 Category Rules

- Income category usable only for Income entries
- Expense category usable only for Expense entries
- Prevent deletion if linked to entries
- Hide inactive category from entry dropdown

---

# 12. SYSTEM-WIDE RECALCULATION FLOW

Whenever an entry is:

- Created
- Updated
- Deleted

System must:

1. Recalculate account totals
2. Update Account tab list
3. Update Entries summary
4. Update Account Detail view

All updates must reflect instantly.

---

# 13. VALIDATION RULES

- Amount must be positive
- Account required
- Category required
- Entry type required
- Date required
- Prevent inactive account usage
- Prevent inactive category usage

---

# 14. PERFORMANCE REQUIREMENTS

- Index on account_id
- Index on category_id
- Index on date
- Aggregation queries optimized
- Paginated entries list
- Avoid loading full dataset

---

# 15. FINAL UX FLOW SUMMARY

Entries → Manage All Transactions  
Account → Manage Accounts & View Financial Overview  
Categories → Manage Income & Expense Categories  

This redesigned module provides:

- Modern tab-driven UI
- Dynamic action & filter bar
- Unified transaction handling
- Account-based financial control
- Clean category management
- Scalable and production-ready architecture

---

# 16. AI IMPLEMENTATION PROMPT TEMPLATE

PROMPT START

Create a redesigned Accounting Module with:

1. Tab-based structure: Entries, Account, Categories.
2. Dynamic action & filter bar that changes per selected tab.
3. Entries tab with Add Income and Add Expense buttons.
4. Unified transaction list with filters (date range, type, account, category).
5. Account tab with account list and dynamic financial totals.
6. Categories tab with category type flag (Income/Expense).
7. Real-time recalculation of balances. 
8. Export functionality respecting filters.

Generate:

- Data models
- Service logic
- Aggregation queries
- API endpoints
- Validation rules
- UI state logic

Ensure scalable, modular, production-ready implementation.

PROMPT END

---

This document represents the complete and final redesigned Accounting Module specification.
