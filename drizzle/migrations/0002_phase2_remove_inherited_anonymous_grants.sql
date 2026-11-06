-- Hosted default privileges granted anon more than the approved auth-only schema needs.
-- RLS already denies anon; explicitly remove inherited privileges as defense in depth.
revoke all on table public.clients, public.works, public.work_tasks, public.calendar_events, public.work_assignments, public.task_assignments, public.event_assignments from anon;
