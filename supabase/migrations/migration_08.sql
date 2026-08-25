-- Migration 08: Stage-based job workflow with employee types and dynamic multi-stage pipelines

-- 1. Create employee_type and job_stage enums
DO $$ BEGIN
  CREATE TYPE public.employee_type AS ENUM ('Sarin', 'Dropping', 'Galaxy');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.job_stage AS ENUM ('Sarin', 'Dropping', 'Galaxy', 'Completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Add employee_type to employees table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employee_type public.employee_type NOT NULL DEFAULT 'Sarin';

CREATE INDEX IF NOT EXISTS employees_employee_type_idx ON public.employees (employee_type);

-- 3. Add stages array and current_stage to job_works table
ALTER TABLE public.job_works
  ADD COLUMN IF NOT EXISTS stages text[] NOT NULL DEFAULT ARRAY['Sarin']::text[],
  ADD COLUMN IF NOT EXISTS current_stage text NOT NULL DEFAULT 'Sarin';

CREATE INDEX IF NOT EXISTS job_works_current_stage_idx ON public.job_works (current_st  age);

-- 4. Add stage to sub_jobs table
ALTER TABLE public.sub_jobs
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'Sarin';

CREATE INDEX IF NOT EXISTS sub_jobs_stage_idx ON public.sub_jobs (stage);

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
  sj.stage,
  sj.created_at,
  sj.updated_at
FROM public.sub_jobs sj
JOIN public.job_works jw ON jw.id = sj.job_id;

GRANT SELECT ON public.v_sub_jobs_display TO authenticated;
GRANT SELECT ON public.v_sub_jobs_display TO anon;

-- 5. Backfill existing jobs and sub-jobs
UPDATE public.job_works
SET
  stages = CASE
    WHEN job_type::text = 'Dropping' THEN ARRAY['Dropping']::text[]
    WHEN job_type::text = 'Galaxy' THEN ARRAY['Galaxy']::text[]
    ELSE ARRAY['Sarin']::text[]
  END,
  current_stage = CASE
    WHEN status = 'Completed' THEN 'Completed'
    WHEN job_type::text = 'Dropping' THEN 'Dropping'
    WHEN job_type::text = 'Galaxy' THEN 'Galaxy'
    ELSE 'Sarin'
  END
WHERE stages IS NULL OR stages = ARRAY['Sarin']::text[];

UPDATE public.sub_jobs sj
SET stage = COALESCE(
  (SELECT current_stage FROM public.job_works jw WHERE jw.id = sj.job_id),
  'Sarin'
)
WHERE stage IS NULL OR stage = 'Sarin';

-- 6. RPC: create_job supporting stages array
CREATE OR REPLACE FUNCTION public.create_job(
  p_party_id uuid,
  p_job_type public.job_type,
  p_than numeric,
  p_price numeric,
  p_kapan_number text,
  p_weight numeric,
  p_status public.job_status DEFAULT 'Pending',
  p_stages text[] DEFAULT ARRAY['Sarin']::text[]
)
RETURNS TABLE (job_id uuid, lot_number text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_job public.job_works%ROWTYPE;
  v_party_active boolean;
  v_initial_stage text;
  v_stages text[];
BEGIN
  IF p_party_id IS NULL OR p_than IS NULL OR p_price IS NULL
     OR p_kapan_number IS NULL OR p_weight IS NULL OR p_than <= 0 OR p_price < 0
     OR p_weight < 0 OR length(btrim(p_kapan_number)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT is_active INTO v_party_active FROM public.parties WHERE id = p_party_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_party_active IS NOT TRUE THEN RAISE EXCEPTION 'PARTY_INACTIVE' USING ERRCODE = 'P0001'; END IF;

  -- Normalize stages or default to Sarin
  IF p_stages IS NULL OR array_length(p_stages, 1) IS NULL OR array_length(p_stages, 1) = 0 THEN
    v_stages := ARRAY['Sarin']::text[];
  ELSE
    v_stages := p_stages;
  END IF;

  v_initial_stage := v_stages[1];

  PERFORM set_config('maruti.via_job_rpc', 'on', true);
  INSERT INTO public.job_works (
    lot_number, party_id, job_type, than, price, kapan_number, weight, status, stages, current_stage
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
    v_stages,
    v_initial_stage
  )
  RETURNING * INTO v_job;

  job_id := v_job.id;
  lot_number := v_job.lot_number;
  RETURN NEXT;
END;
$$;

-- 7. RPC: create_sub_job with stage tracking
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
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_stage := COALESCE(p_stage, v_job.current_stage, 'Sarin');

  SELECT COALESCE(SUM(than), 0) INTO v_used
  FROM public.sub_jobs
  WHERE job_id = p_job_id;

  IF v_used + p_than > v_job.than THEN
    RAISE EXCEPTION 'THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(MAX(sequence_no), 0) + 1 INTO v_next
  FROM public.sub_jobs
  WHERE job_id = p_job_id;

  INSERT INTO public.sub_jobs (job_id, sequence_no, than, weight, status, stage)
  VALUES (p_job_id, v_next, p_than, p_weight, COALESCE(p_status, 'Pending'), v_stage)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 8. RPC: add_employee_work with employee_type and subjob stage validation
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
  v_done numeric(14, 3);
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

  -- Validate employee type matches the subjob stage
  IF v_employee.employee_type::text <> v_sub.stage THEN
    RAISE EXCEPTION 'EMPLOYEE_STAGE_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM(done_than), 0) INTO v_done
  FROM public.sub_job_employee_work
  WHERE sub_job_id = p_sub_job_id;

  IF v_done + p_done_than > v_sub.than THEN
    RAISE EXCEPTION 'DONE_THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.sub_job_employee_work (
    sub_job_id, employee_id, done_than, commission, earning
  )
  VALUES (
    p_sub_job_id,
    p_employee_id,
    p_done_than,
    v_employee.commission,
    round(p_done_than * v_employee.commission, 2)
  )
  RETURNING * INTO v_row;

  PERFORM public.apply_quantity_status(p_sub_job_id);
  RETURN v_row;
END;
$$;

-- 9. RPC: advance_job_stage
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
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_stages := v_job.stages;
  IF v_stages IS NULL OR array_length(v_stages, 1) IS NULL THEN
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
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  job_id := v_job.id;
  current_stage := v_job.current_stage;
  status := v_job.status;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_job(uuid, public.job_type, numeric, numeric, text, numeric, public.job_status, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sub_job(uuid, numeric, numeric, public.job_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_employee_work(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_job_stage(uuid) TO authenticated;
