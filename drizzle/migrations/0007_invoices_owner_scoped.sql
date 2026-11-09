CREATE TABLE public.invoices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
 client_id uuid NOT NULL, work_id uuid, quote_id uuid, number text, sequence integer, fiscal_year integer,
 title text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','cancelled')),
 issue_date date NOT NULL DEFAULT current_date, due_date date, vat_rate numeric(5,2) NOT NULL DEFAULT 21 CHECK(vat_rate BETWEEN 0 AND 100),
 items jsonb NOT NULL DEFAULT '[]', issuer jsonb, recipient jsonb, notes text,
 created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(company_id,id), UNIQUE(company_id,number), UNIQUE(company_id,fiscal_year,sequence),
 FOREIGN KEY(company_id,client_id) REFERENCES public.clients(company_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(company_id,work_id) REFERENCES public.works(company_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(company_id,quote_id) REFERENCES public.quotes(company_id,id) ON DELETE RESTRICT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner invoices" ON public.invoices FOR ALL TO authenticated USING(company_id=public.current_company_id() AND public.phase2_owner(company_id)) WITH CHECK(company_id=public.current_company_id() AND public.phase2_owner(company_id) AND created_by=auth.uid());
CREATE UNIQUE INDEX invoices_quote_active ON public.invoices(company_id,quote_id) WHERE quote_id IS NOT NULL AND status <> 'cancelled';
ALTER TABLE public.payments ADD COLUMN invoice_id uuid;
ALTER TABLE public.payments ADD CONSTRAINT payments_invoice_tenant FOREIGN KEY(company_id,invoice_id) REFERENCES public.invoices(company_id,id) ON DELETE RESTRICT;
CREATE INDEX payments_invoice_idx ON public.payments(company_id,invoice_id);
CREATE FUNCTION public.invoices_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE it jsonb; c public.companies; cl public.clients; seq integer;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'Solo se pueden eliminar borradores'; END IF; RETURN OLD;
 END IF;
 IF TG_OP='INSERT' AND NEW.status <> 'draft' THEN RAISE EXCEPTION 'Crea un borrador primero'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.id<>OLD.id OR NEW.company_id<>OLD.company_id OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Identidad inmutable'; END IF;
  IF OLD.status <> 'draft' THEN
   IF OLD.status='issued' AND NEW.status='cancelled' AND (to_jsonb(NEW)-'status'-'updated_at')=(to_jsonb(OLD)-'status'-'updated_at') THEN
    IF EXISTS(SELECT 1 FROM public.payments WHERE company_id=OLD.company_id AND (invoice_id=OLD.id OR (invoice_id IS NULL AND quote_id=OLD.quote_id))) THEN RAISE EXCEPTION 'La factura tiene cobros vinculados'; END IF;
    NEW.updated_at=now(); RETURN NEW;
   END IF;
   RAISE EXCEPTION 'La factura emitida es inmutable';
  END IF;
 END IF;
 IF NEW.status='cancelled' THEN RAISE EXCEPTION 'Solo se anulan facturas emitidas'; END IF;
 IF btrim(NEW.title)='' OR length(NEW.title)>200 OR (NEW.due_date IS NOT NULL AND NEW.due_date<NEW.issue_date) THEN RAISE EXCEPTION 'Revisa titulo y fechas'; END IF;
 IF jsonb_typeof(NEW.items)<>'array' OR jsonb_array_length(NEW.items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Entre 1 y 100 partidas'; END IF;
 FOR it IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
  IF jsonb_typeof(it)<>'object' OR coalesce(btrim(it->>'description'),'')='' OR length(it->>'description')>500 OR coalesce(btrim(it->>'unit'),'')='' OR (it->>'quantity') IS NULL OR (it->>'unit_price') IS NULL OR (it->>'quantity')::numeric NOT BETWEEN 0.001 AND 1000000 OR (it->>'unit_price')::numeric NOT BETWEEN 0 AND 10000000 THEN RAISE EXCEPTION 'Partida invalida'; END IF;
 END LOOP;
 IF NEW.work_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.works WHERE company_id=NEW.company_id AND id=NEW.work_id AND (client_id IS NULL OR client_id=NEW.client_id)) THEN RAISE EXCEPTION 'La obra no pertenece al cliente'; END IF;
 IF NEW.quote_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.quotes WHERE company_id=NEW.company_id AND id=NEW.quote_id AND client_id=NEW.client_id AND work_id IS NOT DISTINCT FROM NEW.work_id) THEN RAISE EXCEPTION 'Presupuesto incompatible'; END IF;
 NEW.number=NULL; NEW.sequence=NULL; NEW.fiscal_year=NULL; NEW.issuer=NULL; NEW.recipient=NULL;
 IF NEW.status='issued' THEN
  SELECT * INTO c FROM public.companies WHERE id=NEW.company_id FOR UPDATE;
  SELECT * INTO cl FROM public.clients WHERE company_id=NEW.company_id AND id=NEW.client_id;
  IF coalesce(btrim(c.tax_id),'')='' OR coalesce(btrim(c.address),'')='' OR coalesce(btrim(cl.tax_id),'')='' OR coalesce(btrim(cl.address),'')='' THEN RAISE EXCEPTION 'Completa NIF y direccion fiscal de empresa y cliente'; END IF;
  NEW.fiscal_year=extract(year FROM NEW.issue_date)::integer;
  SELECT coalesce(max(sequence),0)+1 INTO seq FROM public.invoices WHERE company_id=NEW.company_id AND fiscal_year=NEW.fiscal_year;
  NEW.sequence=seq; NEW.number=coalesce(nullif(btrim(c.invoice_prefix),''),'F')||'-'||NEW.fiscal_year||'-'||lpad(seq::text, greatest(3,length(seq::text)), '0');
  NEW.issuer=jsonb_build_object('name',coalesce(nullif(c.legal_name,''),c.name),'tax_id',c.tax_id,'address',c.address,'email',c.email,'phone',c.phone);
  NEW.recipient=jsonb_build_object('name',coalesce(nullif(cl.legal_name,''),cl.name),'tax_id',cl.tax_id,'address',cl.address,'email',cl.email,'phone',cl.phone);
 END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER invoices_guard BEFORE INSERT OR UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.invoices_guard();
CREATE FUNCTION public.payment_invoice_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.invoice_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.invoices i WHERE i.company_id=NEW.company_id AND i.id=NEW.invoice_id AND i.status='issued' AND i.client_id IS NOT DISTINCT FROM NEW.client_id AND i.work_id IS NOT DISTINCT FROM NEW.work_id AND i.quote_id IS NOT DISTINCT FROM NEW.quote_id) THEN RAISE EXCEPTION 'Cobro incompatible con factura'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_invoice_guard BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.payment_invoice_guard();