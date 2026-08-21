-- Invoice creation is intentionally separate from job creation. Apply after migration_04.sql.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS due_date date;

DROP TRIGGER IF EXISTS invoices_require_rpc_trg ON public.invoices;
REVOKE ALL ON FUNCTION public.create_job_with_invoice(uuid, public.job_type, numeric, numeric, text, numeric, public.job_status, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_job(
  p_party_id uuid, p_job_type public.job_type, p_than numeric, p_price numeric,
  p_kapan_number text, p_weight numeric, p_status public.job_status DEFAULT 'Pending'
)
RETURNS TABLE (job_id uuid, lot_number text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.job_works%ROWTYPE; v_party_active boolean;
BEGIN
  IF p_party_id IS NULL OR p_job_type IS NULL OR p_than IS NULL OR p_price IS NULL
     OR p_kapan_number IS NULL OR p_weight IS NULL OR p_than <= 0 OR p_price < 0
     OR p_weight < 0 OR length(btrim(p_kapan_number)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;
  SELECT is_active INTO v_party_active FROM public.parties WHERE id = p_party_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_party_active IS NOT TRUE THEN RAISE EXCEPTION 'PARTY_INACTIVE' USING ERRCODE = 'P0001'; END IF;
  PERFORM set_config('maruti.via_job_rpc', 'on', true);
  INSERT INTO public.job_works (lot_number, party_id, job_type, than, price, kapan_number, weight, status)
  VALUES (public.next_lot_number(), p_party_id, p_job_type, p_than, p_price, btrim(p_kapan_number), p_weight, COALESCE(p_status, 'Pending'))
  RETURNING * INTO v_job;
  job_id := v_job.id; lot_number := v_job.lot_number; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invoice_for_job(
  p_party_id uuid, p_job_id uuid, p_invoice_date date DEFAULT CURRENT_DATE, p_due_date date DEFAULT NULL
)
RETURNS TABLE (invoice_id uuid, invoice_number text, amount numeric)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.job_works%ROWTYPE; v_invoice public.invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM public.job_works WHERE id = p_job_id AND party_id = p_party_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE job_work_id = p_job_id) THEN
    RAISE EXCEPTION 'INVOICE_ALREADY_EXISTS' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.invoices (invoice_number, job_work_id, invoice_date, due_date, amount, status)
  VALUES (public.next_invoice_number(), v_job.id, COALESCE(p_invoice_date, CURRENT_DATE),
          COALESCE(p_due_date, p_invoice_date, CURRENT_DATE), round(v_job.than * v_job.price, 2), 'Unpaid')
  RETURNING * INTO v_invoice;
  invoice_id := v_invoice.id; invoice_number := v_invoice.invoice_number; amount := v_invoice.amount; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_job_with_invoice_recalc(
  p_job_id uuid, p_than numeric, p_price numeric, p_kapan_number text DEFAULT NULL,
  p_weight numeric DEFAULT NULL, p_status public.job_status DEFAULT NULL, p_job_type public.job_type DEFAULT NULL
)
RETURNS TABLE (job_id uuid, lot_number text, invoice_id uuid, invoice_number text, amount numeric, status public.invoice_status)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_job public.job_works%ROWTYPE; v_invoice public.invoices%ROWTYPE; v_sub_than numeric(14,3); v_allocated numeric(14,2); v_new_amount numeric(14,2);
BEGIN
  IF p_job_id IS NULL OR p_than IS NULL OR p_price IS NULL OR p_than <= 0 OR p_price < 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_job FROM public.job_works WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT COALESCE(SUM(than), 0) INTO v_sub_than FROM public.sub_jobs WHERE job_id = p_job_id;
  IF p_than < v_sub_than THEN RAISE EXCEPTION 'THAN_BELOW_SUB_JOBS' USING ERRCODE = 'P0001'; END IF;
  IF p_weight IS NOT NULL AND p_weight < 0 OR p_kapan_number IS NOT NULL AND length(btrim(p_kapan_number)) = 0 THEN RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023'; END IF;
  v_new_amount := round(p_than * p_price, 2);
  SELECT * INTO v_invoice FROM public.invoices WHERE job_work_id = p_job_id FOR UPDATE;
  IF FOUND THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_allocated FROM public.entry_invoice_allocations WHERE invoice_id = v_invoice.id;
    IF v_new_amount < v_allocated THEN RAISE EXCEPTION 'AMOUNT_BELOW_ALLOCATIONS' USING ERRCODE = 'P0001'; END IF;
  END IF;
  UPDATE public.job_works SET than = p_than, price = p_price, kapan_number = COALESCE(btrim(p_kapan_number), kapan_number), weight = COALESCE(p_weight, weight), status = COALESCE(p_status, status), job_type = COALESCE(p_job_type, job_type) WHERE id = p_job_id RETURNING * INTO v_job;
  IF v_invoice.id IS NOT NULL THEN
    UPDATE public.invoices SET amount = v_new_amount WHERE id = v_invoice.id RETURNING * INTO v_invoice;
    PERFORM public.set_invoice_status_from_allocations(v_invoice.id);
    SELECT * INTO v_invoice FROM public.invoices WHERE id = v_invoice.id;
  END IF;
  job_id := v_job.id; lot_number := v_job.lot_number; invoice_id := v_invoice.id; invoice_number := v_invoice.invoice_number; amount := v_invoice.amount; status := v_invoice.status; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_job(uuid, public.job_type, numeric, numeric, text, numeric, public.job_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_invoice_for_job(uuid, uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_job(uuid, public.job_type, numeric, numeric, text, numeric, public.job_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_for_job(uuid, uuid, date, date) TO authenticated;
