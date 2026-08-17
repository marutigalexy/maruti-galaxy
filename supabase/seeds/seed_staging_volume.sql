-- PERF-001: staging volume seed — 1,000 jobs and 5,000 entries.
--
-- NEVER run this in production. Production seed is limited to system defaults
-- (Database Requirements §74). This file is for local/CI/staging profiling only.
--
-- Jobs and invoices go through create_job_with_invoice so lot/invoice numbers
-- come from next_lot_number() / next_invoice_number(). Marker masters use the
-- SEED-VOLUME-* names so the set can be wiped and re-run.

SET statement_timeout = '120s';

DO $$
DECLARE
  v_party_id uuid;
  v_employee_id uuid;
  v_account_id uuid;
  v_cat_income uuid;
  v_cat_expense uuid;
  v_i integer;
  v_job_type public.job_type;
  v_status public.job_status;
BEGIN
  IF current_setting('maruti.environment', true) = 'production' THEN
    RAISE EXCEPTION 'SEED_VOLUME_FORBIDDEN_IN_PRODUCTION' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_party_id
  FROM public.parties
  WHERE company_name = 'SEED-VOLUME-PARTY'
  ORDER BY created_at
  LIMIT 1;

  IF v_party_id IS NULL THEN
    INSERT INTO public.parties (company_name, contact_person_name, mobile_number, price, is_active)
    VALUES ('SEED-VOLUME-PARTY', 'Seed Volume', '0000000000', 0, true)
    RETURNING id INTO v_party_id;
  END IF;

  SELECT id INTO v_employee_id
  FROM public.employees
  WHERE name = 'SEED-VOLUME-EMPLOYEE'
  ORDER BY created_at
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, is_active)
    VALUES ('SEED-VOLUME-EMPLOYEE', '0000000000', 0, true)
    RETURNING id INTO v_employee_id;
  END IF;

  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE name = 'SEED-VOLUME-ACCOUNT'
  LIMIT 1;

  IF v_account_id IS NULL THEN
    INSERT INTO public.accounts (name, opening_balance, is_active)
    VALUES ('SEED-VOLUME-ACCOUNT', 0, true)
    RETURNING id INTO v_account_id;
  END IF;

  SELECT id INTO v_cat_income
  FROM public.categories
  WHERE name = 'SEED-VOLUME-INCOME' AND type = 'Income'
  LIMIT 1;

  IF v_cat_income IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('SEED-VOLUME-INCOME', 'Income', true)
    RETURNING id INTO v_cat_income;
  END IF;

  SELECT id INTO v_cat_expense
  FROM public.categories
  WHERE name = 'SEED-VOLUME-EXPENSE' AND type = 'Expense'
  LIMIT 1;

  IF v_cat_expense IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('SEED-VOLUME-EXPENSE', 'Expense', true)
    RETURNING id INTO v_cat_expense;
  END IF;

  DELETE FROM public.entry_invoice_allocations
  WHERE entry_id IN (
    SELECT id FROM public.entries WHERE remarks = 'SEED-VOLUME-ENTRY'
  );

  DELETE FROM public.entries WHERE remarks = 'SEED-VOLUME-ENTRY';

  DELETE FROM public.sub_job_employee_work
  WHERE sub_job_id IN (
    SELECT sj.id
    FROM public.sub_jobs sj
    JOIN public.job_works jw ON jw.id = sj.job_id
    WHERE jw.party_id = v_party_id
  );

  DELETE FROM public.sub_jobs
  WHERE job_id IN (SELECT id FROM public.job_works WHERE party_id = v_party_id);

  DELETE FROM public.invoices
  WHERE job_work_id IN (SELECT id FROM public.job_works WHERE party_id = v_party_id);

  DELETE FROM public.job_works WHERE party_id = v_party_id;

  FOR v_i IN 1..1000 LOOP
    v_job_type := CASE (v_i % 3)
      WHEN 1 THEN 'Sarin'::public.job_type
      WHEN 2 THEN 'Dropping'::public.job_type
      ELSE 'Galaxy'::public.job_type
    END;
    v_status := CASE (v_i % 3)
      WHEN 1 THEN 'Pending'::public.job_status
      WHEN 2 THEN 'Progress'::public.job_status
      ELSE 'Completed'::public.job_status
    END;

    PERFORM *
    FROM public.create_job_with_invoice(
      v_party_id,
      v_job_type,
      (1 + (v_i % 10))::numeric(14, 3),
      100,
      'SEED-VOLUME-KAPAN',
      0.100,
      v_status,
      (CURRENT_DATE - ((v_i % 60)))::date
    );
  END LOOP;

  INSERT INTO public.entries (
    party_id,
    employee_id,
    account_id,
    category_id,
    entry_type,
    entry_date,
    amount,
    remarks
  )
  SELECT
    CASE WHEN i % 2 = 0 THEN v_party_id ELSE NULL END,
    CASE WHEN i % 2 = 1 THEN v_employee_id ELSE NULL END,
    v_account_id,
    CASE WHEN i % 2 = 0 THEN v_cat_income ELSE v_cat_expense END,
    CASE WHEN i % 2 = 0 THEN 'Income'::public.entry_type ELSE 'Expense'::public.entry_type END,
    (CURRENT_DATE - (i % 90))::date,
    (10 + (i % 50))::numeric(14, 2),
    'SEED-VOLUME-ENTRY'
  FROM generate_series(1, 5000) AS i;

  RAISE NOTICE 'PERF-001 seeded 1000 jobs and 5000 entries for SEED-VOLUME-PARTY';
END
$$;
