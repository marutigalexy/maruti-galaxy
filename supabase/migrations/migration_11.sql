-- =============================================================================
-- Migration 11: Move Stage Pipeline from Parent Jobs to Sub-Jobs
--
-- 1. Sub-Job owns: pipeline (stages text[]), current_stage (text), status
-- 2. Stage progression operates per Sub-Job (advance_sub_job_stage)
-- 3. Stage history is preserved in sub_job_stage_history
-- 4. Employee work is recorded against the sub-job's active stage
-- 5. Done Than validation is evaluated per sub-job and per stage
-- 6. Parent job status is dynamically derived from all its sub-jobs
-- 7. Obsolete stages and current_stage columns removed from job_works
-- =============================================================================

-- 1. Add stages array and current_stage to sub_jobs
ALTER TABLE public.sub_jobs
  ADD COLUMN IF NOT EXISTS stages text[] NOT NULL DEFAULT ARRAY['Sarin']::text[],
  ADD COLUMN IF NOT EXISTS current_stage text NOT NULL DEFAULT 'Sarin';

-- Backfill sub_jobs.stages and sub_jobs.current_stage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'job_works' AND column_name = 'stages'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'job_works' AND column_name = 'current_stage'
  ) THEN
    EXECUTE $sql$
      UPDATE public.sub_jobs sj
      SET
        stages = COALESCE(jw.stages, ARRAY[sj.stage]::text[], ARRAY['Sarin']::text[]),
        current_stage = COALESCE(sj.stage, jw.current_stage, 'Sarin')
      FROM public.job_works jw
      WHERE jw.id = sj.job_id;
    $sql$;
  ELSE
    UPDATE public.sub_jobs
    SET
      stages = ARRAY[COALESCE(stage, 'Sarin')]::text[],
      current_stage = COALESCE(stage, 'Sarin')
    WHERE stages IS NULL OR current_stage IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS sub_jobs_current_stage_idx ON public.sub_jobs (current_stage);

-- 2. Add stage to sub_job_employee_work
ALTER TABLE public.sub_job_employee_work
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'Sarin';

UPDATE public.sub_job_employee_work w
SET stage = COALESCE(e.employee_type::text, sj.current_stage, 'Sarin')
FROM public.employees e, public.sub_jobs sj
WHERE e.id = w.employee_id AND sj.id = w.sub_job_id;

CREATE INDEX IF NOT EXISTS sub_job_employee_work_stage_idx ON public.sub_job_employee_work (stage);

-- 3. Create sub_job_stage_history table
CREATE TABLE IF NOT EXISTS public.sub_job_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_job_id uuid NOT NULL REFERENCES public.sub_jobs (id) ON DELETE CASCADE,
  stage text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sub_job_stage_history_sub_job_id_idx ON public.sub_job_stage_history (sub_job_id);
CREATE INDEX IF NOT EXISTS sub_job_stage_history_started_at_idx ON public.sub_job_stage_history (started_at);

ALTER TABLE public.sub_job_stage_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY sub_job_stage_history_admin_all
    ON public.sub_job_stage_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Backfill initial stage history for existing sub-jobs
INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at, completed_at, created_at)
SELECT
  sj.id,
  sj.current_stage,
  sj.created_at,
  CASE WHEN sj.status = 'Completed' THEN sj.updated_at ELSE NULL END,
  sj.created_at
FROM public.sub_jobs sj
WHERE NOT EXISTS (
  SELECT 1 FROM public.sub_job_stage_history h WHERE h.sub_job_id = sj.id
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_job_stage_history TO authenticated;

-- 4. Update View: v_sub_jobs_display
DROP VIEW IF EXISTS public.v_sub_jobs_display CASCADE;

CREATE VIEW public.v_sub_jobs_display
WITH (security_invoker = true)
AS
SELECT
  sj.id,
  sj.job_id,
  jw.lot_number,
  sj.sequence_no,
  jw.lot_number || '-' || public.sequence_to_alpha(sj.sequence_no) AS display_no,
  sj.than,
  sj.weight,
  sj.status,
  sj.stages,
  sj.current_stage,
  sj.current_stage AS stage,
  sj.created_at,
  sj.updated_at
FROM public.sub_jobs sj
JOIN public.job_works jw ON jw.id = sj.job_id;

GRANT SELECT ON public.v_sub_jobs_display TO authenticated;
GRANT SELECT ON public.v_sub_jobs_display TO anon;

-- 5. Drop obsolete columns from job_works
DROP INDEX IF EXISTS public.job_works_current_stage_idx;
ALTER TABLE public.job_works DROP COLUMN IF EXISTS stages;
ALTER TABLE public.job_works DROP COLUMN IF EXISTS current_stage;

-- 6. RPC: create_job (no stage parameters)
-- 6. RPC: create_job (with billing_amount, no stage parameters)
DROP FUNCTION IF EXISTS public.create_job(uuid, public.job_type, numeric, numeric, text, numeric, public.job_status, text[]);
DROP FUNCTION IF EXISTS public.create_job(uuid, public.job_type, numeric, numeric, text, numeric, public.job_status);
DROP FUNCTION IF EXISTS public.create_job(uuid, public.job_type, numeric, numeric, text, numeric, public.job_status, numeric);

CREATE OR REPLACE FUNCTION public.create_job(
  p_party_id uuid,
  p_job_type public.job_type,
  p_than numeric,
  p_price numeric,
  p_kapan_number text,
  p_weight numeric,
  p_status public.job_status DEFAULT 'Pending',
  p_billing_amount numeric DEFAULT NULL
)
RETURNS TABLE (job_id uuid, lot_number text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job public.job_works%ROWTYPE;
  v_party_active boolean;
BEGIN
  IF p_party_id IS NULL OR p_than IS NULL OR p_price IS NULL
     OR p_kapan_number IS NULL OR p_weight IS NULL OR p_than <= 0 OR p_price < 0
     OR p_weight < 0 OR length(btrim(p_kapan_number)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  IF p_billing_amount IS NOT NULL AND p_billing_amount < 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT is_active INTO v_party_active FROM public.parties WHERE id = p_party_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_party_active IS NOT TRUE THEN RAISE EXCEPTION 'PARTY_INACTIVE' USING ERRCODE = 'P0001'; END IF;

  PERFORM set_config('maruti.via_job_rpc', 'on', true);
  INSERT INTO public.job_works (
    lot_number, party_id, job_type, than, price, kapan_number, weight, status, billing_amount
  )
  VALUES (
    public.next_lot_number(),
    p_party_id,
    COALESCE(p_job_type, 'Sarin'::public.job_type),
    p_than,
    p_price,
    btrim(p_kapan_number),
    p_weight,
    COALESCE(p_status, 'Pending'),
    COALESCE(p_billing_amount, round(p_than * p_price, 2))
  )
  RETURNING * INTO v_job;

  job_id := v_job.id;
  lot_number := v_job.lot_number;
  RETURN NEXT;
END;
$$;

-- 7. RPC: update_job_with_invoice_recalc (with billing_amount, no stage parameters)
DROP FUNCTION IF EXISTS public.update_job_with_invoice_recalc(uuid, numeric, numeric, text, numeric, public.job_status, public.job_type, text[], text);
DROP FUNCTION IF EXISTS public.update_job_with_invoice_recalc(uuid, numeric, numeric, text, numeric, public.job_status, public.job_type);
DROP FUNCTION IF EXISTS public.update_job_with_invoice_recalc(uuid, numeric, numeric, text, numeric, public.job_status, public.job_type, numeric);

CREATE OR REPLACE FUNCTION public.update_job_with_invoice_recalc(
  p_job_id uuid,
  p_than numeric,
  p_price numeric,
  p_kapan_number text DEFAULT NULL,
  p_weight numeric DEFAULT NULL,
  p_status public.job_status DEFAULT NULL,
  p_job_type public.job_type DEFAULT NULL,
  p_billing_amount numeric DEFAULT NULL
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
BEGIN
  IF p_job_id IS NULL OR p_than IS NULL OR p_price IS NULL OR p_than <= 0 OR p_price < 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  IF p_billing_amount IS NOT NULL AND p_billing_amount < 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job FROM public.job_works WHERE job_works.id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Ensure Job Than is not less than total allocated Sub-Jobs Than
  SELECT COALESCE(SUM(sub_jobs.than), 0) INTO v_sub_than 
  FROM public.sub_jobs 
  WHERE sub_jobs.job_id = p_job_id;

  IF p_than < v_sub_than THEN
    RAISE EXCEPTION 'THAN_BELOW_SUB_JOBS' USING ERRCODE = 'P0001';
  END IF;

  IF (p_weight IS NOT NULL AND p_weight < 0) OR (p_kapan_number IS NOT NULL AND length(btrim(p_kapan_number)) = 0) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  v_new_amount := COALESCE(p_billing_amount, round(p_than * p_price, 2));
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
    billing_amount = COALESCE(p_billing_amount, round(p_than * p_price, 2))
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

-- 8. RPC: apply_quantity_status (calculates sub-job stage progress, auto-advances pipeline, and derives parent job status)
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
  v_stages text[];
  v_stg text;
  v_stage_done numeric(14, 3);
  v_total_sub_done numeric(14, 3);
  v_new_stage text;
  v_sub_status public.job_status;
  v_sub_count integer;
  v_comp_count integer;
  v_pend_count integer;
  v_allocated_than numeric(14, 3);
  v_job_status public.job_status;
  v_all_completed boolean;
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

  v_stages := v_sub.stages;
  IF v_stages IS NULL OR array_length(v_stages, 1) IS NULL OR array_length(v_stages, 1) = 0 THEN
    v_stages := ARRAY['Sarin']::text[];
  END IF;

  -- 1. Determine active current stage by checking pipeline stages sequentially
  v_new_stage := NULL;
  v_all_completed := true;

  FOR i IN 1..array_length(v_stages, 1) LOOP
    v_stg := v_stages[i];

    SELECT COALESCE(SUM(done_than), 0) INTO v_stage_done
    FROM public.sub_job_employee_work
    WHERE sub_job_id = p_sub_job_id
      AND stage = v_stg;

    IF v_stage_done >= v_sub.than THEN
      -- Mark stage history as completed if open
      UPDATE public.sub_job_stage_history
      SET completed_at = COALESCE(completed_at, now())
      WHERE sub_job_id = p_sub_job_id AND stage = v_stg AND completed_at IS NULL;
    ELSE
      -- This is the first stage in pipeline that is not completed
      v_all_completed := false;
      v_new_stage := v_stg;
      EXIT;
    END IF;
  END LOOP;

  IF v_all_completed THEN
    v_new_stage := 'Completed';
    v_sub_status := 'Completed';
  ELSE
    -- Ensure stage history exists for the active stage
    IF NOT EXISTS (
      SELECT 1 FROM public.sub_job_stage_history
      WHERE sub_job_id = p_sub_job_id AND stage = v_new_stage AND completed_at IS NULL
    ) THEN
      INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at)
      VALUES (p_sub_job_id, v_new_stage, now());
    END IF;

    -- Total work done across all stages
    SELECT COALESCE(SUM(done_than), 0) INTO v_total_sub_done
    FROM public.sub_job_employee_work
    WHERE sub_job_id = p_sub_job_id;

    IF v_total_sub_done > 0 THEN
      v_sub_status := 'Progress';
    ELSE
      v_sub_status := 'Pending';
    END IF;
  END IF;

  -- Update sub-job stage and status
  UPDATE public.sub_jobs
  SET
    current_stage = v_new_stage,
    stage = v_new_stage,
    status = v_sub_status
  WHERE id = p_sub_job_id;

  -- 2. Derive Parent Job status from all its sub-jobs and remaining lot quantity
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'Completed'),
    COUNT(*) FILTER (WHERE status = 'Pending'),
    COALESCE(SUM(than), 0)
  INTO
    v_sub_count,
    v_comp_count,
    v_pend_count,
    v_allocated_than
  FROM public.sub_jobs
  WHERE job_id = v_job.id;

  IF v_sub_count = 0 THEN
    v_job_status := 'Pending';
  ELSIF v_comp_count = v_sub_count AND v_allocated_than >= v_job.than THEN
    v_job_status := 'Completed';
  ELSIF v_pend_count = v_sub_count AND v_total_sub_done = 0 THEN
    v_job_status := 'Pending';
  ELSE
    v_job_status := 'Progress';
  END IF;

  UPDATE public.job_works
  SET status = v_job_status
  WHERE job_works.id = v_job.id;
END;
$$;

-- 9. RPC: create_sub_job (with stages array and pipeline initialization)
DROP FUNCTION IF EXISTS public.create_sub_job(uuid, numeric, numeric, public.job_status, text);
DROP FUNCTION IF EXISTS public.create_sub_job(uuid, numeric, numeric, public.job_status, text[]);
DROP FUNCTION IF EXISTS public.create_sub_job(uuid, numeric, numeric, public.job_status, text[], text);

CREATE OR REPLACE FUNCTION public.create_sub_job(
  p_job_id uuid,
  p_than numeric,
  p_weight numeric,
  p_status public.job_status DEFAULT 'Pending',
  p_stages text[] DEFAULT ARRAY['Sarin']::text[],
  p_current_stage text DEFAULT NULL
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
  v_stages text[];
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

  -- Normalize stages
  IF p_stages IS NULL OR array_length(p_stages, 1) IS NULL OR array_length(p_stages, 1) = 0 THEN
    v_stages := ARRAY['Sarin']::text[];
  ELSE
    v_stages := p_stages;
  END IF;

  v_stage := COALESCE(p_current_stage, v_stages[1]);

  -- Sub-job Than validation against total Job Than
  SELECT COALESCE(SUM(sub_jobs.than), 0) INTO v_used
  FROM public.sub_jobs
  WHERE sub_jobs.job_id = p_job_id;

  IF v_used + p_than > v_job.than THEN
    RAISE EXCEPTION 'THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(MAX(sub_jobs.sequence_no), 0) + 1 INTO v_next
  FROM public.sub_jobs
  WHERE sub_jobs.job_id = p_job_id;

  INSERT INTO public.sub_jobs (job_id, sequence_no, than, weight, status, stages, current_stage, stage)
  VALUES (p_job_id, v_next, p_than, p_weight, COALESCE(p_status, 'Pending'), v_stages, v_stage, v_stage)
  RETURNING * INTO v_row;

  -- Record initial stage history
  INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at)
  VALUES (v_row.id, v_stage, now());

  -- Recalculate parent job status
  PERFORM public.apply_quantity_status(v_row.id);
  SELECT * INTO v_row FROM public.sub_jobs WHERE sub_jobs.id = v_row.id;

  RETURN v_row;
END;
$$;

-- 10. RPC: update_sub_job
DROP FUNCTION IF EXISTS public.update_sub_job(uuid, numeric, numeric, public.job_status);
DROP FUNCTION IF EXISTS public.update_sub_job(uuid, numeric, numeric, public.job_status, text[], text);

CREATE OR REPLACE FUNCTION public.update_sub_job(
  p_sub_job_id uuid,
  p_than numeric,
  p_weight numeric DEFAULT NULL,
  p_status public.job_status DEFAULT NULL,
  p_stages text[] DEFAULT NULL,
  p_current_stage text DEFAULT NULL
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
  v_stages text[];
  v_stage text;
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

  -- Check that new Than is not lower than Done Than recorded for any single stage of this sub-job
  SELECT COALESCE(MAX(stage_done), 0) INTO v_done
  FROM (
    SELECT SUM(sub_job_employee_work.done_than) AS stage_done
    FROM public.sub_job_employee_work
    WHERE sub_job_employee_work.sub_job_id = p_sub_job_id
    GROUP BY sub_job_employee_work.stage
  ) s;

  IF p_than < v_done THEN
    RAISE EXCEPTION 'THAN_BELOW_WORK' USING ERRCODE = 'P0001';
  END IF;

  -- Check against other subjobs in the job
  SELECT COALESCE(SUM(sub_jobs.than), 0) INTO v_used_other
  FROM public.sub_jobs
  WHERE sub_jobs.job_id = v_sub.job_id
    AND sub_jobs.id <> p_sub_job_id;

  IF v_used_other + p_than > v_job.than THEN
    RAISE EXCEPTION 'THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  v_stages := COALESCE(p_stages, v_sub.stages);
  v_stage := COALESCE(p_current_stage, v_sub.current_stage);

  -- If current_stage changed, manage stage history
  IF v_stage <> v_sub.current_stage THEN
    UPDATE public.sub_job_stage_history
    SET completed_at = now()
    WHERE sub_job_id = p_sub_job_id AND stage = v_sub.current_stage AND completed_at IS NULL;

    IF v_stage <> 'Completed' THEN
      INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at)
      VALUES (p_sub_job_id, v_stage, now());
    END IF;
  END IF;

  UPDATE public.sub_jobs
  SET
    than = p_than,
    weight = COALESCE(p_weight, sub_jobs.weight),
    status = COALESCE(p_status, sub_jobs.status),
    stages = v_stages,
    current_stage = v_stage,
    stage = v_stage
  WHERE sub_jobs.id = p_sub_job_id
  RETURNING * INTO v_row;

  PERFORM public.apply_quantity_status(p_sub_job_id);
  SELECT * INTO v_row FROM public.sub_jobs WHERE sub_jobs.id = p_sub_job_id;
  RETURN v_row;
END;
$$;

-- 11. RPC: advance_sub_job_stage (per Sub-Job stage advancement)
CREATE OR REPLACE FUNCTION public.advance_sub_job_stage(
  p_sub_job_id uuid
)
RETURNS public.sub_jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sub public.sub_jobs%ROWTYPE;
  v_job public.job_works%ROWTYPE;
  v_stages text[];
  v_idx integer;
  v_next_stage text;
  v_new_status public.job_status;
  v_row public.sub_jobs;
BEGIN
  IF p_sub_job_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_sub
  FROM public.sub_jobs
  WHERE sub_jobs.id = p_sub_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUB_JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_sub.current_stage = 'Completed' THEN
    RAISE EXCEPTION 'SUB_JOB_ALREADY_COMPLETED' USING ERRCODE = 'P0001';
  END IF;

  v_stages := v_sub.stages;
  IF v_stages IS NULL OR array_length(v_stages, 1) IS NULL OR array_length(v_stages, 1) = 0 THEN
    v_stages := ARRAY['Sarin']::text[];
  END IF;

  -- Find current stage index
  v_idx := 0;
  FOR i IN 1..array_length(v_stages, 1) LOOP
    IF v_stages[i] = v_sub.current_stage THEN
      v_idx := i;
      EXIT;
    END IF;
  END LOOP;

  IF v_idx = 0 OR v_idx >= array_length(v_stages, 1) THEN
    -- Final stage reached -> Sub-Job is Completed
    v_next_stage := 'Completed';
    v_new_status := 'Completed';
  ELSE
    v_next_stage := v_stages[v_idx + 1];
    v_new_status := 'Progress';
  END IF;

  -- Update stage history
  UPDATE public.sub_job_stage_history
  SET completed_at = now()
  WHERE sub_job_id = p_sub_job_id AND stage = v_sub.current_stage AND completed_at IS NULL;

  IF v_next_stage <> 'Completed' THEN
    INSERT INTO public.sub_job_stage_history (sub_job_id, stage, started_at)
    VALUES (p_sub_job_id, v_next_stage, now());
  END IF;

  UPDATE public.sub_jobs
  SET
    current_stage = v_next_stage,
    stage = v_next_stage,
    status = v_new_status
  WHERE sub_jobs.id = p_sub_job_id
  RETURNING * INTO v_row;

  -- Update parent job status
  PERFORM public.apply_quantity_status(p_sub_job_id);
  SELECT * INTO v_row FROM public.sub_jobs WHERE sub_jobs.id = p_sub_job_id;
  RETURN v_row;
END;
$$;

-- 12. RPC: add_employee_work (validates against Sub-Job's active current_stage)
CREATE OR REPLACE FUNCTION public.add_employee_work(
  p_sub_job_id uuid,
  p_employee_id uuid,
  p_done_than numeric
)
RETURNS public.sub_job_employee_work
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sub public.sub_jobs%ROWTYPE;
  v_employee public.employees%ROWTYPE;
  v_stage_done numeric(14, 3);
  v_row public.sub_job_employee_work;
BEGIN
  IF p_sub_job_id IS NULL OR p_employee_id IS NULL OR p_done_than IS NULL OR p_done_than <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_sub
  FROM public.sub_jobs
  WHERE id = p_sub_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUB_JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_sub.current_stage = 'Completed' THEN
    RAISE EXCEPTION 'SUB_JOB_COMPLETED' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_employee
  FROM public.employees
  WHERE id = p_employee_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_employee.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'EMPLOYEE_INACTIVE' USING ERRCODE = 'P0001';
  END IF;

  -- Validate employee type matches the subjob current stage
  IF v_employee.employee_type::text <> v_sub.current_stage THEN
    RAISE EXCEPTION 'EMPLOYEE_STAGE_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  -- Stage-specific Done Than validation
  SELECT COALESCE(SUM(done_than), 0) INTO v_stage_done
  FROM public.sub_job_employee_work
  WHERE sub_job_id = p_sub_job_id
    AND stage = v_sub.current_stage;

  IF v_stage_done + p_done_than > v_sub.than THEN
    RAISE EXCEPTION 'DONE_THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.sub_job_employee_work (
    sub_job_id, employee_id, stage, done_than, commission, earning
  )
  VALUES (
    p_sub_job_id,
    p_employee_id,
    v_sub.current_stage,
    p_done_than,
    v_employee.commission,
    round(p_done_than * v_employee.commission, 2)
  )
  RETURNING * INTO v_row;

  PERFORM public.apply_quantity_status(p_sub_job_id);
  RETURN v_row;
END;
$$;

-- 13. RPC: update_employee_work
CREATE OR REPLACE FUNCTION public.update_employee_work(
  p_work_id uuid,
  p_done_than numeric
)
RETURNS public.sub_job_employee_work
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_row public.sub_job_employee_work;
  v_sub public.sub_jobs%ROWTYPE;
  v_stage_done numeric(14, 3);
BEGIN
  IF p_work_id IS NULL OR p_done_than IS NULL OR p_done_than <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
  FROM public.sub_job_employee_work
  WHERE id = p_work_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORK_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_sub
  FROM public.sub_jobs
  WHERE id = v_row.sub_job_id
  FOR UPDATE;

  SELECT COALESCE(SUM(done_than), 0) INTO v_stage_done
  FROM public.sub_job_employee_work
  WHERE sub_job_id = v_row.sub_job_id
    AND stage = v_row.stage
    AND id <> p_work_id;

  IF v_stage_done + p_done_than > v_sub.than THEN
    RAISE EXCEPTION 'DONE_THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.sub_job_employee_work
  SET
    done_than = p_done_than,
    earning = round(p_done_than * commission, 2)
  WHERE id = p_work_id
  RETURNING * INTO v_row;

  PERFORM public.apply_quantity_status(v_row.sub_job_id);
  RETURN v_row;
END;
$$;

-- 14. Drop obsolete advance_job_stage function
DROP FUNCTION IF EXISTS public.advance_job_stage(uuid);

-- 15. Permissions
REVOKE ALL ON FUNCTION public.create_job(uuid, public.job_type, numeric, numeric, text, numeric, public.job_status, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_job_with_invoice_recalc(uuid, numeric, numeric, text, numeric, public.job_status, public.job_type, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_sub_job(uuid, numeric, numeric, public.job_status, text[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_sub_job(uuid, numeric, numeric, public.job_status, text[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.advance_sub_job_stage(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_employee_work(uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_employee_work(uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_quantity_status(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_job(uuid, public.job_type, numeric, numeric, text, numeric, public.job_status, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_job_with_invoice_recalc(uuid, numeric, numeric, text, numeric, public.job_status, public.job_type, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sub_job(uuid, numeric, numeric, public.job_status, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sub_job(uuid, numeric, numeric, public.job_status, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_sub_job_stage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_employee_work(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_employee_work(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_quantity_status(uuid) TO authenticated;
