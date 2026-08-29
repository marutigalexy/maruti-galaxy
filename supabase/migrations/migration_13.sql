-- =============================================================================
-- Migration 13: Invoices and Payment Entries Deletion Support
--
-- 1. delete_invoice: Deletes an invoice ONLY when it is in 'Unpaid' (Pending) status
--    with 0 allocations, unlinking all associated jobs from invoice_jobs.
-- 2. delete_entry: Atomically removes allocations, recalculates linked invoice
--    statuses via set_invoice_status_from_allocations, and deletes the entry.
-- =============================================================================

-- 1. RPC: delete_invoice
CREATE OR REPLACE FUNCTION public.delete_invoice(
  p_invoice_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_allocated numeric(14, 2);
BEGIN
  IF p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Verify no allocations exist against this invoice
  SELECT COALESCE(SUM(amount), 0) INTO v_allocated
  FROM public.entry_invoice_allocations
  WHERE invoice_id = p_invoice_id;

  IF v_allocated > 0 OR v_invoice.status IS DISTINCT FROM 'Unpaid' THEN
    RAISE EXCEPTION 'INVOICE_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;

  -- Delete invoice_jobs join rows
  DELETE FROM public.invoice_jobs
  WHERE invoice_id = p_invoice_id;

  -- Delete the invoice
  DELETE FROM public.invoices
  WHERE id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_invoice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_invoice(uuid) TO authenticated;

-- 2. RPC: delete_entry
CREATE OR REPLACE FUNCTION public.delete_entry(
  p_entry_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_ids uuid[];
BEGIN
  IF p_entry_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  -- Check if entry exists
  PERFORM 1 FROM public.entries WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENTRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Collect all invoice IDs linked to this entry via allocations
  SELECT array_agg(DISTINCT invoice_id) INTO v_invoice_ids
  FROM public.entry_invoice_allocations
  WHERE entry_id = p_entry_id;

  -- Delete all allocations for this entry
  DELETE FROM public.entry_invoice_allocations
  WHERE entry_id = p_entry_id;

  -- Recalculate status for each affected invoice
  IF v_invoice_ids IS NOT NULL THEN
    FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
      PERFORM public.set_invoice_status_from_allocations(v_invoice_id);
    END LOOP;
  END IF;

  -- Delete the entry
  DELETE FROM public.entries
  WHERE id = p_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_entry(uuid) TO authenticated;
