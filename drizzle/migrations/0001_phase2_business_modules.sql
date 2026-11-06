-- REVIEW ONLY: not applied, not registered in the migration journal.
-- Apply byte-for-byte through Lovable Cloud migration tool after separate approval.
-- Historical creator UUIDs intentionally have no profile FK: deletion preserves attribution.
alter table public.profiles add constraint profiles_phase2_company_id_id unique (company_id, id);

create table public.clients (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null check (btrim(name) <> ''),
client_type text not null default 'person' check (client_type in ('person','company')),
legal_name text, tax_id text, contact_name text, email text, phone text, address text, notes text,
active boolean not null default true,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (company_id,id)
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;
create index clients_phase2_company_idx on public.clients(company_id);

create table public.works (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 client_id uuid, name text not null check (btrim(name) <> ''), description text, address text,
status text not null default 'planned' check (status in ('planned','in_progress','on_hold','completed','cancelled')),
planned_start_date date, planned_end_date date,
check (planned_end_date >= planned_start_date),
foreign key (company_id, client_id) references public.clients(company_id,id) on delete restrict,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (company_id,id)
);
grant select, insert, update, delete on public.works to authenticated;
grant all on public.works to service_role;
alter table public.works enable row level security;
create index works_phase2_company_idx on public.works(company_id);

create table public.work_tasks (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 work_id uuid not null, title text not null check (btrim(title) <> ''), description text,
status text not null default 'pending' check (status in ('pending','planned','in_progress','blocked','completed','cancelled')),
priority smallint not null default 2 check (priority between 1 and 3),
planned_start_at timestamptz, planned_end_at timestamptz, completed_at timestamptz,
check (planned_end_at >= planned_start_at),
unique (company_id,id,work_id),
foreign key (company_id,work_id) references public.works(company_id,id) on delete restrict,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (company_id,id)
);
grant select, insert, update, delete on public.work_tasks to authenticated;
grant all on public.work_tasks to service_role;
alter table public.work_tasks enable row level security;
create index work_tasks_phase2_company_idx on public.work_tasks(company_id);

create table public.calendar_events (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 work_id uuid, work_task_id uuid, title text not null check (btrim(title) <> ''), description text,
starts_at timestamptz not null, ends_at timestamptz not null, all_day boolean not null default false,
status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
check (ends_at > starts_at), check (work_task_id is null or work_id is not null),
foreign key (company_id,work_id) references public.works(company_id,id) on delete restrict,
foreign key (company_id,work_task_id,work_id) references public.work_tasks(company_id,id,work_id) on delete restrict,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (company_id,id)
);
grant select, insert, update, delete on public.calendar_events to authenticated;
grant all on public.calendar_events to service_role;
alter table public.calendar_events enable row level security;
create index calendar_events_phase2_company_idx on public.calendar_events(company_id);

create table public.work_assignments (
 company_id uuid not null references public.companies(id) on delete cascade,
 work_id uuid not null, worker_id uuid not null, worker_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key (company_id,work_id,worker_id),
 foreign key (company_id,work_id) references public.works(company_id,id) on delete cascade,
 foreign key (company_id,worker_id) references public.profiles(company_id,id) on delete cascade
);
grant select, insert, update, delete on public.work_assignments to authenticated;
grant all on public.work_assignments to service_role;
alter table public.work_assignments enable row level security;
create index work_assignments_phase2_worker_idx on public.work_assignments(company_id,worker_id,work_id);

create table public.task_assignments (
 company_id uuid not null references public.companies(id) on delete cascade,
 task_id uuid not null, worker_id uuid not null, worker_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key (company_id,task_id,worker_id),
 foreign key (company_id,task_id) references public.work_tasks(company_id,id) on delete cascade,
 foreign key (company_id,worker_id) references public.profiles(company_id,id) on delete cascade
);
grant select, insert, update, delete on public.task_assignments to authenticated;
grant all on public.task_assignments to service_role;
alter table public.task_assignments enable row level security;
create index task_assignments_phase2_worker_idx on public.task_assignments(company_id,worker_id,task_id);

create table public.event_assignments (
 company_id uuid not null references public.companies(id) on delete cascade,
 event_id uuid not null, worker_id uuid not null, worker_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key (company_id,event_id,worker_id),
 foreign key (company_id,event_id) references public.calendar_events(company_id,id) on delete cascade,
 foreign key (company_id,worker_id) references public.profiles(company_id,id) on delete cascade
);
grant select, insert, update, delete on public.event_assignments to authenticated;
grant all on public.event_assignments to service_role;
alter table public.event_assignments enable row level security;
create index event_assignments_phase2_worker_idx on public.event_assignments(company_id,worker_id,event_id);

-- Identity is always taken from the validated request, never a caller-provided UUID.
create function public.phase2_active_member(_company uuid) returns boolean
language sql stable security definer set search_path = public as $$
 select exists (select 1 from public.profiles p join public.user_roles r on r.user_id=p.id and r.company_id=p.company_id
 where p.id=auth.uid() and p.company_id=_company and p.active and r.role in ('owner','worker'))
$$;
create function public.phase2_owner(_company uuid) returns boolean
language sql stable security definer set search_path = public as $$
 select public.phase2_active_member(_company) and public.is_company_owner(_company)
$$;

create function public.phase2_task_assigned(_company uuid, _id uuid) returns boolean
language sql stable security definer set search_path = public as $$
 select public.phase2_active_member(_company) and exists
 (select 1 from public.task_assignments where company_id=_company and task_id=_id and worker_id=auth.uid())
$$;

create function public.phase2_event_assigned(_company uuid, _id uuid) returns boolean
language sql stable security definer set search_path = public as $$
 select public.phase2_active_member(_company) and exists
 (select 1 from public.event_assignments where company_id=_company and event_id=_id and worker_id=auth.uid())
$$;

create function public.phase2_work_visible(_company uuid, _id uuid) returns boolean
language sql stable security definer set search_path = public as $$
 select public.phase2_active_member(_company) and (
 public.is_company_owner(_company)
 or exists (select 1 from public.work_assignments where company_id=_company and work_id=_id and worker_id=auth.uid())
 or exists (select 1 from public.task_assignments a join public.work_tasks t on t.company_id=a.company_id and t.id=a.task_id
 where a.company_id=_company and t.work_id=_id and a.worker_id=auth.uid())
 or exists (select 1 from public.event_assignments a join public.calendar_events e on e.company_id=a.company_id and e.id=a.event_id
 where a.company_id=_company and e.work_id=_id and a.worker_id=auth.uid()))
$$;

revoke all on function public.phase2_active_member(uuid) from public, anon;
grant execute on function public.phase2_active_member(uuid) to authenticated, service_role;

revoke all on function public.phase2_owner(uuid) from public, anon;
grant execute on function public.phase2_owner(uuid) to authenticated, service_role;

revoke all on function public.phase2_task_assigned(uuid,uuid) from public, anon;
grant execute on function public.phase2_task_assigned(uuid,uuid) to authenticated, service_role;

revoke all on function public.phase2_event_assigned(uuid,uuid) from public, anon;
grant execute on function public.phase2_event_assigned(uuid,uuid) to authenticated, service_role;

revoke all on function public.phase2_work_visible(uuid,uuid) from public, anon;
grant execute on function public.phase2_work_visible(uuid,uuid) to authenticated, service_role;

-- No bypass based on JWT role or trigger nesting is needed for profile deletion.
-- Creator identifiers are historical UUIDs. Only assignment rows cascade away.
create function public.phase2_record_guard() returns trigger language plpgsql set search_path = public as $$
begin
 if new.id is distinct from old.id or new.company_id is distinct from old.company_id
 or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
  raise exception 'No se puede cambiar la identidad de un registro';
 end if;
 if not public.phase2_owner(old.company_id) then
  if tg_table_name not in ('work_tasks','calendar_events') then
   raise exception 'Solo el propietario puede editar este registro';
  end if;
  if (to_jsonb(new) - array['status','completed_at','updated_at']) is distinct from
     (to_jsonb(old) - array['status','completed_at','updated_at']) then
   raise exception 'Los trabajadores solo pueden cambiar el estado';
  end if;
 end if;
 if tg_table_name = 'work_tasks' then
  if new.status = 'completed' then
   new.completed_at := case when old.status = 'completed' then old.completed_at else now() end;
  else new.completed_at := null;
  end if;
 end if;
 new.updated_at := now(); return new;
end $$;
create function public.phase2_assignment_guard() returns trigger language plpgsql set search_path = public as $$
begin
 if (to_jsonb(new) - array['worker_notes','updated_at']) is distinct from
    (to_jsonb(old) - array['worker_notes','updated_at']) then
  raise exception 'No se puede cambiar la identidad de una asignacion';
 end if;
 new.updated_at := now(); return new;
end $$;
-- Owner-only inserts via RLS; verify assignee is an active worker of this company.
create function public.phase2_assignment_insert_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
 if not exists (select 1 from public.profiles p join public.user_roles r on r.user_id=p.id and r.company_id=p.company_id
 where p.id=new.worker_id and p.company_id=new.company_id and p.active and r.role='worker') then
  raise exception 'La asignacion requiere un trabajador activo de la empresa';
 end if;
 return new;
end $$;

create trigger clients_phase2_guard before update on public.clients for each row execute function public.phase2_record_guard();

create trigger works_phase2_guard before update on public.works for each row execute function public.phase2_record_guard();

create trigger work_tasks_phase2_guard before update on public.work_tasks for each row execute function public.phase2_record_guard();

create trigger calendar_events_phase2_guard before update on public.calendar_events for each row execute function public.phase2_record_guard();

create trigger work_assignments_phase2_guard before update on public.work_assignments for each row execute function public.phase2_assignment_guard();
create trigger work_assignments_phase2_insert_guard before insert on public.work_assignments for each row execute function public.phase2_assignment_insert_guard();

create trigger task_assignments_phase2_guard before update on public.task_assignments for each row execute function public.phase2_assignment_guard();
create trigger task_assignments_phase2_insert_guard before insert on public.task_assignments for each row execute function public.phase2_assignment_insert_guard();

create trigger event_assignments_phase2_guard before update on public.event_assignments for each row execute function public.phase2_assignment_guard();
create trigger event_assignments_phase2_insert_guard before insert on public.event_assignments for each row execute function public.phase2_assignment_insert_guard();

create policy "Phase2 read clients" on public.clients for select to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Phase2 insert clients" on public.clients for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id) and created_by = auth.uid());
create policy "Phase2 update clients" on public.clients for update to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id)) with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Phase2 delete clients" on public.clients for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create policy "Phase2 read works" on public.works for select to authenticated using (company_id = public.current_company_id() and public.phase2_work_visible(company_id,id));
create policy "Phase2 insert works" on public.works for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id) and created_by = auth.uid());
create policy "Phase2 update works" on public.works for update to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id)) with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Phase2 delete works" on public.works for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create policy "Phase2 read work_tasks" on public.work_tasks for select to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or public.phase2_task_assigned(company_id,id)));
create policy "Phase2 insert work_tasks" on public.work_tasks for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id) and created_by = auth.uid());
create policy "Phase2 update work_tasks" on public.work_tasks for update to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or public.phase2_task_assigned(company_id,id))) with check (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or public.phase2_task_assigned(company_id,id)));
create policy "Phase2 delete work_tasks" on public.work_tasks for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create policy "Phase2 read calendar_events" on public.calendar_events for select to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or public.phase2_event_assigned(company_id,id)));
create policy "Phase2 insert calendar_events" on public.calendar_events for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id) and created_by = auth.uid());
create policy "Phase2 update calendar_events" on public.calendar_events for update to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or public.phase2_event_assigned(company_id,id))) with check (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or public.phase2_event_assigned(company_id,id)));
create policy "Phase2 delete calendar_events" on public.calendar_events for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create policy "Phase2 read work_assignments" on public.work_assignments for select to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or worker_id=auth.uid()));
create policy "Phase2 insert work_assignments" on public.work_assignments for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Phase2 update work_assignments" on public.work_assignments for update to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or worker_id=auth.uid())) with check (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or worker_id=auth.uid()));
create policy "Phase2 delete work_assignments" on public.work_assignments for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create policy "Phase2 read task_assignments" on public.task_assignments for select to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or worker_id=auth.uid()));
create policy "Phase2 insert task_assignments" on public.task_assignments for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Phase2 update task_assignments" on public.task_assignments for update to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or worker_id=auth.uid())) with check (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or worker_id=auth.uid()));
create policy "Phase2 delete task_assignments" on public.task_assignments for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create policy "Phase2 read event_assignments" on public.event_assignments for select to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or worker_id=auth.uid()));
create policy "Phase2 insert event_assignments" on public.event_assignments for insert to authenticated with check (company_id = public.current_company_id() and public.phase2_owner(company_id));
create policy "Phase2 update event_assignments" on public.event_assignments for update to authenticated using (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or worker_id=auth.uid())) with check (company_id = public.current_company_id() and public.phase2_active_member(company_id) and (public.phase2_owner(company_id) or worker_id=auth.uid()));
create policy "Phase2 delete event_assignments" on public.event_assignments for delete to authenticated using (company_id = public.current_company_id() and public.phase2_owner(company_id));

create index work_tasks_phase2_work_idx on public.work_tasks(company_id,work_id,status);
create index calendar_events_phase2_time_idx on public.calendar_events(company_id,starts_at);
create index calendar_events_phase2_work_idx on public.calendar_events(company_id,work_id);
create index works_phase2_client_idx on public.works(company_id,client_id);
