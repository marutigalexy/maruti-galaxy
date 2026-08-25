-- =============================================================================
-- Migration 09: Default Transaction-Linked Categories
-- Ensures system-required categories exist and are active without duplicates.
-- =============================================================================

INSERT INTO public.categories (name, type, is_active)
VALUES 
  ('Party Payment', 'Income', true),
  ('Employee Salary', 'Expense', true)
ON CONFLICT (name, type) DO UPDATE
SET is_active = true;
