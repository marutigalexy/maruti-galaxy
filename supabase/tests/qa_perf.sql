-- PERF-001 / PERF-002: volume counts, existing indexes, and EXPLAIN ANALYZE
-- of the list/search patterns used by the app. Add indexes only if needed.

CREATE OR REPLACE FUNCTION public._qa_assert(cond boolean, msg text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT cond THEN
    RAISE EXCEPTION 'QA FAIL: %', msg;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._qa_explain(p_sql text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  rec record;
  out_text text := '';
BEGIN
  FOR rec IN EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ' || p_sql
  LOOP
    out_text := out_text || rec."QUERY PLAN" || E'\n';
  END LOOP;
  RETURN out_text;
END;
$$;

DO $$
DECLARE
  v_party_id uuid;
  v_account_id uuid;
  v_jobs bigint;
  v_invoices bigint;
  v_entries bigint;
  v_plan text;
  v_ms numeric;
  v_kpis record;
BEGIN
  SELECT id INTO v_party_id
  FROM public.parties
  WHERE company_name = 'SEED-VOLUME-PARTY'
  ORDER BY created_at
  LIMIT 1;

  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE name = 'SEED-VOLUME-ACCOUNT'
  LIMIT 1;

  PERFORM public._qa_assert(v_party_id IS NOT NULL, 'seed party exists');
  PERFORM public._qa_assert(v_account_id IS NOT NULL, 'seed account exists');

  SELECT count(*) INTO v_jobs FROM public.job_works WHERE party_id = v_party_id;
  SELECT count(*) INTO v_invoices
  FROM public.invoices i
  JOIN public.job_works jw ON jw.id = i.job_work_id
  WHERE jw.party_id = v_party_id;
  SELECT count(*) INTO v_entries FROM public.entries WHERE remarks = 'SEED-VOLUME-ENTRY';

  PERFORM public._qa_assert(v_jobs = 1000, format('expected 1000 seed jobs, got %s', v_jobs));
  PERFORM public._qa_assert(v_invoices = 1000, format('expected 1000 seed invoices, got %s', v_invoices));
  PERFORM public._qa_assert(v_entries = 5000, format('expected 5000 seed entries, got %s', v_entries));

  PERFORM public._qa_assert(
    NOT EXISTS (
      SELECT 1
      FROM public.job_works
      WHERE party_id = v_party_id
        AND lot_number NOT LIKE 'J%'
    ),
    'seed lots come from next_lot_number'
  );
  PERFORM public._qa_assert(
    NOT EXISTS (
      SELECT 1
      FROM public.invoices i
      JOIN public.job_works jw ON jw.id = i.job_work_id
      WHERE jw.party_id = v_party_id
        AND i.invoice_number NOT LIKE 'INV-%'
    ),
    'seed invoices come from next_invoice_number'
  );

  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'job_works_status_idx'),
    'job_works_status_idx'
  );
  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'job_works_party_id_idx'),
    'job_works_party_id_idx'
  );
  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'job_works_created_at_idx'),
    'job_works_created_at_idx'
  );
  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'job_works_lot_number_uidx'),
    'job_works_lot_number_uidx'
  );
  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'entries_account_id_idx'),
    'entries_account_id_idx'
  );
  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'entries_category_id_idx'),
    'entries_category_id_idx'
  );
  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'entries_entry_date_idx'),
    'entries_entry_date_idx'
  );
  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'invoices_status_idx'),
    'invoices_status_idx'
  );
  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'invoices_invoice_number_uidx'),
    'invoices_invoice_number_uidx'
  );
  PERFORM public._qa_assert(
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'parties_company_name_idx'),
    'parties_company_name_idx'
  );
  PERFORM public._qa_assert(
    NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexdef ILIKE '%gin_trgm%'
    ),
    'no trigram indexes without measured need'
  );

  v_plan := public._qa_explain(
    $sql$
      SELECT id, lot_number, party_id, job_type, than, price, kapan_number, weight, status, created_at
      FROM public.job_works
      WHERE status = 'Pending'
      ORDER BY created_at DESC
      LIMIT 20 OFFSET 0
    $sql$
  );
  RAISE NOTICE E'PERF-002 job list by status:\n%', v_plan;
  v_ms := (regexp_match(v_plan, 'Execution Time: ([0-9.]+)'))[1]::numeric;
  PERFORM public._qa_assert(v_ms < 500, format('job status list p95 budget, got %s ms', v_ms));

  v_plan := public._qa_explain(format(
    $sql$
      SELECT id
      FROM public.job_works
      WHERE party_id = %L
      ORDER BY created_at DESC
      LIMIT 20 OFFSET 0
    $sql$,
    v_party_id
  ));
  RAISE NOTICE E'PERF-002 job list by party:\n%', v_plan;
  v_ms := (regexp_match(v_plan, 'Execution Time: ([0-9.]+)'))[1]::numeric;
  PERFORM public._qa_assert(v_ms < 500, format('job party list p95 budget, got %s ms', v_ms));

  v_plan := public._qa_explain(
    $sql$
      SELECT id FROM public.job_works WHERE lot_number ILIKE '%J01%'
    $sql$
  );
  RAISE NOTICE E'PERF-002 lot ILIKE search:\n%', v_plan;
  v_ms := (regexp_match(v_plan, 'Execution Time: ([0-9.]+)'))[1]::numeric;
  PERFORM public._qa_assert(v_ms < 500, format('lot search p95 budget, got %s ms', v_ms));

  v_plan := public._qa_explain(format(
    $sql$
      SELECT id, entry_date, entry_type, amount, account_id
      FROM public.entries
      WHERE account_id = %L
        AND entry_date >= (CURRENT_DATE - 30)
      ORDER BY entry_date DESC, created_at DESC
      LIMIT 20 OFFSET 0
    $sql$,
    v_account_id
  ));
  RAISE NOTICE E'PERF-002 entry list by account/date:\n%', v_plan;
  v_ms := (regexp_match(v_plan, 'Execution Time: ([0-9.]+)'))[1]::numeric;
  PERFORM public._qa_assert(v_ms < 500, format('entry list p95 budget, got %s ms', v_ms));

  v_plan := public._qa_explain(
    $sql$
      SELECT id, invoice_number, invoice_date, amount, status
      FROM public.invoices
      WHERE status = 'Unpaid'
      ORDER BY invoice_date DESC
      LIMIT 20 OFFSET 0
    $sql$
  );
  RAISE NOTICE E'PERF-002 invoice list by status:\n%', v_plan;
  v_ms := (regexp_match(v_plan, 'Execution Time: ([0-9.]+)'))[1]::numeric;
  PERFORM public._qa_assert(v_ms < 500, format('invoice list p95 budget, got %s ms', v_ms));

  v_plan := public._qa_explain(
    $sql$
      SELECT id FROM public.invoices WHERE invoice_number ILIKE '%INV-0001%'
    $sql$
  );
  RAISE NOTICE E'PERF-002 invoice ILIKE search:\n%', v_plan;
  v_ms := (regexp_match(v_plan, 'Execution Time: ([0-9.]+)'))[1]::numeric;
  PERFORM public._qa_assert(v_ms < 500, format('invoice search p95 budget, got %s ms', v_ms));

  v_plan := public._qa_explain(
    $sql$
      SELECT id FROM public.parties WHERE company_name ILIKE '%SEED%'
    $sql$
  );
  RAISE NOTICE E'PERF-002 party company ILIKE search:\n%', v_plan;
  v_ms := (regexp_match(v_plan, 'Execution Time: ([0-9.]+)'))[1]::numeric;
  PERFORM public._qa_assert(v_ms < 500, format('party search p95 budget, got %s ms', v_ms));

  v_plan := public._qa_explain(
    format(
      $sql$
        SELECT * FROM public.dashboard_kpis(%L::date, %L::date)
      $sql$,
      date_trunc('month', CURRENT_DATE)::date,
      CURRENT_DATE
    )
  );
  RAISE NOTICE E'PERF-003 dashboard_kpis:\n%', v_plan;
  v_ms := (regexp_match(v_plan, 'Execution Time: ([0-9.]+)'))[1]::numeric;
  PERFORM public._qa_assert(v_ms < 500, format('dashboard_kpis p95 budget, got %s ms', v_ms));

  SELECT * INTO v_kpis
  FROM public.dashboard_kpis(
    date_trunc('month', CURRENT_DATE)::date,
    CURRENT_DATE
  );
  PERFORM public._qa_assert(v_kpis.jobs_total >= 1000, 'dashboard jobs_total includes seed');
  PERFORM public._qa_assert(v_kpis.total_than > 0, 'dashboard total_than aggregated in SQL');

  RAISE NOTICE 'PERF-001/002/003 passed; Phase 2 B-tree indexes are sufficient at 1k/5k';
END
$$;

DROP FUNCTION public._qa_explain(text);
DROP FUNCTION public._qa_assert(boolean, text);
