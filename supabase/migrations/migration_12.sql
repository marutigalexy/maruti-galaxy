-- =============================================================================
-- Migration 12: Auto-Advance Sub-Job Stages and Stage History on Completion
-- =============================================================================

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

REVOKE ALL ON FUNCTION public.apply_quantity_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_quantity_status(uuid) TO authenticated;

-- Backfill any existing sub-jobs that already completed their active stage
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.sub_jobs LOOP
    PERFORM public.apply_quantity_status(r.id);
  END LOOP;
END $$;
