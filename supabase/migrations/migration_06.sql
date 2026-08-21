-- migration_06
-- Multi-job invoices + billing_amount on job_works
-- Apply after migration_05.sql

-- =============================================================================
-- 1. Add billing_amount to job_works
--    Nullable: NULL means "use than * price" (backward compat).
-- =============================================================================

ALTER TABLE public.job_works
  ADD COLUMN IF NOT EXISTS billing_amount numeric(14, 2)
    CONSTRAINT job_works_billing_amount_non_negative_chk CHECK (billing_amount IS NULL OR billing_amount >= 0);

-- =============================================================================
-- 2. invoice_jobs — many-to-many join between invoices and job_works
--    The primary job is still tracked via invoices.job_work_id for backward compat.
--    Additional jobs are linked here (including the primary job).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices  (id) ON DELETE RESTRICT,
  job_work_id uuid NOT NULL REFERENCES public.job_works (id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_jobs_invoice_job_uidx UNIQUE (invoice_id, job_work_id)
);

CREATE INDEX IF NOT EXISTS invoice_jobs_invoice_id_idx  ON public.invoice_jobs (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_jobs_job_work_id_idx ON public.invoice_jobs (job_work_id);

ALTER TABLE public.invoice_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_jobs_admin_all
  ON public.invoice_jobs FOR ALL TO authenticated
  USING  (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- =============================================================================
-- 3. Back-fill invoice_jobs from existing invoices
-- =============================================================================

INSERT INTO public.invoice_jobs (invoice_id, job_work_id)
SELECT id, job_work_id
FROM   public.invoices
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 4. Helper: effective billing amount for a single job
--    Returns billing_amount if set, otherwise than * price.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.job_billing_amount(p_job_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(billing_amount, round(than * price, 2))
  FROM   public.job_works
  WHERE  id = p_job_id;
$$;

-- =============================================================================
-- 5. create_invoice_for_jobs — new multi-job RPC
--    Accepts an array of job UUIDs. Creates ONE invoice whose amount is the
--    sum of billing amounts, links all jobs via invoice_jobs, and marks the
--    first supplied job as the primary (invoices.job_work_id).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_invoice_for_jobs(
  p_party_id    uuid,
  p_job_ids     uuid[],
  p_invoice_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (invoice_id uuid, invoice_number text, amount numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job_id     uuid;
  v_primary_id uuid;
  v_total      numeric(14, 2) := 0;
  v_bill       numeric(14, 2);
  v_invoice    public.invoices%ROWTYPE;
BEGIN
  -- Basic validation
  IF p_party_id IS NULL OR p_job_ids IS NULL OR array_length(p_job_ids, 1) IS NULL
     OR array_length(p_job_ids, 1) < 1 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  -- Validate each job, accumulate total, detect already-invoiced jobs
  FOREACH v_job_id IN ARRAY p_job_ids LOOP
    DECLARE
      v_jw public.job_works%ROWTYPE;
    BEGIN
      SELECT * INTO v_jw
      FROM   public.job_works
      WHERE  id = v_job_id AND party_id = p_party_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.invoice_jobs ij
        JOIN   public.invoices i ON i.id = ij.invoice_id
        WHERE  ij.job_work_id = v_job_id
      ) THEN
        RAISE EXCEPTION 'INVOICE_ALREADY_EXISTS' USING ERRCODE = 'P0001';
      END IF;

      v_bill  := COALESCE(v_jw.billing_amount, round(v_jw.than * v_jw.price, 2));
      v_total := v_total + v_bill;
    END;
  END LOOP;

  v_primary_id := p_job_ids[1];

  -- Create the invoice (primary job used for job_work_id backward compat)
  PERFORM set_config('maruti.via_job_rpc', 'on', true);

  INSERT INTO public.invoices (
    invoice_number, job_work_id, invoice_date, due_date, amount, status
  )
  VALUES (
    public.next_invoice_number(),
    v_primary_id,
    COALESCE(p_invoice_date, CURRENT_DATE),
    COALESCE(p_invoice_date, CURRENT_DATE),
    v_total,
    'Unpaid'
  )
  RETURNING * INTO v_invoice;

  -- Link all jobs
  FOREACH v_job_id IN ARRAY p_job_ids LOOP
    INSERT INTO public.invoice_jobs (invoice_id, job_work_id)
    VALUES (v_invoice.id, v_job_id);
  END LOOP;

  invoice_id     := v_invoice.id;
  invoice_number := v_invoice.invoice_number;
  amount         := v_invoice.amount;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invoice_for_jobs(uuid, uuid[], date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_for_jobs(uuid, uuid[], date) TO authenticated;

-- =============================================================================
-- 6. update_job_billing_amount — lets service layer set billing_amount
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_job_billing_amount(
  p_job_id        uuid,
  p_billing_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_job_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;
  IF p_billing_amount IS NOT NULL AND p_billing_amount < 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;
  UPDATE public.job_works SET billing_amount = p_billing_amount WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_job_billing_amount(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_job_billing_amount(uuid, numeric) TO authenticated;
