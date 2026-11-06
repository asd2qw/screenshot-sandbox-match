-- Phase 3 RLS / tenant isolation check for payments and materials.
-- Runs entirely inside one DO block and ALWAYS ends by raising an exception,
-- so every test row is rolled back: nothing is left in the database.
-- Run with the database query tool (needs a privileged connection) and read the
-- "RESULTADOS" message. Requires the first owner account to exist.
do $$
declare
  ca uuid; cb uuid; owner_a uuid; owner_b uuid := gen_random_uuid();
  wp uuid := gen_random_uuid(); wn uuid := gen_random_uuid();
  wa uuid; wb uuid; ma uuid; mb uuid; cla uuid; clb uuid;
   out text := ''; n int; st numeric;
begin
  select p.id, p.company_id into owner_a, ca from public.profiles p join public.user_roles r on r.user_id = p.id and r.role = 'owner' limit 1;
  if owner_a is null then raise exception 'No hay propietario'; end if;

  -- Second company with its own owner
  insert into public.companies(name) values ('Empresa B (prueba)') returning id into cb;
  insert into auth.users(id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
    values (owner_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ownerb@test.invalid', jsonb_build_object('company_id', cb), '{}');
  update public.user_roles set role = 'owner' where user_id = owner_b;

  -- Two workers in company A: with and without materials permission
  insert into auth.users(id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data) values
    (wp, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wp@test.invalid', jsonb_build_object('company_id', ca), '{}'),
    (wn, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'wn@test.invalid', jsonb_build_object('company_id', ca), '{}');
  update public.profiles set can_register_materials = true where id = wp;

  -- Data in both companies
  insert into public.clients(company_id, name) values (ca, 'Cliente A') returning id into cla;
  insert into public.clients(company_id, name) values (cb, 'Cliente B') returning id into clb;
  insert into public.works(company_id, name, client_id) values (ca, 'Obra A', cla) returning id into wa;
  insert into public.works(company_id, name, client_id) values (cb, 'Obra B', clb) returning id into wb;
  insert into public.work_assignments(company_id, work_id, worker_id) values (ca, wa, wp);
  insert into public.materials(company_id, name) values (ca, 'Cemento prueba') returning id into ma;
  insert into public.materials(company_id, name) values (cb, 'Arena prueba') returning id into mb;
  insert into public.stock_movements(company_id, material_id, kind, quantity, created_by) values (ca, ma, 'in', 10, owner_a);
  insert into public.stock_movements(company_id, material_id, kind, quantity, created_by) values (cb, mb, 'in', 99, owner_b);
  insert into public.payments(company_id, client_id, work_id, amount, created_by) values (ca, cla, wa, 100, owner_a);
  insert into public.payments(company_id, client_id, work_id, amount, created_by) values (cb, clb, wb, 999, owner_b);

  -- ===== Owner A =====
  perform set_config('request.jwt.claims', json_build_object('sub', owner_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.materials where company_id = cb; out := out || format('ownerA ve materiales de B: %s (esperado 0)|', n);
  select count(*) into n from public.payments where company_id = cb; out := out || format('ownerA ve pagos de B: %s (esperado 0)|', n);
  select count(*) into n from public.payments where company_id = ca and amount = 100; out := out || format('ownerA ve su pago: %s (esperado 1)|', n);
  insert into public.stock_movements(company_id, material_id, work_id, kind, quantity) values (ca, ma, wa, 'out', 4);
  select stock into st from public.material_stock(ca) where material_id = ma; out := out || format('stock tras entrada 10 y salida 4: %s (esperado 6)|', st);
  begin insert into public.stock_movements(company_id, material_id, kind, quantity) values (ca, ma, 'out', 7); out := out || 'salida mayor que stock: PERMITIDA (FALLO)|';
  exception when others then out := out || 'salida mayor que stock: bloqueada (OK)|'; end;
  begin insert into public.payments(company_id, amount) values (cb, 5); out := out || 'ownerA inserta pago en B: PERMITIDO (FALLO)|';
  exception when others then out := out || 'ownerA inserta pago en B: bloqueado (OK)|'; end;
  update public.payments set amount = 1 where company_id = cb; get diagnostics n = row_count; out := out || format('ownerA modifica pagos de B: %s filas (esperado 0)|', n);
  select count(*) into n from public.material_stock(cb); out := out || format('ownerA stock de B: %s filas (esperado 0)|', n);
  execute 'reset role';

  -- ===== Worker with materials permission =====
  perform set_config('request.jwt.claims', json_build_object('sub', wp, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.materials where company_id = ca; out := out || format('trabajador CON permiso ve materiales A: %s (esperado 1)|', n);
  select count(*) into n from public.materials where company_id = cb; out := out || format('trabajador CON permiso ve materiales B: %s (esperado 0)|', n);
  select count(*) into n from public.payments; out := out || format('trabajador CON permiso ve pagos: %s (esperado 0)|', n);
  select count(*) into n from public.clients; out := out || format('trabajador CON permiso ve clientes: %s (esperado 0)|', n);
  select count(*) into n from public.stock_movements; out := out || format('trabajador CON permiso ve movimientos ajenos: %s (esperado 0)|', n);
  insert into public.stock_movements(company_id, material_id, work_id, kind, quantity) values (ca, ma, wa, 'out', 1);
  select count(*) into n from public.stock_movements; out := out || format('trabajador CON permiso registra salida en su obra y la ve: %s (esperado 1)|', n);
  select stock into st from public.material_stock(ca) where material_id = ma; out := out || format('stock visto por trabajador: %s (esperado 5)|', st);
  begin insert into public.materials(company_id, name) values (ca, 'X'); out := out || 'trabajador crea material: PERMITIDO (FALLO)|';
  exception when others then out := out || 'trabajador crea material: bloqueado (OK)|'; end;
  begin insert into public.stock_movements(company_id, material_id, kind, quantity) values (cb, mb, 'out', 1); out := out || 'trabajador mueve stock de B: PERMITIDO (FALLO)|';
  exception when others then out := out || 'trabajador mueve stock de B: bloqueado (OK)|'; end;
  delete from public.stock_movements; get diagnostics n = row_count; out := out || format('trabajador borra movimientos: %s (esperado 0)|', n);
  execute 'reset role';

  -- ===== Worker without permission =====
  perform set_config('request.jwt.claims', json_build_object('sub', wn, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.materials; out := out || format('trabajador SIN permiso ve materiales: %s (esperado 0)|', n);
  select count(*) into n from public.material_stock(ca); out := out || format('trabajador SIN permiso ve stock: %s (esperado 0)|', n);
  select count(*) into n from public.payments; out := out || format('trabajador SIN permiso ve pagos: %s (esperado 0)|', n);
  select count(*) into n from public.works; out := out || format('trabajador SIN permiso ve obras no asignadas: %s (esperado 0)|', n);
  select count(*) into n from public.profiles; out := out || format('trabajador SIN permiso ve perfiles: %s (esperado 1, el suyo)|', n);
  begin insert into public.stock_movements(company_id, material_id, kind, quantity) values (ca, ma, 'in', 1); out := out || 'trabajador SIN permiso registra entrada: PERMITIDO (FALLO)|';
  exception when others then out := out || 'trabajador SIN permiso registra entrada: bloqueado (OK)|'; end;
  update public.profiles set can_register_materials = true where id = wn; get diagnostics n = row_count; out := out || format('trabajador se da permiso: %s filas (esperado 0)|', n);
  execute 'reset role';

  -- ===== Deactivated worker with permission =====
  update public.profiles set active = false where id = wp;
  perform set_config('request.jwt.claims', json_build_object('sub', wp, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.materials; out := out || format('trabajador desactivado ve materiales: %s (esperado 0)|', n);
  execute 'reset role';

  -- ===== Anonymous =====
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin select count(*) into n from public.payments; out := out || format('anónimo ve pagos: %s (esperado 0 o denegado)|', n);
  exception when others then out := out || 'anónimo ve pagos: denegado (OK)|'; end;
  execute 'reset role';

  raise exception 'RESULTADOS|%', out;
end $$;
