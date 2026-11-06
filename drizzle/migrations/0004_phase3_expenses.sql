create function public.phase3_can_register_expenses(_company uuid) returns boolean
language sql stable security definer set search_path = public as $$
 select public.phase2_active_member(_company) and (public.is_company_owner(_company) or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.company_id = _company and p.can_register_expenses))
$$;
revoke all on function public.phase3_can_register_expenses(uuid) from public, anon;
grant execute on function public.phase3_can_register_expenses(uuid) to authenticated, service_role;

create table public.expenses (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 work_id uuid,
 expense_date date not null default current_date,
 category text not null default 'other' check (category in ('materials','fuel','tools','food','transport','subcontract','other')),
 description text not null check (btrim(description) <> ''),
 amount numeric(12,2) not null check (amount > 0 and amount <= 1000000),
 supplier text, notes text,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key (company_id, work_id) references public.works(company_id, id) on delete restrict
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create index expenses_company_idx on public.expenses(company_id, expense_date desc);

create function public.expenses_guard() returns trigger language plpgsql set search_path = public as $$
begin
 if new.id is distinct from old.id or new.company_id is distinct from old.company_id
 or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
  raise exception 'No se puede cambiar la identidad de un registro';
 end if;
 new.updated_at := now(); return new;
end $$;
create trigger expenses_guard before update on public.expenses for each row execute function public.expenses_guard();

create policy "Read expenses" on public.expenses for select to authenticated using (
 company_id = public.current_company_id() and (public.phase2_owner(company_id)
 or (created_by = auth.uid() and public.phase3_can_register_expenses(company_id))));
create policy "Insert expenses" on public.expenses for insert to authenticated with check (
 company_id = public.current_company_id() and created_by = auth.uid()
 and public.phase3_can_register_expenses(company_id)
 and (work_id is null or public.phase2_work_visible(company_id, work_id)));
create policy "Owner update expenses" on public.expenses for update to authenticated
 using (company_id = public.current_company_id() and public.phase2_owner(company_id))
 with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Owner delete expenses" on public.expenses for delete to authenticated
 using (company_id = public.current_company_id() and public.phase2_owner(company_id));