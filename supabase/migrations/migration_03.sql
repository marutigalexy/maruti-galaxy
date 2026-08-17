-- Phase 14: Dashboard KPI aggregation (PERF-003).
-- Apply after migration_01.sql and migration_02.sql in the Supabase SQL Editor.
-- SECURITY INVOKER so JWT + RLS still apply. Not a new business table.

CREATE OR REPLACE FUNCTION public.dashboard_kpis(p_from date, p_to date)
RETURNS TABLE (
  jobs_total bigint,
  jobs_pending bigint,
  jobs_progress bigint,
  jobs_completed bigint,
  total_than numeric,
  employee_earnings numeric,
  month_income numeric,
  month_expense numeric,
  outstanding numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.job_works),
    (SELECT count(*) FROM public.job_works WHERE status = 'Pending'),
    (SELECT count(*) FROM public.job_works WHERE status = 'Progress'),
    (SELECT count(*) FROM public.job_works WHERE status = 'Completed'),
    (SELECT coalesce(sum(than), 0) FROM public.job_works),
    (SELECT coalesce(sum(total_earning), 0) FROM public.v_employee_earnings),
    (
      SELECT coalesce(sum(amount), 0)
      FROM public.entries
      WHERE entry_type = 'Income'
        AND entry_date >= p_from
        AND entry_date <= p_to
    ),
    (
      SELECT coalesce(sum(amount), 0)
      FROM public.entries
      WHERE entry_type = 'Expense'
        AND entry_date >= p_from
        AND entry_date <= p_to
    ),
    (SELECT coalesce(sum(outstanding_sum), 0) FROM public.v_party_outstanding);
$$;

REVOKE ALL ON FUNCTION public.dashboard_kpis(date, date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_kpis(date, date) TO authenticated;
