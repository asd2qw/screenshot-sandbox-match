create type public.app_role as enum ('owner', 'worker');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi empresa',
  legal_name text,
  tax_id text,
  address text,
  phone text,
  email text,
  invoice_prefix text not null default 'F',
  default_vat numeric(5,2) not null default 21,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  active boolean not null default true,
  can_register_expenses boolean not null default false,
  can_register_materials boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles(company_id);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
create index on public.user_roles(company_id);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid,
  entity text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log(company_id, created_at desc);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;

-- Helpers
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_company_owner(_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles
    where user_id = auth.uid() and company_id = _company_id and role = 'owner')
$$;

create or replace function public.company_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies)
$$;
grant execute on function public.company_exists() to anon, authenticated;

-- Policies
create policy "Members read own company" on public.companies for select to authenticated
  using (id = public.current_company_id());
create policy "Owner updates company" on public.companies for update to authenticated
  using (public.is_company_owner(id)) with check (public.is_company_owner(id));

create policy "Read own profile or owner reads company" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_company_owner(company_id));
create policy "Owner updates company profiles" on public.profiles for update to authenticated
  using (public.is_company_owner(company_id)) with check (public.is_company_owner(company_id));

create policy "Read own roles or owner reads company" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_company_owner(company_id));

create policy "Owner reads audit" on public.audit_log for select to authenticated
  using (public.is_company_owner(company_id));

-- Owner cannot change company_id of a profile
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.company_id <> old.company_id or new.id <> old.id then
    raise exception 'No se puede cambiar la empresa de un perfil';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

-- Max 15 workers per company
create or replace function public.enforce_worker_limit()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role = 'worker' and (select count(*) from public.user_roles
      where company_id = new.company_id and role = 'worker') >= 15 then
    raise exception 'Límite de 15 trabajadores alcanzado';
  end if;
  return new;
end $$;
create trigger enforce_worker_limit before insert on public.user_roles
  for each row execute function public.enforce_worker_limit();

-- Signup handling: first user creates the company as owner.
-- Workers are created server-side with app_metadata.company_id (not user-editable).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _company uuid;
  _name text := coalesce(new.raw_user_meta_data->>'full_name', '');
begin
  if new.raw_app_meta_data ? 'company_id' then
    _company := (new.raw_app_meta_data->>'company_id')::uuid;
    insert into public.profiles(id, company_id, full_name, email, phone)
      values (new.id, _company, _name, new.email, new.raw_app_meta_data->>'phone');
    insert into public.user_roles(user_id, company_id, role) values (new.id, _company, 'worker');
  elsif not exists (select 1 from public.companies) then
    insert into public.companies(name) values ('Mi empresa') returning id into _company;
    insert into public.profiles(id, company_id, full_name, email)
      values (new.id, _company, _name, new.email);
    insert into public.user_roles(user_id, company_id, role) values (new.id, _company, 'owner');
  else
    raise exception 'El registro público está cerrado. Pide al propietario que cree tu cuenta.';
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();