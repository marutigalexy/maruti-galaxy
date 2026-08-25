-- =============================================================================
-- Maruti Galaxy: Complete Comprehensive Seed Data
-- Sub-Job Pipeline Architecture, Master Data, Invoicing, Allocations & Accounting
-- =============================================================================

DO $$
DECLARE
  -- Accounts
  v_acc_hdfc uuid;
  v_acc_icici uuid;
  v_acc_sbi uuid;
  v_acc_cash uuid;

  -- Categories
  v_cat_job_work uuid;
  v_cat_party_pmt uuid;
  v_cat_rough_proc uuid;
  v_cat_laser_serv uuid;
  v_cat_scrap uuid;
  v_cat_salary uuid;
  v_cat_emp_salary uuid;
  v_cat_maintenance uuid;
  v_cat_electricity uuid;
  v_cat_rent uuid;
  v_cat_office uuid;
  v_cat_tea uuid;

  -- Parties
  v_pty_shree_ram uuid;
  v_pty_dharmanandan uuid;
  v_pty_kiran uuid;
  v_pty_hari_krishna uuid;
  v_pty_venus uuid;
  v_pty_laxmi uuid;

  -- Employees
  v_emp_ramesh uuid;
  v_emp_ketan uuid;
  v_emp_pravin uuid;
  v_emp_mahesh uuid;
  v_emp_suresh uuid;
  v_emp_dinesh uuid;
  v_emp_alpesh uuid;
  v_emp_nilesh uuid;
  v_emp_chetan uuid;

  -- Jobs
  v_job_1 uuid;
  v_job_2 uuid;
  v_job_3 uuid;
  v_job_4 uuid;
  v_job_5 uuid;
  v_job_6 uuid;

  -- Sub-jobs
  v_sub_1a uuid;
  v_sub_1b uuid;
  v_sub_1c uuid;
  v_sub_2a uuid;
  v_sub_2b uuid;
  v_sub_3a uuid;
  v_sub_3b uuid;
  v_sub_4a uuid;
  v_sub_5a uuid;
  v_sub_6a uuid;
  v_sub_6b uuid;

  -- Invoices
  v_inv_1 uuid;
  v_inv_2 uuid;
  v_inv_3 uuid;
  v_inv_4 uuid;
  v_inv_5 uuid;

  -- Entries
  v_ent_pay_1 uuid;
  v_ent_pay_2 uuid;
  v_ent_pay_4 uuid;
  v_ent_pay_6 uuid;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. ACCOUNTS
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_acc_hdfc FROM public.accounts WHERE name = 'HDFC Bank - Current A/C' LIMIT 1;
  IF v_acc_hdfc IS NULL THEN
    INSERT INTO public.accounts (name, opening_balance, is_active)
    VALUES ('HDFC Bank - Current A/C', 500000.00, true)
    RETURNING id INTO v_acc_hdfc;
  END IF;

  SELECT id INTO v_acc_icici FROM public.accounts WHERE name = 'ICICI Bank - Operations' LIMIT 1;
  IF v_acc_icici IS NULL THEN
    INSERT INTO public.accounts (name, opening_balance, is_active)
    VALUES ('ICICI Bank - Operations', 250000.00, true)
    RETURNING id INTO v_acc_icici;
  END IF;

  SELECT id INTO v_acc_sbi FROM public.accounts WHERE name = 'State Bank of India' LIMIT 1;
  IF v_acc_sbi IS NULL THEN
    INSERT INTO public.accounts (name, opening_balance, is_active)
    VALUES ('State Bank of India', 150000.00, true)
    RETURNING id INTO v_acc_sbi;
  END IF;

  SELECT id INTO v_acc_cash FROM public.accounts WHERE name = 'Cash on Hand' LIMIT 1;
  IF v_acc_cash IS NULL THEN
    INSERT INTO public.accounts (name, opening_balance, is_active)
    VALUES ('Cash on Hand', 50000.00, true)
    RETURNING id INTO v_acc_cash;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2. CATEGORIES
  -- ---------------------------------------------------------------------------
  -- Income Categories
  SELECT id INTO v_cat_party_pmt FROM public.categories WHERE name = 'Party Payment' AND type = 'Income' LIMIT 1;
  IF v_cat_party_pmt IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Party Payment', 'Income', true)
    RETURNING id INTO v_cat_party_pmt;
  END IF;

  SELECT id INTO v_cat_job_work FROM public.categories WHERE name = 'Job Work Billing' AND type = 'Income' LIMIT 1;
  IF v_cat_job_work IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Job Work Billing', 'Income', true)
    RETURNING id INTO v_cat_job_work;
  END IF;

  SELECT id INTO v_cat_rough_proc FROM public.categories WHERE name = 'Rough Diamond Processing' AND type = 'Income' LIMIT 1;
  IF v_cat_rough_proc IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Rough Diamond Processing', 'Income', true)
    RETURNING id INTO v_cat_rough_proc;
  END IF;

  SELECT id INTO v_cat_laser_serv FROM public.categories WHERE name = 'Laser Services & Polishing' AND type = 'Income' LIMIT 1;
  IF v_cat_laser_serv IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Laser Services & Polishing', 'Income', true)
    RETURNING id INTO v_cat_laser_serv;
  END IF;

  SELECT id INTO v_cat_scrap FROM public.categories WHERE name = 'Scrap & Waste Recovery' AND type = 'Income' LIMIT 1;
  IF v_cat_scrap IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Scrap & Waste Recovery', 'Income', true)
    RETURNING id INTO v_cat_scrap;
  END IF;

  -- Expense Categories
  SELECT id INTO v_cat_emp_salary FROM public.categories WHERE name = 'Employee Salary' AND type = 'Expense' LIMIT 1;
  IF v_cat_emp_salary IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Employee Salary', 'Expense', true)
    RETURNING id INTO v_cat_emp_salary;
  END IF;

  SELECT id INTO v_cat_salary FROM public.categories WHERE name = 'Employee Salary & Commission' AND type = 'Expense' LIMIT 1;
  IF v_cat_salary IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Employee Salary & Commission', 'Expense', true)
    RETURNING id INTO v_cat_salary;
  END IF;

  SELECT id INTO v_cat_maintenance FROM public.categories WHERE name = 'Laser Machine Maintenance' AND type = 'Expense' LIMIT 1;
  IF v_cat_maintenance IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Laser Machine Maintenance', 'Expense', true)
    RETURNING id INTO v_cat_maintenance;
  END IF;

  SELECT id INTO v_cat_electricity FROM public.categories WHERE name = 'Factory Electricity & Power' AND type = 'Expense' LIMIT 1;
  IF v_cat_electricity IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Factory Electricity & Power', 'Expense', true)
    RETURNING id INTO v_cat_electricity;
  END IF;

  SELECT id INTO v_cat_rent FROM public.categories WHERE name = 'Factory Rent' AND type = 'Expense' LIMIT 1;
  IF v_cat_rent IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Factory Rent', 'Expense', true)
    RETURNING id INTO v_cat_rent;
  END IF;

  SELECT id INTO v_cat_office FROM public.categories WHERE name = 'Office Supplies & IT' AND type = 'Expense' LIMIT 1;
  IF v_cat_office IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Office Supplies & IT', 'Expense', true)
    RETURNING id INTO v_cat_office;
  END IF;

  SELECT id INTO v_cat_tea FROM public.categories WHERE name = 'Tea & Refreshments' AND type = 'Expense' LIMIT 1;
  IF v_cat_tea IS NULL THEN
    INSERT INTO public.categories (name, type, is_active)
    VALUES ('Tea & Refreshments', 'Expense', true)
    RETURNING id INTO v_cat_tea;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 3. PARTIES
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_pty_shree_ram FROM public.parties WHERE company_name = 'Shree Ram Gems & Diamonds' LIMIT 1;
  IF v_pty_shree_ram IS NULL THEN
    INSERT INTO public.parties (company_name, contact_person_name, mobile_number, price, is_active)
    VALUES ('Shree Ram Gems & Diamonds', 'Bhavesh Patel', '9825112345', 1500.00, true)
    RETURNING id INTO v_pty_shree_ram;
  END IF;

  SELECT id INTO v_pty_dharmanandan FROM public.parties WHERE company_name = 'Dharmanandan Exports Pvt Ltd' LIMIT 1;
  IF v_pty_dharmanandan IS NULL THEN
    INSERT INTO public.parties (company_name, contact_person_name, mobile_number, price, is_active)
    VALUES ('Dharmanandan Exports Pvt Ltd', 'Hitesh Dholakia', '9898223456', 1650.00, true)
    RETURNING id INTO v_pty_dharmanandan;
  END IF;

  SELECT id INTO v_pty_kiran FROM public.parties WHERE company_name = 'Kiran Gems International' LIMIT 1;
  IF v_pty_kiran IS NULL THEN
    INSERT INTO public.parties (company_name, contact_person_name, mobile_number, price, is_active)
    VALUES ('Kiran Gems International', 'Rajesh Lakhani', '9879334567', 1400.00, true)
    RETURNING id INTO v_pty_kiran;
  END IF;

  SELECT id INTO v_pty_hari_krishna FROM public.parties WHERE company_name = 'Hari Krishna Exports' LIMIT 1;
  IF v_pty_hari_krishna IS NULL THEN
    INSERT INTO public.parties (company_name, contact_person_name, mobile_number, price, is_active)
    VALUES ('Hari Krishna Exports', 'Savji Dholakia', '9824445678', 1800.00, true)
    RETURNING id INTO v_pty_hari_krishna;
  END IF;

  SELECT id INTO v_pty_venus FROM public.parties WHERE company_name = 'Venus Jewelers Surat' LIMIT 1;
  IF v_pty_venus IS NULL THEN
    INSERT INTO public.parties (company_name, contact_person_name, mobile_number, price, is_active)
    VALUES ('Venus Jewelers Surat', 'Jayesh Shah', '9898556789', 1550.00, true)
    RETURNING id INTO v_pty_venus;
  END IF;

  SELECT id INTO v_pty_laxmi FROM public.parties WHERE company_name = 'Laxmi Diamond Trading Co.' LIMIT 1;
  IF v_pty_laxmi IS NULL THEN
    INSERT INTO public.parties (company_name, contact_person_name, mobile_number, price, is_active)
    VALUES ('Laxmi Diamond Trading Co.', 'Naresh Sanghavi', '9879667890', 1450.00, true)
    RETURNING id INTO v_pty_laxmi;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 4. EMPLOYEES (Typed by Stage)
  -- ---------------------------------------------------------------------------
  -- Sarin Employees
  SELECT id INTO v_emp_ramesh FROM public.employees WHERE name = 'Ramesh Bhai Patel' LIMIT 1;
  IF v_emp_ramesh IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, employee_type, is_active)
    VALUES ('Ramesh Bhai Patel', '9712111111', 120.00, 'Sarin', true)
    RETURNING id INTO v_emp_ramesh;
  END IF;

  SELECT id INTO v_emp_ketan FROM public.employees WHERE name = 'Ketan Savani' LIMIT 1;
  IF v_emp_ketan IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, employee_type, is_active)
    VALUES ('Ketan Savani', '9712222222', 130.00, 'Sarin', true)
    RETURNING id INTO v_emp_ketan;
  END IF;

  SELECT id INTO v_emp_pravin FROM public.employees WHERE name = 'Pravin Gondaliya' LIMIT 1;
  IF v_emp_pravin IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, employee_type, is_active)
    VALUES ('Pravin Gondaliya', '9712333333', 125.00, 'Sarin', true)
    RETURNING id INTO v_emp_pravin;
  END IF;

  -- Dropping Employees
  SELECT id INTO v_emp_mahesh FROM public.employees WHERE name = 'Mahesh Vaghani' LIMIT 1;
  IF v_emp_mahesh IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, employee_type, is_active)
    VALUES ('Mahesh Vaghani', '9723111111', 80.00, 'Dropping', true)
    RETURNING id INTO v_emp_mahesh;
  END IF;

  SELECT id INTO v_emp_suresh FROM public.employees WHERE name = 'Suresh Balar' LIMIT 1;
  IF v_emp_suresh IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, employee_type, is_active)
    VALUES ('Suresh Balar', '9723222222', 85.00, 'Dropping', true)
    RETURNING id INTO v_emp_suresh;
  END IF;

  SELECT id INTO v_emp_dinesh FROM public.employees WHERE name = 'Dinesh Radadiya' LIMIT 1;
  IF v_emp_dinesh IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, employee_type, is_active)
    VALUES ('Dinesh Radadiya', '9723333333', 90.00, 'Dropping', true)
    RETURNING id INTO v_emp_dinesh;
  END IF;

  -- Galaxy Employees
  SELECT id INTO v_emp_alpesh FROM public.employees WHERE name = 'Alpesh Kakadiya' LIMIT 1;
  IF v_emp_alpesh IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, employee_type, is_active)
    VALUES ('Alpesh Kakadiya', '9734111111', 180.00, 'Galaxy', true)
    RETURNING id INTO v_emp_alpesh;
  END IF;

  SELECT id INTO v_emp_nilesh FROM public.employees WHERE name = 'Nilesh Chodvadiya' LIMIT 1;
  IF v_emp_nilesh IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, employee_type, is_active)
    VALUES ('Nilesh Chodvadiya', '9734222222', 190.00, 'Galaxy', true)
    RETURNING id INTO v_emp_nilesh;
  END IF;

  SELECT id INTO v_emp_chetan FROM public.employees WHERE name = 'Chetan Dhameliya' LIMIT 1;
  IF v_emp_chetan IS NULL THEN
    INSERT INTO public.employees (name, mobile_number, commission, employee_type, is_active)
    VALUES ('Chetan Dhameliya', '9734333333', 200.00, 'Galaxy', true)
    RETURNING id INTO v_emp_chetan;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 5. JOBS & SUB-JOBS (Sub-Job Stage Pipeline Architecture)
  -- ---------------------------------------------------------------------------
  PERFORM set_config('maruti.via_job_rpc', 'on', true);

  -- ---------------------------------------------------------------------------
  -- Job 1: 3 Sub-Jobs with Multi-Stage Pipeline (Sarin -> Dropping -> Galaxy) -> Completed
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_job_1 FROM public.job_works WHERE kapan_number = 'KAPAN-2026-A1' LIMIT 1;
  IF v_job_1 IS NULL THEN
    INSERT INTO public.job_works (
      lot_number, party_id, job_type,
      than, price, kapan_number, weight, status, billing_amount, created_at
    )
    VALUES (
      public.next_lot_number(), v_pty_shree_ram, 'Sarin',
      24.000, 1500.00, 'KAPAN-2026-A1', 4.850, 'Completed', 36000.00, CURRENT_TIMESTAMP - INTERVAL '15 days'
    )
    RETURNING id INTO v_job_1;

    -- Sub-Job 1A (Seq 1: 8 Than, Completed all 3 stages)
    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_1, 1, ARRAY['Sarin', 'Dropping', 'Galaxy'], 'Completed', 8.000, 1.600, 'Completed', CURRENT_TIMESTAMP - INTERVAL '15 days')
    RETURNING id INTO v_sub_1a;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_1a, 'Sarin', CURRENT_TIMESTAMP - INTERVAL '15 days', CURRENT_TIMESTAMP - INTERVAL '14 days'),
      (v_sub_1a, 'Dropping', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '13 days'),
      (v_sub_1a, 'Galaxy', CURRENT_TIMESTAMP - INTERVAL '13 days', CURRENT_TIMESTAMP - INTERVAL '12 days');

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_1a, v_emp_ramesh, 8.000, 120.00, 960.00, CURRENT_TIMESTAMP - INTERVAL '15 days');

    -- Sub-Job 1B (Seq 2: 8 Than, Completed all 3 stages)
    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_1, 2, ARRAY['Sarin', 'Dropping', 'Galaxy'], 'Completed', 8.000, 1.600, 'Completed', CURRENT_TIMESTAMP - INTERVAL '14 days')
    RETURNING id INTO v_sub_1b;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_1b, 'Sarin', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP - INTERVAL '13 days'),
      (v_sub_1b, 'Dropping', CURRENT_TIMESTAMP - INTERVAL '13 days', CURRENT_TIMESTAMP - INTERVAL '12 days'),
      (v_sub_1b, 'Galaxy', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '11 days');

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_1b, v_emp_mahesh, 8.000, 80.00, 640.00, CURRENT_TIMESTAMP - INTERVAL '13 days');

    -- Sub-Job 1C (Seq 3: 8 Than, Completed all 3 stages)
    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_1, 3, ARRAY['Sarin', 'Dropping', 'Galaxy'], 'Completed', 8.000, 1.650, 'Completed', CURRENT_TIMESTAMP - INTERVAL '13 days')
    RETURNING id INTO v_sub_1c;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_1c, 'Sarin', CURRENT_TIMESTAMP - INTERVAL '13 days', CURRENT_TIMESTAMP - INTERVAL '12 days'),
      (v_sub_1c, 'Dropping', CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '11 days'),
      (v_sub_1c, 'Galaxy', CURRENT_TIMESTAMP - INTERVAL '11 days', CURRENT_TIMESTAMP - INTERVAL '10 days');

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_1c, v_emp_alpesh, 8.000, 180.00, 1440.00, CURRENT_TIMESTAMP - INTERVAL '11 days');
  END IF;

  -- ---------------------------------------------------------------------------
  -- Job 2: 2 Sub-Jobs (Sarin -> Galaxy) -> Active at Galaxy stage
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_job_2 FROM public.job_works WHERE kapan_number = 'KAPAN-2026-B4' LIMIT 1;
  IF v_job_2 IS NULL THEN
    INSERT INTO public.job_works (
      lot_number, party_id, job_type,
      than, price, kapan_number, weight, status, billing_amount, created_at
    )
    VALUES (
      public.next_lot_number(), v_pty_dharmanandan, 'Sarin',
      18.000, 1650.00, 'KAPAN-2026-B4', 6.200, 'Progress', 29700.00, CURRENT_TIMESTAMP - INTERVAL '10 days'
    )
    RETURNING id INTO v_job_2;

    -- Sub-Job 2A (Seq 1: 10 Than, Completed)
    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_2, 1, ARRAY['Sarin', 'Galaxy'], 'Completed', 10.000, 3.400, 'Completed', CURRENT_TIMESTAMP - INTERVAL '10 days')
    RETURNING id INTO v_sub_2a;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_2a, 'Sarin', CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '8 days'),
      (v_sub_2a, 'Galaxy', CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '7 days');

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_2a, v_emp_ketan, 10.000, 130.00, 1300.00, CURRENT_TIMESTAMP - INTERVAL '10 days');

    -- Sub-Job 2B (Seq 2: 8 Than, In Progress at Galaxy)
    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_2, 2, ARRAY['Sarin', 'Galaxy'], 'Galaxy', 8.000, 2.800, 'Progress', CURRENT_TIMESTAMP - INTERVAL '9 days')
    RETURNING id INTO v_sub_2b;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_2b, 'Sarin', CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '6 days'),
      (v_sub_2b, 'Galaxy', CURRENT_TIMESTAMP - INTERVAL '6 days', NULL);

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_2b, v_emp_nilesh, 5.000, 190.00, 950.00, CURRENT_TIMESTAMP - INTERVAL '5 days');
  END IF;

  -- ---------------------------------------------------------------------------
  -- Job 3: 2 Sub-Jobs (Dropping -> Galaxy) -> Active at Dropping stage
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_job_3 FROM public.job_works WHERE kapan_number = 'KAPAN-2026-C9' LIMIT 1;
  IF v_job_3 IS NULL THEN
    INSERT INTO public.job_works (
      lot_number, party_id, job_type,
      than, price, kapan_number, weight, status, billing_amount, created_at
    )
    VALUES (
      public.next_lot_number(), v_pty_hari_krishna, 'Dropping',
      15.000, 1800.00, 'KAPAN-2026-C9', 3.450, 'Progress', 27000.00, CURRENT_TIMESTAMP - INTERVAL '7 days'
    )
    RETURNING id INTO v_job_3;

    -- Sub-Job 3A (Seq 1: 8 Than, Completed)
    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_3, 1, ARRAY['Dropping', 'Galaxy'], 'Completed', 8.000, 1.800, 'Completed', CURRENT_TIMESTAMP - INTERVAL '7 days')
    RETURNING id INTO v_sub_3a;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_3a, 'Dropping', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
      (v_sub_3a, 'Galaxy', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '4 days');

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_3a, v_emp_suresh, 8.000, 85.00, 680.00, CURRENT_TIMESTAMP - INTERVAL '7 days');

    -- Sub-Job 3B (Seq 2: 7 Than, In Progress at Dropping)
    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_3, 2, ARRAY['Dropping', 'Galaxy'], 'Dropping', 7.000, 1.650, 'Progress', CURRENT_TIMESTAMP - INTERVAL '6 days')
    RETURNING id INTO v_sub_3b;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_3b, 'Dropping', CURRENT_TIMESTAMP - INTERVAL '6 days', NULL);

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_3b, v_emp_dinesh, 4.000, 90.00, 360.00, CURRENT_TIMESTAMP - INTERVAL '4 days');
  END IF;

  -- ---------------------------------------------------------------------------
  -- Job 4: Single Stage Sub-Job (Sarin) -> Completed
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_job_4 FROM public.job_works WHERE kapan_number = 'KAPAN-2026-D2' LIMIT 1;
  IF v_job_4 IS NULL THEN
    INSERT INTO public.job_works (
      lot_number, party_id, job_type,
      than, price, kapan_number, weight, status, billing_amount, created_at
    )
    VALUES (
      public.next_lot_number(), v_pty_kiran, 'Sarin',
      12.000, 1400.00, 'KAPAN-2026-D2', 2.100, 'Completed', 16800.00, CURRENT_TIMESTAMP - INTERVAL '5 days'
    )
    RETURNING id INTO v_job_4;

    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_4, 1, ARRAY['Sarin'], 'Completed', 12.000, 2.100, 'Completed', CURRENT_TIMESTAMP - INTERVAL '5 days')
    RETURNING id INTO v_sub_4a;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_4a, 'Sarin', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '3 days');

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_4a, v_emp_pravin, 12.000, 125.00, 1500.00, CURRENT_TIMESTAMP - INTERVAL '5 days');
  END IF;

  -- ---------------------------------------------------------------------------
  -- Job 5: Single Stage Sub-Job (Galaxy) -> Pending
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_job_5 FROM public.job_works WHERE kapan_number = 'KAPAN-2026-E5' LIMIT 1;
  IF v_job_5 IS NULL THEN
    INSERT INTO public.job_works (
      lot_number, party_id, job_type,
      than, price, kapan_number, weight, status, billing_amount, created_at
    )
    VALUES (
      public.next_lot_number(), v_pty_venus, 'Galaxy',
      20.000, 1550.00, 'KAPAN-2026-E5', 5.750, 'Pending', 31000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'
    )
    RETURNING id INTO v_job_5;

    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_5, 1, ARRAY['Galaxy'], 'Galaxy', 10.000, 2.850, 'Pending', CURRENT_TIMESTAMP - INTERVAL '2 days')
    RETURNING id INTO v_sub_5a;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_5a, 'Galaxy', CURRENT_TIMESTAMP - INTERVAL '2 days', NULL);
  END IF;

  -- ---------------------------------------------------------------------------
  -- Job 6: 2 Sub-Jobs (Sarin -> Dropping -> Galaxy) -> Active at Sarin stage
  -- ---------------------------------------------------------------------------
  SELECT id INTO v_job_6 FROM public.job_works WHERE kapan_number = 'KAPAN-2026-F8' LIMIT 1;
  IF v_job_6 IS NULL THEN
    INSERT INTO public.job_works (
      lot_number, party_id, job_type,
      than, price, kapan_number, weight, status, billing_amount, created_at
    )
    VALUES (
      public.next_lot_number(), v_pty_laxmi, 'Sarin',
      30.000, 1450.00, 'KAPAN-2026-F8', 8.300, 'Progress', 43500.00, CURRENT_TIMESTAMP - INTERVAL '1 day'
    )
    RETURNING id INTO v_job_6;

    -- Sub-Job 6A (Seq 1: 15 Than, Completed all 3 stages)
    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_6, 1, ARRAY['Sarin', 'Dropping', 'Galaxy'], 'Completed', 15.000, 4.100, 'Completed', CURRENT_TIMESTAMP - INTERVAL '1 day')
    RETURNING id INTO v_sub_6a;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_6a, 'Sarin', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '20 hours'),
      (v_sub_6a, 'Dropping', CURRENT_TIMESTAMP - INTERVAL '20 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
      (v_sub_6a, 'Galaxy', CURRENT_TIMESTAMP - INTERVAL '12 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours');

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_6a, v_emp_ramesh, 15.000, 120.00, 1800.00, CURRENT_TIMESTAMP - INTERVAL '1 day');

    -- Sub-Job 6B (Seq 2: 15 Than, In Progress at Sarin)
    INSERT INTO public.sub_jobs (job_id, sequence_no, stages, current_stage, than, weight, status, created_at)
    VALUES (v_job_6, 2, ARRAY['Sarin', 'Dropping', 'Galaxy'], 'Sarin', 15.000, 4.200, 'Progress', CURRENT_TIMESTAMP - INTERVAL '1 day')
    RETURNING id INTO v_sub_6b;

    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at) VALUES
      (v_sub_6b, 'Sarin', CURRENT_TIMESTAMP - INTERVAL '1 day', NULL);

    INSERT INTO public.sub_job_employee_work (sub_job_id, employee_id, done_than, commission, earning, created_at)
    VALUES (v_sub_6b, v_emp_ketan, 10.000, 130.00, 1300.00, CURRENT_TIMESTAMP - INTERVAL '18 hours');
  END IF;

  -- ---------------------------------------------------------------------------
  -- 6. INVOICES
  -- ---------------------------------------------------------------------------
  PERFORM set_config('maruti.via_job_rpc', 'on', true);

  -- Invoice 1 for Job 1 (₹36,000)
  IF v_job_1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE job_work_id = v_job_1) THEN
    INSERT INTO public.invoices (
      invoice_number, job_work_id, invoice_date, amount, status
    )
    VALUES (
      public.next_invoice_number(), v_job_1, CURRENT_DATE - 14, 36000.00, 'Paid'
    )
    RETURNING id INTO v_inv_1;

    INSERT INTO public.invoice_jobs (invoice_id, job_work_id)
    VALUES (v_inv_1, v_job_1);
  ELSE
    SELECT id INTO v_inv_1 FROM public.invoices WHERE job_work_id = v_job_1;
  END IF;

  -- Invoice 2 for Job 2 (₹29,700)
  IF v_job_2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE job_work_id = v_job_2) THEN
    INSERT INTO public.invoices (
      invoice_number, job_work_id, invoice_date, amount, status
    )
    VALUES (
      public.next_invoice_number(), v_job_2, CURRENT_DATE - 9, 29700.00, 'Partially Paid'
    )
    RETURNING id INTO v_inv_2;

    INSERT INTO public.invoice_jobs (invoice_id, job_work_id)
    VALUES (v_inv_2, v_job_2);
  ELSE
    SELECT id INTO v_inv_2 FROM public.invoices WHERE job_work_id = v_job_2;
  END IF;

  -- Invoice 3 for Job 3 (₹27,000)
  IF v_job_3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE job_work_id = v_job_3) THEN
    INSERT INTO public.invoices (
      invoice_number, job_work_id, invoice_date, amount, status
    )
    VALUES (
      public.next_invoice_number(), v_job_3, CURRENT_DATE - 6, 27000.00, 'Unpaid'
    )
    RETURNING id INTO v_inv_3;

    INSERT INTO public.invoice_jobs (invoice_id, job_work_id)
    VALUES (v_inv_3, v_job_3);
  ELSE
    SELECT id INTO v_inv_3 FROM public.invoices WHERE job_work_id = v_job_3;
  END IF;

  -- Invoice 4 for Job 4 (₹16,800)
  IF v_job_4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE job_work_id = v_job_4) THEN
    INSERT INTO public.invoices (
      invoice_number, job_work_id, invoice_date, amount, status
    )
    VALUES (
      public.next_invoice_number(), v_job_4, CURRENT_DATE - 4, 16800.00, 'Paid'
    )
    RETURNING id INTO v_inv_4;

    INSERT INTO public.invoice_jobs (invoice_id, job_work_id)
    VALUES (v_inv_4, v_job_4);
  ELSE
    SELECT id INTO v_inv_4 FROM public.invoices WHERE job_work_id = v_job_4;
  END IF;

  -- Invoice 5 for Job 6 (₹43,500)
  IF v_job_6 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE job_work_id = v_job_6) THEN
    INSERT INTO public.invoices (
      invoice_number, job_work_id, invoice_date, amount, status
    )
    VALUES (
      public.next_invoice_number(), v_job_6, CURRENT_DATE - 1, 43500.00, 'Partially Paid'
    )
    RETURNING id INTO v_inv_5;

    INSERT INTO public.invoice_jobs (invoice_id, job_work_id)
    VALUES (v_inv_5, v_job_6);
  ELSE
    SELECT id INTO v_inv_5 FROM public.invoices WHERE job_work_id = v_job_6;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 7. TRANSACTIONS & ALLOCATIONS (Income & Expenses)
  -- ---------------------------------------------------------------------------
  -- Income 1: Payment for Invoice 1 (₹36,000 full payment from Shree Ram Gems into HDFC Bank)
  IF v_inv_1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.entry_invoice_allocations WHERE invoice_id = v_inv_1) THEN
    INSERT INTO public.entries (
      party_id, account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_pty_shree_ram, v_acc_hdfc, v_cat_party_pmt, 'Income', CURRENT_DATE - 12, 36000.00, 'Full payment for KAPAN-2026-A1'
    )
    RETURNING id INTO v_ent_pay_1;

    INSERT INTO public.entry_invoice_allocations (entry_id, invoice_id, amount)
    VALUES (v_ent_pay_1, v_inv_1, 36000.00);
  END IF;

  -- Income 2: Partial Payment for Invoice 2 (₹15,000 from Dharmanandan into ICICI Bank)
  IF v_inv_2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.entry_invoice_allocations WHERE invoice_id = v_inv_2) THEN
    INSERT INTO public.entries (
      party_id, account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_pty_dharmanandan, v_acc_icici, v_cat_party_pmt, 'Income', CURRENT_DATE - 7, 15000.00, 'Part payment for KAPAN-2026-B4'
    )
    RETURNING id INTO v_ent_pay_2;

    INSERT INTO public.entry_invoice_allocations (entry_id, invoice_id, amount)
    VALUES (v_ent_pay_2, v_inv_2, 15000.00);
  END IF;

  -- Income 3: Full Payment for Invoice 4 (₹16,800 from Kiran Gems into HDFC Bank)
  IF v_inv_4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.entry_invoice_allocations WHERE invoice_id = v_inv_4) THEN
    INSERT INTO public.entries (
      party_id, account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_pty_kiran, v_acc_hdfc, v_cat_party_pmt, 'Income', CURRENT_DATE - 3, 16800.00, 'NEFT payment for KAPAN-2026-D2'
    )
    RETURNING id INTO v_ent_pay_4;

    INSERT INTO public.entry_invoice_allocations (entry_id, invoice_id, amount)
    VALUES (v_ent_pay_4, v_inv_4, 16800.00);
  END IF;

  -- Income 4: Partial Payment for Invoice 5 (₹20,000 from Laxmi Diamond into SBI Bank)
  IF v_inv_5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.entry_invoice_allocations WHERE invoice_id = v_inv_5) THEN
    INSERT INTO public.entries (
      party_id, account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_pty_laxmi, v_acc_sbi, v_cat_party_pmt, 'Income', CURRENT_DATE, 20000.00, 'Cheque clearance advance'
    )
    RETURNING id INTO v_ent_pay_6;

    INSERT INTO public.entry_invoice_allocations (entry_id, invoice_id, amount)
    VALUES (v_ent_pay_6, v_inv_5, 20000.00);
  END IF;

  -- Expense 1: Salary / Commission Payout to Ramesh Bhai Patel (₹2,500 via Cash)
  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE employee_id = v_emp_ramesh AND remarks = 'Sarin work payout') THEN
    INSERT INTO public.entries (
      employee_id, account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_emp_ramesh, v_acc_cash, v_cat_emp_salary, 'Expense', CURRENT_DATE - 5, 2500.00, 'Sarin work payout'
    );
  END IF;

  -- Expense 2: Salary / Commission Payout to Ketan Savani (₹2,000 via HDFC)
  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE employee_id = v_emp_ketan AND remarks = 'Sarin work payout') THEN
    INSERT INTO public.entries (
      employee_id, account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_emp_ketan, v_acc_hdfc, v_cat_emp_salary, 'Expense', CURRENT_DATE - 5, 2000.00, 'Sarin work payout'
    );
  END IF;

  -- Expense 3: Salary / Commission Payout to Mahesh Vaghani (₹600 via Cash)
  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE employee_id = v_emp_mahesh AND remarks = 'Dropping work payout') THEN
    INSERT INTO public.entries (
      employee_id, account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_emp_mahesh, v_acc_cash, v_cat_emp_salary, 'Expense', CURRENT_DATE - 5, 600.00, 'Dropping work payout'
    );
  END IF;

  -- Expense 4: Salary / Commission Payout to Alpesh Kakadiya (₹1,400 via ICICI)
  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE employee_id = v_emp_alpesh AND remarks = 'Galaxy work payout') THEN
    INSERT INTO public.entries (
      employee_id, account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_emp_alpesh, v_acc_icici, v_cat_emp_salary, 'Expense', CURRENT_DATE - 5, 1400.00, 'Galaxy work payout'
    );
  END IF;

  -- Expense 5: Salary / Commission Payout to Pravin Gondaliya (₹1,500 via HDFC)
  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE employee_id = v_emp_pravin AND remarks = 'Sarin work payout') THEN
    INSERT INTO public.entries (
      employee_id, account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_emp_pravin, v_acc_hdfc, v_cat_emp_salary, 'Expense', CURRENT_DATE - 2, 1500.00, 'Sarin work payout'
    );
  END IF;

  -- Operating Expenses
  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE remarks = 'Monthly factory unit rent') THEN
    INSERT INTO public.entries (
      account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_acc_hdfc, v_cat_rent, 'Expense', CURRENT_DATE - 15, 45000.00, 'Monthly factory unit rent'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE remarks = 'Surat Electricity Board commercial bill') THEN
    INSERT INTO public.entries (
      account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_acc_icici, v_cat_electricity, 'Expense', CURRENT_DATE - 10, 18500.00, 'Surat Electricity Board commercial bill'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE remarks = 'Laser optic replacement & mirror alignment') THEN
    INSERT INTO public.entries (
      account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_acc_hdfc, v_cat_maintenance, 'Expense', CURRENT_DATE - 8, 12000.00, 'Laser optic replacement & mirror alignment'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE remarks = 'Galaxy analysis software license') THEN
    INSERT INTO public.entries (
      account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_acc_icici, v_cat_office, 'Expense', CURRENT_DATE - 6, 8500.00, 'Galaxy analysis software license'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.entries WHERE remarks = 'Worker tea & pantry expenses') THEN
    INSERT INTO public.entries (
      account_id, category_id, entry_type, entry_date, amount, remarks
    )
    VALUES (
      v_acc_cash, v_cat_tea, 'Expense', CURRENT_DATE - 3, 3200.00, 'Worker tea & pantry expenses'
    );
  END IF;

  RAISE NOTICE 'Maruti Galaxy seed data successfully generated.';
END
$$;
