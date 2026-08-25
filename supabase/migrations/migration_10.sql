-- =============================================================================
-- Migration 10: Stage-Wise Sub Job Allocation & Auto-Stage Enforcement
-- Enforces that subjob stage is automatically determined by the job's active
-- stage and that Than validation applies stage-wise without cross-stage mixing.
-- Also updates update_job_with_invoice_recalc to calculate Than limits stage-wise.
-- =============================================================================

-- 1. Update create_sub_job RPC to auto-derive stage from parent job's current_stage
-- and perform stage-wise Than validation.
CREATE OR REPLACE FUNCTION public.create_sub_job(
  p_job_id uuid,
  p_than numeric,
  p_weight numeric,
  p_status public.job_status DEFAULT 'Pending',
  p_stage text DEFAULT NULL
)
RETURNS public.sub_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job public.job_works%ROWTYPE;
  v_used numeric(14, 3);
  v_next integer;
  v_row public.sub_jobs;
  v_stage text;
BEGIN
  IF p_job_id IS NULL OR p_than IS NULL OR p_weight IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  IF p_than <= 0 OR p_weight < 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job
  FROM public.job_works
  WHERE job_works.id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Stage is strictly determined by the job's current_stage
  v_stage := COALESCE(v_job.current_stage, 'Sarin');
  IF v_stage = 'Completed' THEN
    IF v_job.stages IS NOT NULL AND array_length(v_job.stages, 1) > 0 THEN
      v_stage := v_job.stages[array_length(v_job.stages, 1)];
    ELSE
      v_stage := 'Galaxy';
    END IF;
  END IF;

  -- Stage-wise Than validation: only sum subjobs belonging to this specific stage
  SELECT COALESCE(SUM(sub_jobs.than), 0) INTO v_used
  FROM public.sub_jobs
  WHERE sub_jobs.job_id = p_job_id
    AND sub_jobs.stage = v_stage;

  IF v_used + p_than > v_job.than THEN
    RAISE EXCEPTION 'THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(MAX(sub_jobs.sequence_no), 0) + 1 INTO v_next
  FROM public.sub_jobs
  WHERE sub_jobs.job_id = p_job_id;

  INSERT INTO public.sub_jobs (job_id, sequence_no, than, weight, status, stage)
  VALUES (p_job_id, v_next, p_than, p_weight, COALESCE(p_status, 'Pending'), v_stage)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 2. Update update_sub_job RPC to perform stage-wise Than validation.
CREATE OR REPLACE FUNCTION public.update_sub_job(
  p_sub_job_id uuid,
  p_than numeric,
  p_weight numeric DEFAULT NULL,
  p_status public.job_status DEFAULT NULL
)
RETURNS public.sub_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sub public.sub_jobs%ROWTYPE;
  v_job public.job_works%ROWTYPE;
  v_done numeric(14, 3);
  v_used_other numeric(14, 3);
  v_row public.sub_jobs;
BEGIN
  IF p_sub_job_id IS NULL OR p_than IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  IF p_than <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  IF p_weight IS NOT NULL AND p_weight < 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_sub
  FROM public.sub_jobs
  WHERE sub_jobs.id = p_sub_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUB_JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_job
  FROM public.job_works
  WHERE job_works.id = v_sub.job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(SUM(sub_job_employee_work.done_than), 0) INTO v_done
  FROM public.sub_job_employee_work
  WHERE sub_job_employee_work.sub_job_id = p_sub_job_id;

  IF p_than < v_done THEN
    RAISE EXCEPTION 'THAN_BELOW_WORK' USING ERRCODE = 'P0001';
  END IF;

  -- Stage-wise Than validation: only sum other subjobs in the same stage
  SELECT COALESCE(SUM(sub_jobs.than), 0) INTO v_used_other
  FROM public.sub_jobs
  WHERE sub_jobs.job_id = v_sub.job_id
    AND sub_jobs.stage = v_sub.stage
    AND sub_jobs.id <> p_sub_job_id;

  IF v_used_other + p_than > v_job.than THEN
    RAISE EXCEPTION 'THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.sub_jobs
  SET
    than = p_than,
    weight = COALESCE(p_weight, sub_jobs.weight),
    status = COALESCE(p_status, sub_jobs.status)
  WHERE sub_jobs.id = p_sub_job_id
  RETURNING * INTO v_row;

  PERFORM public.apply_quantity_status(p_sub_job_id);
  SELECT * INTO v_row FROM public.sub_jobs WHERE sub_jobs.id = p_sub_job_id;
  RETURN v_row;
END;
$$;

-- 3. Update update_job_with_invoice_recalc RPC to perform stage-wise Than validation
-- and update stages/current_stage.
DROP FUNCTION IF EXISTS public.update_job_with_invoice_recalc(uuid, numeric, numeric, text, numeric, public.job_status, public.job_type);
DROP FUNCTION IF EXISTS public.update_job_with_invoice_recalc(uuid, numeric, numeric, text, numeric, public.job_status, public.job_type, text[], text);

CREATE OR REPLACE FUNCTION public.update_job_with_invoice_recalc(
  p_job_id uuid,
  p_than numeric,
  p_price numeric,
  p_kapan_number text DEFAULT NULL,
  p_weight numeric DEFAULT NULL,
  p_status public.job_status DEFAULT NULL,
  p_job_type public.job_type DEFAULT NULL,
  p_stages text[] DEFAULT NULL,
  p_current_stage text DEFAULT NULL
)
RETURNS TABLE (
  job_id uuid,
  lot_number text,
  invoice_id uuid,
  invoice_number text,
  amount numeric,
  status public.invoice_status
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job public.job_works%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_sub_than numeric(14, 3);
  v_allocated numeric(14, 2);
  v_new_amount numeric(14, 2);
  v_stages text[];
  v_current_stage text;
BEGIN
  IF p_job_id IS NULL OR p_than IS NULL OR p_price IS NULL OR p_than <= 0 OR p_price < 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job FROM public.job_works WHERE job_works.id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Stage-wise subjob Than check: ensure Job Than is not less than the highest allocated stage
  SELECT COALESCE(MAX(stage_sum), 0) INTO v_sub_than 
  FROM (
    SELECT SUM(sub_jobs.than) AS stage_sum 
    FROM public.sub_jobs 
    WHERE sub_jobs.job_id = p_job_id 
    GROUP BY sub_jobs.stage
  ) s;

  IF p_than < v_sub_than THEN
    RAISE EXCEPTION 'THAN_BELOW_SUB_JOBS' USING ERRCODE = 'P0001';
  END IF;

  IF (p_weight IS NOT NULL AND p_weight < 0) OR (p_kapan_number IS NOT NULL AND length(btrim(p_kapan_number)) = 0) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  v_stages := COALESCE(p_stages, v_job.stages);
  v_current_stage := COALESCE(p_current_stage, v_job.current_stage);

  v_new_amount := COALESCE(v_job.billing_amount, round(p_than * p_price, 2));
  SELECT * INTO v_invoice FROM public.invoices WHERE invoices.job_work_id = p_job_id FOR UPDATE;
  IF FOUND THEN
    SELECT COALESCE(SUM(entry_invoice_allocations.amount), 0) INTO v_allocated FROM public.entry_invoice_allocations WHERE entry_invoice_allocations.invoice_id = v_invoice.id;
    IF v_new_amount < v_allocated THEN
      RAISE EXCEPTION 'AMOUNT_BELOW_ALLOCATIONS' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.job_works
  SET
    than = p_than,
    price = p_price,
    kapan_number = COALESCE(btrim(p_kapan_number), job_works.kapan_number),
    weight = COALESCE(p_weight, job_works.weight),
    status = COALESCE(p_status, job_works.status),
    job_type = COALESCE(p_job_type, job_works.job_type),
    stages = COALESCE(v_stages, job_works.stages),
    current_stage = COALESCE(v_current_stage, job_works.current_stage)
  WHERE job_works.id = p_job_id
  RETURNING * INTO v_job;

  IF v_invoice.id IS NOT NULL THEN
    UPDATE public.invoices SET amount = v_new_amount WHERE invoices.id = v_invoice.id RETURNING * INTO v_invoice;
    PERFORM public.set_invoice_status_from_allocations(v_invoice.id);
    SELECT * INTO v_invoice FROM public.invoices WHERE invoices.id = v_invoice.id;
  END IF;

  job_id := v_job.id;
  lot_number := v_job.lot_number;
  invoice_id := v_invoice.id;
  invoice_number := v_invoice.invoice_number;
  amount := v_invoice.amount;
  status := v_invoice.status;
  RETURN NEXT;
END;
$$;

-- 4. Update apply_quantity_status: automatically transitions to the next stage when
-- the current stage finishes all Than, only marking Completed when the final stage finishes.
CREATE OR REPLACE FUNCTION public.apply_quantity_status(
  p_sub_job_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sub public.sub_jobs%ROWTYPE;
  v_job public.job_works%ROWTYPE;
  v_done numeric(14, 3);
  v_sub_status public.job_status;
  v_stages text[];
  v_curr_stage text;
  v_stage_done numeric(14, 3);
  v_curr_idx integer;
  v_next_stage text;
  v_new_status public.job_status;
  v_total_job_done numeric(14, 3);
BEGIN
  SELECT * INTO v_sub
  FROM public.sub_jobs
  WHERE sub_jobs.id = p_sub_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_job
  FROM public.job_works
  WHERE job_works.id = v_sub.job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Update status of the modified subjob
  SELECT COALESCE(SUM(sub_job_employee_work.done_than), 0) INTO v_done
  FROM public.sub_job_employee_work
  WHERE sub_job_employee_work.sub_job_id = p_sub_job_id;

  v_sub_status := v_sub.status;
  IF v_done >= v_sub.than THEN
    v_sub_status := 'Completed';
  ELSIF v_done > 0 THEN
    v_sub_status := 'Progress';
  ELSE
    v_sub_status := 'Pending';
  END IF;

  UPDATE public.sub_jobs
  SET status = v_sub_status
  WHERE sub_jobs.id = p_sub_job_id;

  -- 2. Stage transition logic for the parent job
  v_stages := v_job.stages;
  IF v_stages IS NULL OR array_length(v_stages, 1) IS NULL OR array_length(v_stages, 1) = 0 THEN
    v_stages := ARRAY['Sarin']::text[];
  END IF;

  v_curr_stage := COALESCE(v_job.current_stage, v_stages[1]);

  -- Check done than for the current stage of the job
  SELECT COALESCE(SUM(sub_job_employee_work.done_than), 0) INTO v_stage_done
  FROM public.sub_job_employee_work
  JOIN public.sub_jobs ON sub_jobs.id = sub_job_employee_work.sub_job_id
  WHERE sub_jobs.job_id = v_job.id
    AND sub_jobs.stage = v_curr_stage;

  -- Total done than across all subjobs of the job
  SELECT COALESCE(SUM(sub_job_employee_work.done_than), 0) INTO v_total_job_done
  FROM public.sub_job_employee_work
  JOIN public.sub_jobs ON sub_jobs.id = sub_job_employee_work.sub_job_id
  WHERE sub_jobs.job_id = v_job.id;

  -- Find index of v_curr_stage in v_stages
  v_curr_idx := 0;
  FOR i IN 1..array_length(v_stages, 1) LOOP
    IF v_stages[i] = v_curr_stage THEN
      v_curr_idx := i;
      EXIT;
    END IF;
  END LOOP;

  -- Has the current stage finished all required Than?
  IF v_stage_done >= v_job.than THEN
    -- Current stage is completed!
    IF v_curr_idx > 0 AND v_curr_idx < array_length(v_stages, 1) THEN
      -- Automatically move to next stage; job status is in Progress
      v_next_stage := v_stages[v_curr_idx + 1];
      v_new_status := 'Progress';
    ELSE
      -- Final stage completed -> Entire job is Completed!
      v_next_stage := 'Completed';
      v_new_status := 'Completed';
    END IF;
  ELSE
    -- Current stage is still in progress or pending
    v_next_stage := v_curr_stage;
    IF v_total_job_done > 0 THEN
      v_new_status := 'Progress';
    ELSE
      v_new_status := 'Pending';
    END IF;
  END IF;

  UPDATE public.job_works
  SET
    current_stage = v_next_stage,
    status = v_new_status
  WHERE job_works.id = v_job.id;
END;
$$;

-- 5. Update advance_job_stage RPC
CREATE OR REPLACE FUNCTION public.advance_job_stage(
  p_job_id uuid
)
RETURNS TABLE (job_id uuid, current_stage text, status public.job_status)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job public.job_works%ROWTYPE;
  v_stages text[];
  v_idx integer;
  v_next_stage text;
  v_new_status public.job_status;
BEGIN
  SELECT * INTO v_job
  FROM public.job_works
  WHERE job_works.id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_stages := v_job.stages;
  IF v_stages IS NULL OR array_length(v_stages, 1) IS NULL OR array_length(v_stages, 1) = 0 THEN
    v_stages := ARRAY['Sarin']::text[];
  END IF;

  -- Find current index in stages array
  v_idx := 0;
  FOR i IN 1..array_length(v_stages, 1) LOOP
    IF v_stages[i] = v_job.current_stage THEN
      v_idx := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_idx = 0 OR v_idx >= array_length(v_stages, 1) THEN
    -- Final stage reached -> Job is Completed
    v_next_stage := 'Completed';
    v_new_status := 'Completed';
  ELSE
    v_next_stage := v_stages[v_idx + 1];
    v_new_status := 'Progress';
  END IF;

  UPDATE public.job_works
  SET current_stage = v_next_stage,
      status = v_new_status
  WHERE job_works.id = p_job_id
  RETURNING * INTO v_job;

  job_id := v_job.id;
  current_stage := v_job.current_stage;
  status := v_job.status;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_sub_job(uuid, numeric, numeric, public.job_status, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_sub_job(uuid, numeric, numeric, public.job_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_job_with_invoice_recalc(uuid, numeric, numeric, text, numeric, public.job_status, public.job_type, text[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_quantity_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.advance_job_stage(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_sub_job(uuid, numeric, numeric, public.job_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sub_job(uuid, numeric, numeric, public.job_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_job_with_invoice_recalc(uuid, numeric, numeric, text, numeric, public.job_status, public.job_type, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_quantity_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_job_stage(uuid) TO authenticated;

