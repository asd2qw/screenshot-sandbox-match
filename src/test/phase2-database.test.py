"""Disposable PostgreSQL tests. Never reads PG* credentials or connects to Cloud.

Run: python3 src/test/phase2-database.test.py
Requires PostgreSQL 17 CLI tools; when root, launches them as the local lovable user.
"""
import os
import pwd
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class Phase2DatabaseTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = Path(tempfile.mkdtemp(prefix="phase2-test-", dir="/tmp"))
        cls.port = "55439"
        cls.user = pwd.getpwnam("lovable") if os.getuid() == 0 else pwd.getpwuid(os.getuid())
        os.chown(cls.directory, cls.user.pw_uid, cls.user.pw_gid)
        cls.socket = cls.directory / "socket"
        cls.socket.mkdir()
        os.chown(cls.socket, cls.user.pw_uid, cls.user.pw_gid)

        def demote():
            os.setgid(cls.user.pw_gid)
            os.setuid(cls.user.pw_uid)

        cls.demote = demote if os.getuid() == 0 else None
        # Remove hosted credentials from all child-process environments.
        cls.environment = {"PATH": os.environ["PATH"], "HOME": str(cls.directory), "LC_ALL": "C"}
        subprocess.run(["initdb", "-D", str(cls.directory / "data"), "-A", "trust", "--no-locale", "-E", "UTF8"],
                       env=cls.environment, preexec_fn=cls.demote, check=True, capture_output=True)
        subprocess.run(["pg_ctl", "-D", str(cls.directory / "data"), "-l", str(cls.directory / "postgres.log"),
                        "-o", f'-k {cls.socket} -p {cls.port} -h ""', "start"],
                       env=cls.environment, preexec_fn=cls.demote, check=True, capture_output=True)
        cls.command = ["psql", "-h", str(cls.socket), "-p", cls.port, "-U", cls.user.pw_name,
                       "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atq"]
        try:
            for path in ["src/test/phase2-bootstrap.sql", "drizzle/migrations/0000_migration.sql",
                         "docs/phase2/phase2-schema.review.sql"]:
                cls.sql((ROOT / path).read_text())
            cls.sql("""
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000001','owner@example.test');
insert into auth.users(id,email,raw_app_meta_data)
select '00000000-0000-0000-0000-000000000002','worker1@example.test',jsonb_build_object('company_id',id) from public.companies;
insert into auth.users(id,email,raw_app_meta_data)
select '00000000-0000-0000-0000-000000000003','worker2@example.test',jsonb_build_object('company_id',id) from public.companies;
insert into public.companies(id,name) values ('00000000-0000-0000-0000-000000000099','Other tenant');
insert into auth.users(id,email,raw_app_meta_data) values
('00000000-0000-0000-0000-000000000004','other@example.test','{"company_id":"00000000-0000-0000-0000-000000000099"}');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into public.clients(id,company_id,name) select '10000000-0000-0000-0000-000000000001',company_id,'Private contact' from public.profiles where id=auth.uid();
insert into public.works(id,company_id,client_id,name) select '20000000-0000-0000-0000-000000000001',company_id,'10000000-0000-0000-0000-000000000001','Assigned work' from public.profiles where id=auth.uid();
insert into public.works(id,company_id,name) select '20000000-0000-0000-0000-000000000002',company_id,'Hidden work' from public.profiles where id=auth.uid();
insert into public.work_tasks(id,company_id,work_id,title,created_by) select '30000000-0000-0000-0000-000000000001',company_id,'20000000-0000-0000-0000-000000000001','Shared task','00000000-0000-0000-0000-000000000002' from public.profiles where id=auth.uid();
insert into public.work_tasks(id,company_id,work_id,title) select '30000000-0000-0000-0000-000000000002',company_id,'20000000-0000-0000-0000-000000000001','Hidden sibling' from public.profiles where id=auth.uid();
insert into public.calendar_events(id,company_id,work_id,work_task_id,title,starts_at,ends_at,created_by) select '40000000-0000-0000-0000-000000000001',company_id,'20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Shared event','2026-11-01T10:00:00Z','2026-11-01T11:00:00Z','00000000-0000-0000-0000-000000000002' from public.profiles where id=auth.uid();
insert into public.calendar_events(id,company_id,title,starts_at,ends_at) select '40000000-0000-0000-0000-000000000002',company_id,'Hidden event','2026-11-02T10:00:00Z','2026-11-02T11:00:00Z' from public.profiles where id=auth.uid();
insert into public.work_assignments(company_id,work_id,worker_id) select company_id,'20000000-0000-0000-0000-000000000001',id from public.profiles where id in ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003');
insert into public.task_assignments(company_id,task_id,worker_id) select company_id,'30000000-0000-0000-0000-000000000001',id from public.profiles where id in ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003');
insert into public.event_assignments(company_id,event_id,worker_id) select company_id,'40000000-0000-0000-0000-000000000001',id from public.profiles where id in ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003');
""")
        except BaseException:
            cls.tearDownClass()
            raise

    @classmethod
    def tearDownClass(cls):
        subprocess.run(["pg_ctl", "-D", str(cls.directory / "data"), "stop", "-m", "immediate"],
                       env=cls.environment, preexec_fn=cls.demote, capture_output=True)
        shutil.rmtree(cls.directory)

    @classmethod
    def sql(cls, text, failure=False):
        result = subprocess.run(cls.command, input=text, text=True, capture_output=True, env=cls.environment)
        if failure:
            if result.returncode == 0:
                raise AssertionError("Forbidden operation succeeded")
            return result.stderr
        if result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout.strip().splitlines()

    def actor(self, body, user="2", failure=False, setup=""):
        return self.sql(f"""begin; {setup}
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000000{user}';
set local request.jwt.claim.role='authenticated';
{body} rollback;""", failure)

    def test_clients_owner_only(self):
        self.assertEqual(self.actor("select count(*) from public.clients;"), ["0"])
        self.assertEqual(self.actor("select count(*) from public.clients;", "1"), ["1"])

    def test_inactive_worker_reads_nothing(self):
        query = "select (select count(*) from public.works)+(select count(*) from public.work_tasks)+(select count(*) from public.calendar_events)+(select count(*) from public.work_assignments)+(select count(*) from public.task_assignments)+(select count(*) from public.event_assignments);"
        self.assertEqual(self.actor(query, setup="update public.profiles set active=false where id='00000000-0000-0000-0000-000000000002';"), ["0"])

    def test_inactive_worker_cannot_update(self):
        self.assertEqual(self.actor("with changed as (update public.work_tasks set status='completed' returning id) select count(*) from changed;", setup="update public.profiles set active=false where id='00000000-0000-0000-0000-000000000002';"), ["0"])

    def test_only_authorized_work_visible(self):
        self.assertEqual(self.actor("select id from public.works;"), ["20000000-0000-0000-0000-000000000001"])

    def test_no_sibling_task_or_event_access(self):
        self.assertEqual(self.actor("select count(*) from public.work_tasks; select count(*) from public.calendar_events;"), ["1", "1"])

    def test_multiple_assignees(self):
        for user in ["2", "3"]:
            self.assertEqual(self.actor("select count(*) from public.work_tasks; select count(*) from public.calendar_events;", user), ["1", "1"])

    def test_only_own_notes_visible(self):
        self.assertEqual(self.actor("select worker_id from public.task_assignments;"), ["00000000-0000-0000-0000-000000000002"])
        self.assertEqual(self.actor("with changed as (update public.task_assignments set worker_notes='Other notes' where worker_id='00000000-0000-0000-0000-000000000003' returning worker_id) select count(*) from changed;"), ["0"])

    def test_own_notes_editable(self):
        self.assertEqual(self.actor("update public.task_assignments set worker_notes='My notes'; select worker_notes from public.task_assignments;"), ["My notes"])

    def test_worker_status_editable(self):
        self.assertEqual(self.actor("update public.work_tasks set status='completed'; select status||','||(completed_at is not null)::text from public.work_tasks;"), ["completed,true"])
        self.assertEqual(self.actor("update public.calendar_events set status='completed'; select status from public.calendar_events;"), ["completed"])

    def test_worker_cannot_edit_title(self):
        self.actor("update public.work_tasks set title='Tampered';", failure=True)

    def test_worker_cannot_edit_schedule(self):
        self.actor("update public.calendar_events set starts_at='2026-11-01T09:00:00Z';", failure=True)

    def test_worker_cannot_reassign(self):
        self.actor("update public.task_assignments set worker_id='00000000-0000-0000-0000-000000000003';", failure=True)

    def test_worker_cannot_create_assignment(self):
        self.actor("insert into public.task_assignments(company_id,task_id,worker_id) select company_id,'30000000-0000-0000-0000-000000000002',auth.uid() from public.profiles where id=auth.uid();", failure=True)

    def test_tenant_reads_isolated(self):
        self.assertEqual(self.actor("select (select count(*) from public.works)+(select count(*) from public.work_tasks)+(select count(*) from public.calendar_events);", "4"), ["0"])

    def test_cross_tenant_client_link_rejected(self):
        self.sql("begin; insert into public.works(company_id,client_id,name) values ('00000000-0000-0000-0000-000000000099','10000000-0000-0000-0000-000000000001','Invalid'); rollback;", failure=True)

    def test_cross_tenant_assignment_rejected(self):
        self.actor("insert into public.task_assignments(company_id,task_id,worker_id) select company_id,'30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004' from public.profiles where id=auth.uid();", "1", failure=True)

    def test_creator_cannot_be_spoofed(self):
        self.actor("insert into public.clients(company_id,name,created_by) select company_id,'Spoof','00000000-0000-0000-0000-000000000002' from public.profiles where id=auth.uid();", "1", failure=True)

    def test_creator_immutable(self):
        self.actor("update public.work_tasks set created_by=auth.uid();", "1", failure=True)

    def test_task_event_work_must_match(self):
        self.actor("update public.calendar_events set work_id='20000000-0000-0000-0000-000000000002' where id='40000000-0000-0000-0000-000000000001';", "1", failure=True)

    def test_delete_without_claims_preserves_records_and_other_assignees(self):
        result = self.sql("""begin;
delete from auth.users where id='00000000-0000-0000-0000-000000000002';
select count(*) from public.work_assignments;
select count(*) from public.task_assignments;
select count(*) from public.event_assignments;
select count(*) from public.work_tasks where created_by='00000000-0000-0000-0000-000000000002';
select count(*) from public.calendar_events where created_by='00000000-0000-0000-0000-000000000002';
select count(*) from public.works;
rollback;""")
        self.assertEqual(result, ["1", "1", "1", "1", "1", "2"])

    def test_task_assignment_grants_work_access_without_direct_assignment(self):
        self.assertEqual(self.actor("select count(*) from public.works;", setup="delete from public.work_assignments;"), ["1"])

    def test_event_assignment_grants_work_access_without_other_assignment(self):
        self.assertEqual(self.actor("select count(*) from public.works;", setup="delete from public.work_assignments; delete from public.task_assignments;"), ["1"])

    def test_access_disappears_after_all_assignments_removed(self):
        self.assertEqual(self.actor("select count(*) from public.works;", setup="delete from public.work_assignments; delete from public.task_assignments; delete from public.event_assignments;"), ["0"])

    def test_completion_timestamp_cannot_be_forged(self):
        self.assertEqual(self.actor("update public.work_tasks set status='completed',completed_at='2000-01-01T00:00:00Z'; select (completed_at > '2026-01-01T00:00:00Z')::text from public.work_tasks;"), ["true"])

    def test_completed_timestamp_is_preserved_on_repeated_completion(self):
        self.assertEqual(self.actor("update public.work_tasks set status='completed'; update public.work_tasks set completed_at='2000-01-01T00:00:00Z'; select (completed_at > '2026-01-01T00:00:00Z')::text from public.work_tasks;"), ["true"])

    def test_noncompleted_task_cannot_have_completion_timestamp(self):
        self.assertEqual(self.actor("update public.work_tasks set status='in_progress',completed_at='2000-01-01T00:00:00Z'; select (completed_at is null)::text from public.work_tasks;"), ["true"])

    def test_worker_cannot_delete_assignments(self):
        for table in ["work_assignments", "task_assignments", "event_assignments"]:
            with self.subTest(table=table):
                self.assertEqual(self.actor(f"with changed as (delete from public.{table} returning worker_id) select count(*) from changed;"), ["0"])

    def test_owner_can_remove_assignments(self):
        for table in ["work_assignments", "task_assignments", "event_assignments"]:
            with self.subTest(table=table):
                self.assertEqual(self.actor(f"with changed as (delete from public.{table} returning worker_id) select count(*) from changed;", "1"), ["2"])

    def test_all_creator_fields_immutable(self):
        for table in ["clients", "works", "work_tasks", "calendar_events"]:
            with self.subTest(table=table):
                self.actor(f"update public.{table} set created_by='00000000-0000-0000-0000-000000000003';", "1", failure=True)

    def test_creator_insert_spoofing_rejected_for_all_records(self):
        queries = [
            "insert into public.works(company_id,name,created_by) select company_id,'Spoof','00000000-0000-0000-0000-000000000002' from public.profiles where id=auth.uid();",
            "insert into public.work_tasks(company_id,work_id,title,created_by) select company_id,'20000000-0000-0000-0000-000000000001','Spoof','00000000-0000-0000-0000-000000000002' from public.profiles where id=auth.uid();",
            "insert into public.calendar_events(company_id,title,starts_at,ends_at,created_by) select company_id,'Spoof','2026-11-01T10:00:00Z','2026-11-01T11:00:00Z','00000000-0000-0000-0000-000000000002' from public.profiles where id=auth.uid();",
        ]
        for query in queries:
            with self.subTest(query=query):
                self.actor(query, "1", failure=True)

    def test_referenced_work_cannot_be_deleted(self):
        self.actor("delete from public.works where id='20000000-0000-0000-0000-000000000001';", "1", failure=True)

    def test_task_referenced_by_event_cannot_be_deleted(self):
        self.actor("delete from public.work_tasks where id='30000000-0000-0000-0000-000000000001';", "1", failure=True)

    def test_deleting_event_cascades_only_its_assignments(self):
        self.assertEqual(self.actor("delete from public.calendar_events where id='40000000-0000-0000-0000-000000000001'; select count(*) from public.event_assignments; select count(*) from public.task_assignments;", "1"), ["0", "2"])

    def test_deleting_unreferenced_task_cascades_assignments(self):
        self.assertEqual(self.actor("delete from public.calendar_events; delete from public.work_tasks where id='30000000-0000-0000-0000-000000000001'; select count(*) from public.task_assignments; select count(*) from public.work_assignments;", "1"), ["0", "2"])

    def test_deleting_unreferenced_work_cascades_assignments(self):
        self.assertEqual(self.actor("delete from public.calendar_events; delete from public.work_tasks; delete from public.works where id='20000000-0000-0000-0000-000000000001'; select count(*) from public.work_assignments;", "1"), ["0"])

    def test_inactive_owner_cannot_manage_records(self):
        self.assertEqual(self.actor("with changed as (update public.works set name='Forbidden' returning id) select count(*) from changed;", "1", setup="update public.profiles set active=false where id='00000000-0000-0000-0000-000000000001';"), ["0"])

    def test_assignment_requires_active_worker(self):
        self.actor("insert into public.task_assignments(company_id,task_id,worker_id) select company_id,'30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002' from public.profiles where id=auth.uid();", "1", failure=True, setup="update public.profiles set active=false where id='00000000-0000-0000-0000-000000000002';")


if __name__ == "__main__":
    unittest.main(verbosity=2)