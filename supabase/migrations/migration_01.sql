-- migration_01
-- Maruti Galaxy baseline schema
-- Run once in the Supabase SQL Editor against a fresh project.
-- Do not re-run on a database that already has these objects.

-- =============================================================================
-- Extensions and updated_at
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Enums
-- =============================================================================

CREATE TYPE public.user_role AS ENUM ('admin');
CREATE TYPE public.job_type AS ENUM ('Sarin', 'Dropping', 'Galaxy');
CREATE TYPE public.job_status AS ENUM ('Pending', 'Progress', 'Completed');
CREATE TYPE public.invoice_status AS ENUM ('Unpaid', 'Partially Paid', 'Paid');
CREATE TYPE public.entry_type AS ENUM ('Income', 'Expense');

CREATE TYPE public.allocation_item AS (
  invoice_id uuid,
  amount numeric
);

-- =============================================================================
-- users (no password columns)
-- =============================================================================

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'admin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_name_not_blank_chk CHECK (length(btrim(name)) > 0),
  CONSTRAINT users_email_lowercase_chk CHECK (email = lower(email)),
  CONSTRAINT users_email_format_chk CHECK (
    email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

CREATE UNIQUE INDEX users_email_uidx ON public.users (email);
CREATE INDEX users_name_idx ON public.users (name);
CREATE INDEX users_is_active_idx ON public.users (is_active);

CREATE OR REPLACE FUNCTION public.users_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email = lower(btrim(NEW.email));
  NEW.name = btrim(NEW.name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_normalize_email_trg
BEFORE INSERT OR UPDATE OF email, name ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.users_normalize_email();

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- parties (mobile required, not unique)
-- =============================================================================

CREATE TABLE public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person_name text,
  mobile_number text NOT NULL,
  price numeric(14, 2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parties_company_name_not_blank_chk CHECK (length(btrim(company_name)) > 0),
  CONSTRAINT parties_mobile_not_blank_chk CHECK (length(btrim(mobile_number)) > 0),
  CONSTRAINT parties_price_non_negative_chk CHECK (price >= 0)
);

CREATE INDEX parties_company_name_idx ON public.parties (company_name);
CREATE INDEX parties_mobile_number_idx ON public.parties (mobile_number);
CREATE INDEX parties_is_active_idx ON public.parties (is_active);

CREATE TRIGGER parties_set_updated_at
BEFORE UPDATE ON public.parties
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- employees (mobile required, not unique)
-- =============================================================================

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile_number text NOT NULL,
  commission numeric(14, 2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employees_name_not_blank_chk CHECK (length(btrim(name)) > 0),
  CONSTRAINT employees_mobile_not_blank_chk CHECK (length(btrim(mobile_number)) > 0),
  CONSTRAINT employees_commission_non_negative_chk CHECK (commission >= 0)
);

CREATE INDEX employees_name_idx ON public.employees (name);
CREATE INDEX employees_mobile_number_idx ON public.employees (mobile_number);
CREATE INDEX employees_is_active_idx ON public.employees (is_active);

CREATE TRIGGER employees_set_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- job_works
-- =============================================================================

CREATE TABLE public.job_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number text NOT NULL,
  party_id uuid NOT NULL REFERENCES public.parties (id) ON DELETE RESTRICT,
  job_type public.job_type NOT NULL,
  than numeric(14, 3) NOT NULL,
  price numeric(14, 2) NOT NULL,
  kapan_number text NOT NULL,
  weight numeric(14, 3) NOT NULL,
  status public.job_status NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_works_lot_number_not_blank_chk CHECK (length(btrim(lot_number)) > 0),
  CONSTRAINT job_works_kapan_not_blank_chk CHECK (length(btrim(kapan_number)) > 0),
  CONSTRAINT job_works_than_positive_chk CHECK (than > 0),
  CONSTRAINT job_works_price_non_negative_chk CHECK (price >= 0),
  CONSTRAINT job_works_weight_non_negative_chk CHECK (weight >= 0)
);

CREATE UNIQUE INDEX job_works_lot_number_uidx ON public.job_works (lot_number);
CREATE INDEX job_works_party_id_idx ON public.job_works (party_id);
CREATE INDEX job_works_job_type_idx ON public.job_works (job_type);
CREATE INDEX job_works_status_idx ON public.job_works (status);
CREATE INDEX job_works_created_at_idx ON public.job_works (created_at);

CREATE OR REPLACE FUNCTION public.job_works_protect_lot_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.lot_number IS DISTINCT FROM OLD.lot_number THEN
    RAISE EXCEPTION 'LOT_NUMBER_IMMUTABLE' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER job_works_protect_lot_number_trg
BEFORE UPDATE OF lot_number ON public.job_works
FOR EACH ROW
EXECUTE FUNCTION public.job_works_protect_lot_number();

CREATE TRIGGER job_works_set_updated_at
BEFORE UPDATE ON public.job_works
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.job_works ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- sub_jobs
-- =============================================================================

CREATE TABLE public.sub_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_works (id) ON DELETE RESTRICT,
  sequence_no integer NOT NULL,
  than numeric(14, 3) NOT NULL,
  weight numeric(14, 3) NOT NULL,
  status public.job_status NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sub_jobs_sequence_positive_chk CHECK (sequence_no > 0),
  CONSTRAINT sub_jobs_than_positive_chk CHECK (than > 0),
  CONSTRAINT sub_jobs_weight_non_negative_chk CHECK (weight >= 0),
  CONSTRAINT sub_jobs_job_sequence_uidx UNIQUE (job_id, sequence_no)
);

CREATE INDEX sub_jobs_job_id_idx ON public.sub_jobs (job_id);

CREATE OR REPLACE FUNCTION public.sequence_to_alpha(n integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public
AS $$
DECLARE
  result text := '';
  current integer;
  remainder integer;
BEGIN
  IF n < 1 THEN
    RAISE EXCEPTION 'SEQUENCE_INVALID' USING ERRCODE = '22023';
  END IF;

  current := n;
  WHILE current > 0 LOOP
    remainder := (current - 1) % 26;
    result := chr(65 + remainder) || result;
    current := (current - 1) / 26;
  END LOOP;

  RETURN result;
END;
$$;

CREATE TRIGGER sub_jobs_set_updated_at
BEFORE UPDATE ON public.sub_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sub_jobs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- sub_job_employee_work
-- =============================================================================

CREATE TABLE public.sub_job_employee_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_job_id uuid NOT NULL REFERENCES public.sub_jobs (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees (id) ON DELETE RESTRICT,
  done_than numeric(14, 3) NOT NULL,
  commission numeric(14, 2) NOT NULL,
  earning numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sub_job_employee_work_done_than_positive_chk CHECK (done_than > 0),
  CONSTRAINT sub_job_employee_work_commission_non_negative_chk CHECK (commission >= 0),
  CONSTRAINT sub_job_employee_work_earning_non_negative_chk CHECK (earning >= 0)
);

CREATE INDEX sub_job_employee_work_sub_job_id_idx
  ON public.sub_job_employee_work (sub_job_id);
CREATE INDEX sub_job_employee_work_employee_id_idx
  ON public.sub_job_employee_work (employee_id);
CREATE INDEX sub_job_employee_work_created_at_idx
  ON public.sub_job_employee_work (created_at);

CREATE TRIGGER sub_job_employee_work_set_updated_at
BEFORE UPDATE ON public.sub_job_employee_work
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sub_job_employee_work ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- invoices (one per main job)
-- =============================================================================

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  job_work_id uuid NOT NULL REFERENCES public.job_works (id) ON DELETE RESTRICT,
  invoice_date date NOT NULL,
  amount numeric(14, 2) NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'Unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_number_not_blank_chk CHECK (length(btrim(invoice_number)) > 0),
  CONSTRAINT invoices_amount_non_negative_chk CHECK (amount >= 0)
);

CREATE UNIQUE INDEX invoices_invoice_number_uidx ON public.invoices (invoice_number);
CREATE UNIQUE INDEX invoices_job_work_id_uidx ON public.invoices (job_work_id);
CREATE INDEX invoices_invoice_date_idx ON public.invoices (invoice_date);
CREATE INDEX invoices_status_idx ON public.invoices (status);

CREATE OR REPLACE FUNCTION public.invoices_protect_number_and_job()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN
    RAISE EXCEPTION 'INVOICE_NUMBER_IMMUTABLE' USING ERRCODE = '22023';
  END IF;
  IF NEW.job_work_id IS DISTINCT FROM OLD.job_work_id THEN
    RAISE EXCEPTION 'INVOICE_JOB_IMMUTABLE' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_protect_number_and_job_trg
BEFORE UPDATE OF invoice_number, job_work_id ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.invoices_protect_number_and_job();

CREATE TRIGGER invoices_set_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- accounts
-- =============================================================================

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  opening_balance numeric(14, 2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_name_not_blank_chk CHECK (length(btrim(name)) > 0)
);

CREATE UNIQUE INDEX accounts_name_uidx ON public.accounts (name);
CREATE INDEX accounts_is_active_idx ON public.accounts (is_active);

CREATE TRIGGER accounts_set_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- categories
-- =============================================================================

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.entry_type NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_not_blank_chk CHECK (length(btrim(name)) > 0),
  CONSTRAINT categories_name_type_uidx UNIQUE (name, type)
);

CREATE INDEX categories_type_idx ON public.categories (type);
CREATE INDEX categories_is_active_idx ON public.categories (is_active);

CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- entries
-- =============================================================================

CREATE TABLE public.entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid REFERENCES public.parties (id) ON DELETE RESTRICT,
  employee_id uuid REFERENCES public.employees (id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE RESTRICT,
  entry_type public.entry_type NOT NULL,
  entry_date date NOT NULL,
  amount numeric(14, 2) NOT NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entries_amount_positive_chk CHECK (amount > 0)
);

CREATE INDEX entries_account_id_idx ON public.entries (account_id);
CREATE INDEX entries_category_id_idx ON public.entries (category_id);
CREATE INDEX entries_party_id_idx ON public.entries (party_id);
CREATE INDEX entries_employee_id_idx ON public.entries (employee_id);
CREATE INDEX entries_entry_type_idx ON public.entries (entry_type);
CREATE INDEX entries_entry_date_idx ON public.entries (entry_date);

CREATE TRIGGER entries_set_updated_at
BEFORE UPDATE ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- entry_invoice_allocations (no updated_at)
-- =============================================================================

CREATE TABLE public.entry_invoice_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.entries (id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE RESTRICT,
  amount numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entry_invoice_allocations_amount_positive_chk CHECK (amount > 0)
);

CREATE INDEX entry_invoice_allocations_entry_id_idx
  ON public.entry_invoice_allocations (entry_id);
CREATE INDEX entry_invoice_allocations_invoice_id_idx
  ON public.entry_invoice_allocations (invoice_id);

ALTER TABLE public.entry_invoice_allocations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS: active admin only. anon has no policies.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

CREATE POLICY users_admin_all
  ON public.users FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY parties_admin_all
  ON public.parties FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY employees_admin_all
  ON public.employees FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY job_works_admin_all
  ON public.job_works FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY sub_jobs_admin_all
  ON public.sub_jobs FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY sub_job_employee_work_admin_all
  ON public.sub_job_employee_work FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY invoices_admin_all
  ON public.invoices FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY accounts_admin_all
  ON public.accounts FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY categories_admin_all
  ON public.categories FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY entries_admin_all
  ON public.entries FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

CREATE POLICY entry_invoice_allocations_admin_all
  ON public.entry_invoice_allocations FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

-- =============================================================================
-- Read-model views
-- =============================================================================

CREATE OR REPLACE VIEW public.v_sub_jobs_display
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
  sj.created_at,
  sj.updated_at
FROM public.sub_jobs sj
JOIN public.job_works jw ON jw.id = sj.job_id;

CREATE OR REPLACE VIEW public.v_invoice_outstanding
WITH (security_invoker = true)
AS
SELECT
  i.id AS invoice_id,
  i.invoice_number,
  i.job_work_id,
  i.invoice_date,
  i.amount,
  COALESCE(a.allocated, 0)::numeric(14, 2) AS allocated,
  (i.amount - COALESCE(a.allocated, 0))::numeric(14, 2) AS outstanding,
  CASE
    WHEN COALESCE(a.allocated, 0) = 0 THEN 'Unpaid'::public.invoice_status
    WHEN COALESCE(a.allocated, 0) >= i.amount THEN 'Paid'::public.invoice_status
    ELSE 'Partially Paid'::public.invoice_status
  END AS derived_status,
  i.status AS stored_status
FROM public.invoices i
LEFT JOIN (
  SELECT invoice_id, SUM(amount) AS allocated
  FROM public.entry_invoice_allocations
  GROUP BY invoice_id
) a ON a.invoice_id = i.id;

CREATE OR REPLACE VIEW public.v_account_balances
WITH (security_invoker = true)
AS
SELECT
  acc.id AS account_id,
  acc.name,
  acc.opening_balance,
  COALESCE(inc.total_in, 0)::numeric(14, 2) AS total_in,
  COALESCE(exp.total_out, 0)::numeric(14, 2) AS total_out,
  (
    acc.opening_balance
    + COALESCE(inc.total_in, 0)
    - COALESCE(exp.total_out, 0)
  )::numeric(14, 2) AS current_balance,
  COALESCE(cnt.entry_count, 0) AS entry_count,
  acc.is_active
FROM public.accounts acc
LEFT JOIN (
  SELECT account_id, SUM(amount) AS total_in
  FROM public.entries
  WHERE entry_type = 'Income'
  GROUP BY account_id
) inc ON inc.account_id = acc.id
LEFT JOIN (
  SELECT account_id, SUM(amount) AS total_out
  FROM public.entries
  WHERE entry_type = 'Expense'
  GROUP BY account_id
) exp ON exp.account_id = acc.id
LEFT JOIN (
  SELECT account_id, COUNT(*)::integer AS entry_count
  FROM public.entries
  GROUP BY account_id
) cnt ON cnt.account_id = acc.id;

CREATE OR REPLACE VIEW public.v_party_outstanding
WITH (security_invoker = true)
AS
SELECT
  p.id AS party_id,
  COALESCE(SUM(vo.outstanding), 0)::numeric(14, 2) AS outstanding_sum
FROM public.parties p
LEFT JOIN public.job_works jw ON jw.party_id = p.id
LEFT JOIN public.v_invoice_outstanding vo ON vo.job_work_id = jw.id
GROUP BY p.id;

CREATE OR REPLACE VIEW public.v_employee_earnings
WITH (security_invoker = true)
AS
SELECT
  e.id AS employee_id,
  COALESCE(SUM(w.done_than), 0)::numeric(14, 3) AS total_done_than,
  COALESCE(SUM(w.earning), 0)::numeric(14, 2) AS total_earning
FROM public.employees e
LEFT JOIN public.sub_job_employee_work w ON w.employee_id = e.id
GROUP BY e.id;

-- =============================================================================
-- Atomic generators and job + invoice write path
-- =============================================================================

CREATE SEQUENCE public.lot_number_seq AS bigint START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE public.invoice_number_seq AS bigint START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.next_lot_number()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  n bigint;
  digits integer;
BEGIN
  n := nextval('public.lot_number_seq');
  digits := GREATEST(2, char_length(n::text));
  RETURN 'J' || lpad(n::text, digits, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  n bigint;
  digits integer;
BEGIN
  n := nextval('public.invoice_number_seq');
  digits := GREATEST(4, char_length(n::text));
  RETURN 'INV-' || lpad(n::text, digits, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.job_invoice_require_rpc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('maruti.via_job_rpc', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'USE_CREATE_JOB_WITH_INVOICE' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER job_works_require_rpc_trg
BEFORE INSERT ON public.job_works
FOR EACH ROW
EXECUTE FUNCTION public.job_invoice_require_rpc();

CREATE TRIGGER invoices_require_rpc_trg
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.job_invoice_require_rpc();

CREATE OR REPLACE FUNCTION public.create_job_with_invoice(
  p_party_id uuid,
  p_job_type public.job_type,
  p_than numeric,
  p_price numeric,
  p_kapan_number text,
  p_weight numeric,
  p_status public.job_status DEFAULT 'Pending',
  p_invoice_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  job_id uuid,
  lot_number text,
  invoice_id uuid,
  invoice_number text,
  amount numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_job public.job_works%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_party_active boolean;
BEGIN
  IF p_party_id IS NULL
     OR p_job_type IS NULL
     OR p_than IS NULL
     OR p_price IS NULL
     OR p_kapan_number IS NULL
     OR p_weight IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  IF p_than <= 0 OR p_price < 0 OR p_weight < 0 OR length(btrim(p_kapan_number)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT is_active INTO v_party_active
  FROM public.parties
  WHERE id = p_party_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PARTY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_party_active IS NOT TRUE THEN
    RAISE EXCEPTION 'PARTY_INACTIVE' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('maruti.via_job_rpc', 'on', true);

  INSERT INTO public.job_works (
    lot_number, party_id, job_type, than, price, kapan_number, weight, status
  )
  VALUES (
    public.next_lot_number(),
    p_party_id,
    p_job_type,
    p_than,
    p_price,
    btrim(p_kapan_number),
    p_weight,
    COALESCE(p_status, 'Pending')
  )
  RETURNING * INTO v_job;

  INSERT INTO public.invoices (
    invoice_number, job_work_id, invoice_date, amount, status
  )
  VALUES (
    public.next_invoice_number(),
    v_job.id,
    COALESCE(p_invoice_date, CURRENT_DATE),
    round(v_job.than * v_job.price, 2),
    'Unpaid'
  )
  RETURNING * INTO v_invoice;

  job_id := v_job.id;
  lot_number := v_job.lot_number;
  invoice_id := v_invoice.id;
  invoice_number := v_invoice.invoice_number;
  amount := v_invoice.amount;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_invoice_status_from_allocations(p_invoice_id uuid)
RETURNS public.invoice_status
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_amount numeric(14, 2);
  v_allocated numeric(14, 2);
  v_status public.invoice_status;
BEGIN
  SELECT i.amount, COALESCE(SUM(a.amount), 0)
  INTO v_amount, v_allocated
  FROM public.invoices i
  LEFT JOIN public.entry_invoice_allocations a ON a.invoice_id = i.id
  WHERE i.id = p_invoice_id
  GROUP BY i.amount;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_allocated = 0 THEN
    v_status := 'Unpaid';
  ELSIF v_allocated >= v_amount THEN
    v_status := 'Paid';
  ELSE
    v_status := 'Partially Paid';
  END IF;

  UPDATE public.invoices
  SET status = v_status
  WHERE id = p_invoice_id;

  RETURN v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_job_with_invoice_recalc(
  p_job_id uuid,
  p_than numeric,
  p_price numeric,
  p_kapan_number text DEFAULT NULL,
  p_weight numeric DEFAULT NULL,
  p_status public.job_status DEFAULT NULL,
  p_job_type public.job_type DEFAULT NULL
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
  IF p_job_id IS NULL OR p_than IS NULL OR p_price IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  IF p_than <= 0 OR p_price < 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job
  FROM public.job_works AS jw
  WHERE jw.id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices AS inv
  WHERE inv.job_work_id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(SUM(sj.than), 0) INTO v_sub_than
  FROM public.sub_jobs AS sj
  WHERE sj.job_id = p_job_id;

  IF p_than < v_sub_than THEN
    RAISE EXCEPTION 'THAN_BELOW_SUB_JOBS' USING ERRCODE = 'P0001';
  END IF;

  IF p_weight IS NOT NULL AND p_weight < 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  IF p_kapan_number IS NOT NULL AND length(btrim(p_kapan_number)) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  v_new_amount := round(p_than * p_price, 2);

  SELECT COALESCE(SUM(a.amount), 0) INTO v_allocated
  FROM public.entry_invoice_allocations AS a
  WHERE a.invoice_id = v_invoice.id;

  IF v_new_amount < v_allocated THEN
    RAISE EXCEPTION 'AMOUNT_BELOW_ALLOCATIONS' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.job_works AS jw
  SET
    than = p_than,
    price = p_price,
    kapan_number = COALESCE(btrim(p_kapan_number), jw.kapan_number),
    weight = COALESCE(p_weight, jw.weight),
    status = COALESCE(p_status, jw.status),
    job_type = COALESCE(p_job_type, jw.job_type)
  WHERE jw.id = p_job_id
  RETURNING * INTO v_job;

  UPDATE public.invoices AS inv
  SET amount = v_new_amount
  WHERE inv.id = v_invoice.id
  RETURNING * INTO v_invoice;

  PERFORM public.set_invoice_status_from_allocations(v_invoice.id);
  SELECT * INTO v_invoice FROM public.invoices AS inv WHERE inv.id = v_invoice.id;

  job_id := v_job.id;
  lot_number := v_job.lot_number;
  invoice_id := v_invoice.id;
  invoice_number := v_invoice.invoice_number;
  amount := v_invoice.amount;
  status := v_invoice.status;
  RETURN NEXT;
END;
$$;

-- =============================================================================
-- Sub-job creation (row lock + remaining Than)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_sub_job(
  p_job_id uuid,
  p_than numeric,
  p_weight numeric,
  p_status public.job_status DEFAULT 'Pending'
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

  SELECT COALESCE(SUM(than), 0) INTO v_used
  FROM public.sub_jobs
  WHERE job_id = p_job_id;

  IF v_used + p_than > v_job.than THEN
    RAISE EXCEPTION 'THAN_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(MAX(sequence_no), 0) + 1 INTO v_next
  FROM public.sub_jobs
  WHERE job_id = p_job_id;

  INSERT INTO public.sub_jobs (job_id, sequence_no, than, weight, status)
  VALUES (p_job_id, v_next, p_than, p_weight, COALESCE(p_status, 'Pending'))
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- =============================================================================
-- Employee work (snapshot commission; ignore client rate)
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
  v_done numeric(14, 3);
  v_job_done numeric(14, 3);
  v_sub_status public.job_status;
  v_job_status public.job_status;
BEGIN
  SELECT * INTO v_sub
  FROM public.sub_jobs
  WHERE id = p_sub_job_id
  FOR UPDATE;

  SELECT * INTO v_job
  FROM public.job_works
  WHERE id = v_sub.job_id
  FOR UPDATE;

  SELECT COALESCE(SUM(done_than), 0) INTO v_done
  FROM public.sub_job_employee_work
  WHERE sub_job_id = p_sub_job_id;

  v_sub_status := v_sub.status;
  IF v_done >= v_sub.than THEN
    v_sub_status := 'Completed';
  ELSIF v_done > 0 AND v_sub.status = 'Pending' THEN
    v_sub_status := 'Progress';
  END IF;

  UPDATE public.sub_jobs
  SET status = v_sub_status
  WHERE id = p_sub_job_id;

  SELECT COALESCE(SUM(w.done_than), 0) INTO v_job_done
  FROM public.sub_job_employee_work w
  JOIN public.sub_jobs sj ON sj.id = w.sub_job_id
  WHERE sj.job_id = v_job.id;

  v_job_status := v_job.status;
  IF v_job_done >= v_job.than THEN
    v_job_status := 'Completed';
  ELSIF v_job_done > 0 AND v_job.status = 'Pending' THEN
    v_job_status := 'Progress';
  END IF;

  UPDATE public.job_works
  SET status = v_job_status
  WHERE id = v_job.id;
END;
$$;

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
  v_done numeric(14, 3);
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

  SELECT COALESCE(SUM(done_than), 0) INTO v_done
  FROM public.sub_job_employee_work
  WHERE sub_job_id = v_row.sub_job_id
    AND id <> p_work_id;

  IF v_done + p_done_than > v_sub.than THEN
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

CREATE OR REPLACE FUNCTION public.delete_employee_work(p_work_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sub_job_id uuid;
BEGIN
  SELECT sub_job_id INTO v_sub_job_id
  FROM public.sub_job_employee_work
  WHERE id = p_work_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORK_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1 FROM public.sub_jobs WHERE id = v_sub_job_id FOR UPDATE;

  DELETE FROM public.sub_job_employee_work WHERE id = p_work_id;
  PERFORM public.apply_quantity_status(v_sub_job_id);
END;
$$;

-- =============================================================================
-- Income allocation to invoices
-- =============================================================================

CREATE OR REPLACE FUNCTION public.allocate_entry_to_invoices(
  p_entry_id uuid,
  p_items public.allocation_item[]
)
RETURNS SETOF public.entry_invoice_allocations
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_entry public.entries%ROWTYPE;
  v_item record;
  v_invoice public.invoices%ROWTYPE;
  v_entry_used numeric(14, 2);
  v_invoice_used numeric(14, 2);
  v_total numeric(14, 2) := 0;
  v_row public.entry_invoice_allocations;
BEGIN
  IF p_entry_id IS NULL OR p_items IS NULL OR array_length(p_items, 1) IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_entry
  FROM public.entries
  WHERE id = p_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENTRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_entry.entry_type <> 'Income' THEN
    RAISE EXCEPTION 'EXPENSE_ALLOCATION_BLOCKED' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_entry_used
  FROM public.entry_invoice_allocations
  WHERE entry_id = p_entry_id;

  SELECT COALESCE(SUM(x.amount), 0) INTO v_total
  FROM unnest(p_items) AS x;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_items) AS x
    WHERE x.invoice_id IS NULL OR x.amount IS NULL OR x.amount <= 0
  ) THEN
    RAISE EXCEPTION 'VALIDATION_FAILED' USING ERRCODE = '22023';
  END IF;

  IF v_entry_used + v_total > v_entry.amount THEN
    RAISE EXCEPTION 'ENTRY_OVER_ALLOCATED' USING ERRCODE = 'P0001';
  END IF;

  FOR v_item IN
    SELECT x.invoice_id, x.amount
    FROM unnest(p_items) AS x
    ORDER BY x.invoice_id
  LOOP
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = v_item.invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVOICE_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_invoice_used
    FROM public.entry_invoice_allocations
    WHERE invoice_id = v_item.invoice_id;

    IF v_invoice_used + v_item.amount > v_invoice.amount THEN
      RAISE EXCEPTION 'INVOICE_OVER_ALLOCATED' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.entry_invoice_allocations (entry_id, invoice_id, amount)
    VALUES (p_entry_id, v_item.invoice_id, v_item.amount)
    RETURNING * INTO v_row;

    PERFORM public.set_invoice_status_from_allocations(v_item.invoice_id);
    RETURN NEXT v_row;
  END LOOP;
END;
$$;

-- =============================================================================
-- Entry integrity triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.entries_enforce_category_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_type public.entry_type;
BEGIN
  SELECT type INTO v_type
  FROM public.categories
  WHERE id = NEW.category_id;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'CATEGORY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NEW.entry_type <> v_type THEN
    RAISE EXCEPTION 'ENTRY_CATEGORY_TYPE_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER entries_enforce_category_type_trg
BEFORE INSERT OR UPDATE OF category_id, entry_type ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.entries_enforce_category_type();

CREATE OR REPLACE FUNCTION public.entries_reject_inactive_masters()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_account_active boolean;
  v_category_active boolean;
BEGIN
  SELECT is_active INTO v_account_active
  FROM public.accounts
  WHERE id = NEW.account_id;

  IF v_account_active IS NULL THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_account_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ACCOUNT_INACTIVE' USING ERRCODE = 'P0001';
  END IF;

  SELECT is_active INTO v_category_active
  FROM public.categories
  WHERE id = NEW.category_id;

  IF v_category_active IS NULL THEN
    RAISE EXCEPTION 'CATEGORY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_category_active IS NOT TRUE THEN
    RAISE EXCEPTION 'CATEGORY_INACTIVE' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER entries_reject_inactive_masters_trg
BEFORE INSERT ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.entries_reject_inactive_masters();

CREATE OR REPLACE FUNCTION public.categories_protect_type_if_used()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.type IS DISTINCT FROM OLD.type
     AND EXISTS (SELECT 1 FROM public.entries WHERE category_id = OLD.id) THEN
    RAISE EXCEPTION 'CATEGORY_TYPE_IN_USE' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_protect_type_if_used_trg
BEFORE UPDATE OF type ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.categories_protect_type_if_used();

-- =============================================================================
-- Grants: authenticated only. anon has no table or RPC access.
-- =============================================================================

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

GRANT USAGE ON TYPE public.user_role TO authenticated;
GRANT USAGE ON TYPE public.job_type TO authenticated;
GRANT USAGE ON TYPE public.job_status TO authenticated;
GRANT USAGE ON TYPE public.invoice_status TO authenticated;
GRANT USAGE ON TYPE public.entry_type TO authenticated;
GRANT USAGE ON TYPE public.allocation_item TO authenticated;
