-- =============================================================================
-- Migration 09: Default Transaction-Linked Categories & Invoice Schema Cleanup
-- Ensures system-required categories exist and are active without duplicates.
-- Removes obsolete invoice due_date column.
-- =============================================================================

ALTER TABLE public.invoices DROP COLUMN IF EXISTS due_date;

INSERT INTO public.categories (name, type, is_active)
VALUES 
  ('Party Payment', 'Income', true),
  ('Employee Salary', 'Expense', true)
ON CONFLICT (name, type) DO UPDATE
SET is_active = true;
