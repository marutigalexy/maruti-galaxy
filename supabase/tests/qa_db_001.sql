-- QA-DB-001 / DB-025: constraint, uniqueness, RPC, trigger, and grant tests.
-- Run after migration_01.sql, migration_02.sql, migration_03.sql, and migration_04.sql on a clean database.

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

CREATE OR REPLACE FUNCTION public._qa_expect_failure(p_sql text, p_msg text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'QA FAIL: expected error for %', p_msg;
EXCEPTION
  WHEN raise_exception THEN
    IF SQLERRM LIKE 'QA FAIL:%' THEN
      RAISE;
    END IF;
  WHEN OTHERS THEN
    NULL;
END;
$$;

DO $$
DECLARE
  v_auth_id uuid;
  v_auth_id_2 uuid;
  v_party_id uuid;
  v_party_id_2 uuid;
  v_employee_id uuid;
  v_job_id uuid;
  v_job_id_2 uuid;
  v_invoice_id uuid;
  v_sub_id uuid;
  v_work_id uuid;
  v_account_id uuid;
  v_cat_income uuid;
  v_cat_expense uuid;
  v_cat_income_2 uuid;
  v_entry_income uuid;
  v_entry_expense uuid;
  v_lot text;
  v_inv text;
  v_amount numeric;
  v_status public.invoice_status;
  v_commission numeric;
  v_earning numeric;
  v_done numeric;
  v_display text;
  v_balance numeric;
  v_outstanding numeric;
  v_table_count integer;
  v_has_password boolean;
BEGIN
  -- DB-025 display letters
  PERFORM public._qa_assert(public.sequence_to_alpha(1) = 'A', '1 → A');
  PERFORM public._qa_assert(public.sequence_to_alpha(26) = 'Z', '26 → Z');
  PERFORM public._qa_assert(public.sequence_to_alpha(27) = 'AA', '27 → AA');
  PERFORM public._qa_assert(public.sequence_to_alpha(28) = 'AB', '28 → AB');

  PERFORM public._qa_assert(
    (
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name IN (
          'users', 'parties', 'employees', 'job_works', 'sub_jobs',
          'sub_job_employee_work', 'invoices', 'accounts', 'categories',
          'entries', 'entry_invoice_allocations'
        )
    ) = 11,
    'all 11 listed public business tables exist'
  );

  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
  PERFORM public._qa_assert(v_table_count = 11, 'no extra public tables');

  PERFORM public._qa_assert(
    NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'profiles', 'materials', 'job_materials', 'expenses',
          'employee_earnings', 'payments', 'transactions', 'invoice_items'
        )
    ),
    'forbidden tables must not exist'
  );

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name IN ('password', 'password_hash', 'password_confirmation')
  ) INTO v_has_password;
  PERFORM public._qa_assert(NOT v_has_password, 'users must not store passwords');

  INSERT INTO auth.users (email) VALUES ('QA-Admin@Example.COM') RETURNING id INTO v_auth_id;
  PERFORM public._qa_assert(
    (SELECT email FROM public.users WHERE id = v_auth_id) = 'qa-admin@example.com',
    'auth insert copies public.users email lowercase'
  );
  PERFORM public._qa_assert(
    (SELECT role FROM public.users WHERE id = v_auth_id) = 'admin',
    'auth insert creates public.users as admin'
  );
  PERFORM public._qa_assert(
    (SELECT is_active FROM public.users WHERE id = v_auth_id) IS TRUE,
    'auth insert creates an active public.users row'
  );
  UPDATE public.users SET name = 'QA Admin' WHERE id = v_auth_id;

  INSERT INTO auth.users (email) VALUES ('qa-admin-2@example.com') RETURNING id INTO v_auth_id_2;
  PERFORM public._qa_expect_failure(
    format(
      'UPDATE public.users SET email = %L WHERE id = %L',
      'qa-admin@example.com',
      v_auth_id_2
    ),
    'duplicate email'
  );

  INSERT INTO public.parties (company_name, mobile_number, price)
  VALUES ('Party A', '9999999999', 10.50)
  RETURNING id INTO v_party_id;

  INSERT INTO public.parties (company_name, mobile_number, price)
  VALUES ('Party B', '9999999999', 0)
  RETURNING id INTO v_party_id_2;
  PERFORM public._qa_assert(v_party_id_2 IS NOT NULL, 'mobile is not unique');

  PERFORM public._qa_expect_failure(
    'INSERT INTO public.parties (company_name, mobile_number, price) VALUES (''Bad'', ''1'', -1)',
    'negative party price'
  );

  INSERT INTO public.employees (name, mobile_number, commission)
  VALUES ('Emp One', '8888888888', 2.25)
  RETURNING id INTO v_employee_id;

  PERFORM public._qa_expect_failure(
    'INSERT INTO public.employees (name, mobile_number, commission) VALUES (''Bad'', ''1'', -0.01)',
    'negative commission'
  );

  PERFORM public._qa_expect_failure(
    format(
      'INSERT INTO public.job_works (lot_number, party_id, job_type, than, price, kapan_number, weight) VALUES (''J99'', %L, ''Sarin'', 10, 1, ''K1'', 1)',
      v_party_id
    ),
    'direct job insert must use RPC'
  );

  SELECT job_id, lot_number, invoice_id, invoice_number, amount
  INTO v_job_id, v_lot, v_invoice_id, v_inv, v_amount
  FROM public.create_job_with_invoice(
    v_party_id, 'Sarin', 100.5, 10.00, 'KAPAN-1', 12.500, 'Pending', CURRENT_DATE
  );

  PERFORM public._qa_assert(v_lot = 'J01', 'first lot is J01');
  PERFORM public._qa_assert(v_inv = 'INV-0001', 'first invoice is INV-0001');
  PERFORM public._qa_assert(v_amount = 1005.00, 'invoice amount = than × price');
  PERFORM public._qa_assert(
    (SELECT weight FROM public.job_works WHERE id = v_job_id) = 12.500,
    'decimal weight stored'
  );

  SELECT job_id, lot_number, invoice_number
  INTO v_job_id_2, v_lot, v_inv
  FROM public.create_job_with_invoice(
    v_party_id, 'Galaxy', 50, 1, 'KAPAN-2', 0, 'Pending', CURRENT_DATE
  );
  PERFORM public._qa_assert(v_lot = 'J02', 'second lot is J02');
  PERFORM public._qa_assert(v_inv = 'INV-0002', 'second invoice is INV-0002');

  SELECT id INTO v_sub_id
  FROM public.create_sub_job(v_job_id, 40, 1.250, 'Pending');
  PERFORM public._qa_assert(
    (SELECT display_no FROM public.v_sub_jobs_display WHERE id = v_sub_id) = 'J01-A',
    'sub-job display J01-A'
  );

  PERFORM public.create_sub_job(v_job_id, 60.5, 0, 'Pending');

  PERFORM public._qa_expect_failure(
    format('SELECT public.create_sub_job(%L, 0.001, 0, ''Pending'')', v_job_id),
    'sub-job than cannot exceed remaining'
  );

  SELECT id, commission, earning, done_than
  INTO v_work_id, v_commission, v_earning, v_done
  FROM public.add_employee_work(v_sub_id, v_employee_id, 10);
  PERFORM public._qa_assert(v_commission = 2.25, 'commission snapshotted from employee');
  PERFORM public._qa_assert(v_earning = 22.50, 'earning = done_than × commission');

  UPDATE public.employees SET commission = 9.99 WHERE id = v_employee_id;
  PERFORM public._qa_assert(
    (SELECT commission FROM public.sub_job_employee_work WHERE id = v_work_id) = 2.25,
    'historical commission unchanged'
  );

  PERFORM public._qa_expect_failure(
    format('SELECT public.add_employee_work(%L, %L, 40)', v_sub_id, v_employee_id),
    'done_than cannot exceed remaining'
  );

  PERFORM public._qa_assert(
    (SELECT status FROM public.sub_jobs WHERE id = v_sub_id) = 'Progress',
    'first work advances Pending to Progress'
  );

  INSERT INTO public.accounts (name, opening_balance)
  VALUES ('Cash', 100) RETURNING id INTO v_account_id;
  INSERT INTO public.categories (name, type)
  VALUES ('Job Income', 'Income') RETURNING id INTO v_cat_income;
  INSERT INTO public.categories (name, type)
  VALUES ('Salary', 'Expense') RETURNING id INTO v_cat_expense;
  INSERT INTO public.categories (name, type)
  VALUES ('Job Income', 'Expense') RETURNING id INTO v_cat_income_2;
  PERFORM public._qa_assert(v_cat_income_2 IS NOT NULL, 'same category name allowed across types');

  PERFORM public._qa_expect_failure(
    format(
      'INSERT INTO public.categories (name, type) VALUES (''Job Income'', ''Income'')'
    ),
    'unique name+type'
  );

  INSERT INTO public.entries (
    account_id, category_id, entry_type, entry_date, amount
  ) VALUES (
    v_account_id, v_cat_income, 'Income', CURRENT_DATE, 500
  ) RETURNING id INTO v_entry_income;

  PERFORM public._qa_expect_failure(
    format(
      'INSERT INTO public.entries (account_id, category_id, entry_type, entry_date, amount) VALUES (%L, %L, ''Expense'', CURRENT_DATE, 10)',
      v_account_id, v_cat_income
    ),
    'entry type must match category type'
  );

  INSERT INTO public.entries (
    account_id, category_id, entry_type, entry_date, amount, employee_id
  ) VALUES (
    v_account_id, v_cat_expense, 'Expense', CURRENT_DATE, 20, v_employee_id
  ) RETURNING id INTO v_entry_expense;

  UPDATE public.accounts SET is_active = false WHERE id = v_account_id;
  PERFORM public._qa_expect_failure(
    format(
      'INSERT INTO public.entries (account_id, category_id, entry_type, entry_date, amount) VALUES (%L, %L, ''Income'', CURRENT_DATE, 1)',
      v_account_id, v_cat_income
    ),
    'inactive account rejected on insert'
  );
  UPDATE public.accounts SET is_active = true WHERE id = v_account_id;

  UPDATE public.categories SET is_active = false WHERE id = v_cat_income;
  PERFORM public._qa_expect_failure(
    format(
      'INSERT INTO public.entries (account_id, category_id, entry_type, entry_date, amount) VALUES (%L, %L, ''Income'', CURRENT_DATE, 1)',
      v_account_id, v_cat_income
    ),
    'inactive category rejected on insert'
  );
  UPDATE public.categories SET is_active = true WHERE id = v_cat_income;

  PERFORM public._qa_expect_failure(
    format(
      'SELECT public.allocate_entry_to_invoices(%L, ARRAY[ROW(%L, 10)::public.allocation_item])',
      v_entry_expense, v_invoice_id
    ),
    'expense allocation blocked'
  );

  PERFORM public.allocate_entry_to_invoices(
    v_entry_income,
    ARRAY[ROW(v_invoice_id, 200)::public.allocation_item]
  );
  PERFORM public._qa_assert(
    (SELECT status FROM public.invoices WHERE id = v_invoice_id) = 'Partially Paid',
    'partial allocation sets Partially Paid'
  );

  PERFORM public._qa_expect_failure(
    format(
      'SELECT public.allocate_entry_to_invoices(%L, ARRAY[ROW(%L, 400)::public.allocation_item])',
      v_entry_income, v_invoice_id
    ),
    'entry remaining cannot be exceeded'
  );

  PERFORM public._qa_expect_failure(
    format(
      'SELECT * FROM public.update_job_with_invoice_recalc(%L, 10, 1)',
      v_job_id
    ),
    'new than cannot be below sub-job than'
  );

  SELECT amount, status INTO v_amount, v_status
  FROM public.update_job_with_invoice_recalc(v_job_id, 100.5, 20);
  PERFORM public._qa_assert(v_amount = 2010.00, 'invoice recalculated as than × price');
  PERFORM public._qa_assert(v_status = 'Partially Paid', 'status re-derived after recalc');

  PERFORM public._qa_expect_failure(
    format(
      'SELECT * FROM public.update_job_with_invoice_recalc(%L, 100.5, 1)',
      v_job_id
    ),
    'new amount cannot be below allocations'
  );

  SELECT current_balance INTO v_balance
  FROM public.v_account_balances
  WHERE account_id = v_account_id;
  PERFORM public._qa_assert(v_balance = 580.00, 'balance = opening + income - expense');

  SELECT outstanding INTO v_outstanding
  FROM public.v_invoice_outstanding
  WHERE invoice_id = v_invoice_id;
  PERFORM public._qa_assert(v_outstanding = 1810.00, 'outstanding = amount - allocated');

  PERFORM public._qa_expect_failure(
    format('DELETE FROM public.parties WHERE id = %L', v_party_id),
    'party with jobs cannot be deleted'
  );

  PERFORM public._qa_expect_failure(
    format('UPDATE public.job_works SET lot_number = ''JX'' WHERE id = %L', v_job_id),
    'lot number immutable'
  );

  PERFORM public._qa_expect_failure(
    format('SELECT public.update_sub_job(%L, 5, NULL, NULL)', v_sub_id),
    'sub-job than cannot be less than done than'
  );

  PERFORM public.update_sub_job(v_sub_id, 35, 1.250, 'Progress');
  PERFORM public._qa_assert(
    (SELECT than FROM public.sub_jobs WHERE id = v_sub_id) = 35,
    'sub-job than updated'
  );

  -- QA-JOB-002: a second work post that would exceed remaining Than is rejected.
  -- FOR UPDATE in add_employee_work serializes concurrent posts on the same sub-job.
  PERFORM public.add_employee_work(v_sub_id, v_employee_id, 20);
  PERFORM public._qa_expect_failure(
    format('SELECT public.add_employee_work(%L, %L, 20)', v_sub_id, v_employee_id),
    'second work post cannot exceed remaining than'
  );

  PERFORM public._qa_assert(
    to_regprocedure('public.dashboard_kpis(date, date)') IS NOT NULL,
    'dashboard_kpis exists'
  );
  PERFORM public._qa_assert(
    (SELECT jobs_total FROM public.dashboard_kpis(CURRENT_DATE, CURRENT_DATE)) >= 1,
    'dashboard_kpis aggregates job_works'
  );

  BEGIN
    SET LOCAL ROLE anon;
    PERFORM public._qa_expect_failure('SELECT count(*) FROM public.parties', 'anon denied parties');
    PERFORM public._qa_expect_failure(
      'SELECT * FROM public.dashboard_kpis(CURRENT_DATE, CURRENT_DATE)',
      'anon denied dashboard_kpis'
    );
    RESET ROLE;
  EXCEPTION
    WHEN OTHERS THEN
      RESET ROLE;
      RAISE;
  END;

  RAISE NOTICE 'QA-DB-001 passed';
END
$$;

DROP FUNCTION public._qa_expect_failure(text, text);
DROP FUNCTION public._qa_assert(boolean, text);
