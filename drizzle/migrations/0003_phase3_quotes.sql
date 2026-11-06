create table public.quotes (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 client_id uuid, work_id uuid,
 number text not null check (btrim(number) <> ''),
 title text not null check (btrim(title) <> ''),
 status text not null default 'draft' check (status in ('draft','sent','accepted','rejected')),
 issue_date date not null default current_date, valid_until date,
 vat_rate numeric(5,2) not null default 21 check (vat_rate >= 0 and vat_rate <= 100),
 notes text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (company_id, number), unique (company_id, id),
 check (valid_until is null or valid_until >= issue_date),
 foreign key (company_id, client_id) references public.clients(company_id, id) on delete restrict,
 foreign key (company_id, work_id) references public.works(company_id, id) on delete restrict
);
grant select, insert, update, delete on public.quotes to authenticated;
grant all on public.quotes to service_role;
alter table public.quotes enable row level security;

create table public.quote_items (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 quote_id uuid not null,
 position int not null default 0,
 description text not null check (btrim(description) <> ''),
 unit text not null default 'ud',
 quantity numeric(12,3) not null default 1 check (quantity > 0),
 unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
 created_at timestamptz not null default now(),
 foreign key (company_id, quote_id) references public.quotes(company_id, id) on delete cascade
);
grant select, insert, update, delete on public.quote_items to authenticated;
grant all on public.quote_items to service_role;
alter table public.quote_items enable row level security;
create index quote_items_quote_idx on public.quote_items(company_id, quote_id, position);

create function public.quotes_guard() returns trigger language plpgsql set search_path = public as $$
begin
 if new.id is distinct from old.id or new.company_id is distinct from old.company_id
 or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
  raise exception 'No se puede cambiar la identidad de un registro';
 end if;
 new.updated_at := now(); return new;
end $$;
create trigger quotes_guard before update on public.quotes for each row execute function public.quotes_guard();

create policy "Owner read quotes" on public.quotes for select to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Owner insert quotes" on public.quotes for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id) and created_by = auth.uid());
create policy "Owner update quotes" on public.quotes for update to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id)) with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Owner delete quotes" on public.quotes for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create policy "Owner read quote_items" on public.quote_items for select to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Owner insert quote_items" on public.quote_items for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Owner update quote_items" on public.quote_items for update to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id)) with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Owner delete quote_items" on public.quote_items for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));