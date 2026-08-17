-- Phase 8: Sub-job update RPC required by API-JOB-06 / MOD-JOB-004.
-- Apply after migration_01.sql in the Supabase SQL Editor.

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
  WHERE id = p_sub_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUB_JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_job
  FROM public.job_works
  WHERE id = v_sub.job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(SUM(done_than), 0) INTO v_done
  FROM public.sub_job_employee_work
  WHERE sub_job_id = p_sub_job_id;

  IF p_than < v_done THEN
    RAISE EXCEPTION 'THAN_BELOW_WORK' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM(than), 0) INTO v_used_other
  FROM public.sub_jobs
  WHERE job_id = v_sub.job_id
    AND id <> p_sub_job_id;

  IF v_used_other + p_than > v_job.than THEN
    RAISE EXCEPTION 'THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.sub_jobs
  SET
    than = p_than,
    weight = COALESCE(p_weight, weight),
    status = COALESCE(p_status, status)
  WHERE id = p_sub_job_id
  RETURNING * INTO v_row;

  PERFORM public.apply_quantity_status(p_sub_job_id);
  SELECT * INTO v_row FROM public.sub_jobs WHERE id = p_sub_job_id;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_sub_job(uuid, numeric, numeric, public.job_status) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_sub_job(uuid, numeric, numeric, public.job_status) TO authenticated;
