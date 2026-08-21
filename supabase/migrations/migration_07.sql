-- migration_07
-- Strict invoice generation: invoice total comes ONLY from explicitly selected jobs.
-- Apply after migration_06.sql

-- =============================================================================
-- 1. Back-fill invoice_jobs for any invoices that already exist.
--    Ensures every invoice has at least its primary job linked.
-- =============================================================================

INSERT INTO public.invoice_jobs (invoice_id, job_work_id)
SELECT i.id, i.job_work_id
FROM   public.invoices i
WHERE  NOT EXISTS (
  SELECT 1 FROM public.invoice_jobs ij WHERE ij.invoice_id = i.id
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. create_invoice_for_jobs — strict multi-job RPC
--
--    ONLY the jobs in p_job_ids contribute to the invoice.
--    Never queries all pending/unpaid jobs or any party-level data.
--    Total = SUM of billing_amount (or than*price) for p_job_ids ONLY.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_invoice_for_jobs(
  p_party_id     uuid,
  p_job_ids      uuid[],
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
  v_jw         public.job_works%ROWTYPE;
BEGIN
  IF p_party_id IS NULL
     OR p_job_ids IS NULL
     OR array_length(p_job_ids, 1) IS NULL
     OR array_length(p_job_ids, 1) < 1 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  -- Validate and accumulate total for ONLY the explicitly selected jobs
  FOREACH v_job_id IN ARRAY p_job_ids LOOP

    SELECT * INTO v_jw
    FROM   public.job_works
    WHERE  id       = v_job_id
      AND  party_id = p_party_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    -- Two-layer duplicate check
    IF EXISTS (SELECT 1 FROM public.invoice_jobs WHERE job_work_id = v_job_id) THEN
      RAISE EXCEPTION 'INVOICE_ALREADY_EXISTS' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM public.invoices WHERE job_work_id = v_job_id) THEN
      RAISE EXCEPTION 'INVOICE_ALREADY_EXISTS' USING ERRCODE = 'P0001';
    END IF;

    -- billing_amount takes priority; falls back to than × price
    v_bill  := COALESCE(v_jw.billing_amount, round(v_jw.than * v_jw.price, 2));
    v_total := v_total + v_bill;

  END LOOP;

  v_primary_id := p_job_ids[1];

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

  -- Link ONLY the selected jobs
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
-- 3. create_invoice_for_job — legacy single-job RPC
--    Patched to also write to invoice_jobs and use billing_amount.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_invoice_for_job(
  p_party_id     uuid,
  p_job_id       uuid,
  p_invoice_date date DEFAULT CURRENT_DATE,
  p_due_date     date DEFAULT NULL
)
RETURNS TABLE (invoice_id uuid, invoice_number text, amount numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job     public.job_works%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_job
  FROM   public.job_works
  WHERE  id = p_job_id AND party_id = p_party_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (SELECT 1 FROM public.invoices WHERE job_work_id = p_job_id) THEN
    RAISE EXCEPTION 'INVOICE_ALREADY_EXISTS' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.invoice_jobs WHERE job_work_id = p_job_id) THEN
    RAISE EXCEPTION 'INVOICE_ALREADY_EXISTS' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('maruti.via_job_rpc', 'on', true);

  INSERT INTO public.invoices (
    invoice_number, job_work_id, invoice_date, due_date, amount, status
  )
  VALUES (
    public.next_invoice_number(),
    v_job.id,
    COALESCE(p_invoice_date, CURRENT_DATE),
    COALESCE(p_due_date, p_invoice_date, CURRENT_DATE),
    COALESCE(v_job.billing_amount, round(v_job.than * v_job.price, 2)),
    'Unpaid'
  )
  RETURNING * INTO v_invoice;

  INSERT INTO public.invoice_jobs (invoice_id, job_work_id)
  VALUES (v_invoice.id, v_job.id);

  invoice_id     := v_invoice.id;
  invoice_number := v_invoice.invoice_number;
  amount         := v_invoice.amount;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invoice_for_job(uuid, uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_for_job(uuid, uuid, date, date) TO authenticated;
