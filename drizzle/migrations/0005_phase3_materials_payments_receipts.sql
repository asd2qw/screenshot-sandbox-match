create function public.phase3_can_register_materials(_company uuid) returns boolean
language sql stable security definer set search_path = public as $$
 select public.phase2_active_member(_company) and (public.is_company_owner(_company) or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.company_id = _company and p.can_register_materials))
$$;
revoke all on function public.phase3_can_register_materials(uuid) from public, anon;
grant execute on function public.phase3_can_register_materials(uuid) to authenticated, service_role;

create table public.materials (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null check (btrim(name) <> ''),
 unit text not null default 'ud' check (btrim(unit) <> ''),
 min_stock numeric(12,3) not null default 0 check (min_stock >= 0),
 unit_cost numeric(12,2) check (unit_cost >= 0),
 active boolean not null default true,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (company_id, id), unique (company_id, name)
);
grant select, insert, update, delete on public.materials to authenticated;
grant all on public.materials to service_role;
alter table public.materials enable row level security;

create table public.stock_movements (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 material_id uuid not null,
 work_id uuid,
 kind text not null check (kind in ('in','out')),
 quantity numeric(12,3) not null check (quantity > 0 and quantity <= 1000000),
 movement_date date not null default current_date,
 notes text,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 foreign key (company_id, material_id) references public.materials(company_id, id) on delete restrict,
 foreign key (company_id, work_id) references public.works(company_id, id) on delete restrict
);
grant select, insert, delete on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
alter table public.stock_movements enable row level security;
create index stock_movements_material_idx on public.stock_movements(company_id, material_id);

-- Stock per material visible to anyone allowed to register materials (sums all movements).
create function public.material_stock(_company uuid) returns table(material_id uuid, stock numeric)
language sql stable security definer set search_path = public as $$
 select m.id, coalesce(sum(case when s.kind='in' then s.quantity else -s.quantity end),0)
 from public.materials m left join public.stock_movements s on s.company_id=m.company_id and s.material_id=m.id
 where m.company_id=_company and _company = public.current_company_id() and public.phase3_can_register_materials(_company)
 group by m.id
$$;
revoke all on function public.material_stock(uuid) from public, anon;
grant execute on function public.material_stock(uuid) to authenticated, service_role;

-- No negative stock: serialize per material and check before an outgoing movement.
create function public.stock_movements_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare cur numeric;
begin
 perform 1 from public.materials where company_id=new.company_id and id=new.material_id for update;
 if new.kind = 'out' then
  select coalesce(sum(case when kind='in' then quantity else -quantity end),0) into cur
  from public.stock_movements where company_id=new.company_id and material_id=new.material_id;
  if cur < new.quantity then raise exception 'Stock insuficiente (disponible: %)', cur; end if;
 end if;
 return new;
end $$;
create trigger stock_movements_guard before insert on public.stock_movements for each row execute function public.stock_movements_guard();

create function public.stock_movements_delete_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare cur numeric;
begin
 if old.kind = 'in' then
  perform 1 from public.materials where company_id=old.company_id and id=old.material_id for update;
  select coalesce(sum(case when kind='in' then quantity else -quantity end),0) into cur
  from public.stock_movements where company_id=old.company_id and material_id=old.material_id;
  if cur < old.quantity then raise exception 'No se puede borrar: el stock quedaría negativo'; end if;
 end if;
 return old;
end $$;
create trigger stock_movements_delete_guard before delete on public.stock_movements for each row execute function public.stock_movements_delete_guard();

create trigger materials_guard before update on public.materials for each row execute function public.quotes_guard();

create policy "Read materials" on public.materials for select to authenticated using (company_id = public.current_company_id() and public.phase3_can_register_materials(company_id));
create policy "Owner insert materials" on public.materials for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id) and created_by = auth.uid());
create policy "Owner update materials" on public.materials for update to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id)) with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Owner delete materials" on public.materials for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create policy "Read movements" on public.stock_movements for select to authenticated using (company_id = public.current_company_id() and (public.phase2_owner(company_id) or (created_by = auth.uid() and public.phase3_can_register_materials(company_id))));
create policy "Insert movements" on public.stock_movements for insert to authenticated with check (company_id = public.current_company_id() and created_by = auth.uid() and public.phase3_can_register_materials(company_id) and (work_id is null or public.phase2_work_visible(company_id, work_id)));
create policy "Owner delete movements" on public.stock_movements for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create table public.payments (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 client_id uuid, quote_id uuid, work_id uuid,
 amount numeric(12,2) not null check (amount > 0 and amount <= 10000000),
 payment_date date not null default current_date,
 method text not null default 'transfer' check (method in ('transfer','cash','card','bizum','check','other')),
 reference text, notes text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key (company_id, client_id) references public.clients(company_id, id) on delete restrict,
 foreign key (company_id, quote_id) references public.quotes(company_id, id) on delete restrict,
 foreign key (company_id, work_id) references public.works(company_id, id) on delete restrict
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create index payments_company_idx on public.payments(company_id, payment_date desc);
create trigger payments_guard before update on public.payments for each row execute function public.quotes_guard();
create policy "Owner read payments" on public.payments for select to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Owner insert payments" on public.payments for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id) and created_by = auth.uid());
create policy "Owner update payments" on public.payments for update to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id)) with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Owner delete payments" on public.payments for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

alter table public.expenses add column vat_amount numeric(12,2) check (vat_amount >= 0);
alter table public.expenses add column receipt_path text;

create policy "Receipts upload" on storage.objects for insert to authenticated with check (
 bucket_id = 'receipts' and (storage.foldername(name))[1] = public.current_company_id()::text
 and (storage.foldername(name))[2] = auth.uid()::text and public.phase3_can_register_expenses(public.current_company_id()));
create policy "Receipts read" on storage.objects for select to authenticated using (
 bucket_id = 'receipts' and (storage.foldername(name))[1] = public.current_company_id()::text
 and (public.phase2_owner(public.current_company_id()) or ((storage.foldername(name))[2] = auth.uid()::text and public.phase3_can_register_expenses(public.current_company_id()))));
create policy "Receipts owner delete" on storage.objects for delete to authenticated using (
 bucket_id = 'receipts' and (storage.foldername(name))[1] = public.current_company_id()::text and public.phase2_owner(public.current_company_id()));