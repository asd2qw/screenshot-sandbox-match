-- Isolated test cluster only; never execute this fixture against Lovable Cloud.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (
 id uuid primary key, email text,
 raw_user_meta_data jsonb default '{}'::jsonb,
 raw_app_meta_data jsonb default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.role() returns text language sql stable as $$
 select nullif(current_setting('request.jwt.claim.role',true),'')
$$;
grant usage on schema auth to authenticated, service_role;
grant execute on all functions in schema auth to authenticated, service_role;