"""Course acceptance apparatus. Every case uses its own disposable PostgreSQL schema.

This is supplied test tooling, not the learner's application. It runs actual SQL,
connections, subprocesses and dump/restore tools; it does not simulate PostgreSQL.
"""
import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import uuid

import psycopg
from psycopg import sql

ROOT = Path.cwd()
sys.path.insert(0, str(ROOT))
schema = 'issue_probe_' + uuid.uuid4().hex
role = 'issue_reader_' + uuid.uuid4().hex
role_created = False


def connection():
    return psycopg.connect(autocommit=True, options=f'-c search_path={schema}')


def source(name):
    return (ROOT / name).read_text(encoding='utf-8')


def load(db, name):
    return db.execute(source(name))


def rejected(db, command, params=None, error=psycopg.IntegrityError):
    try:
        with db.transaction():
            db.execute(command, params)
    except error:
        return
    raise AssertionError('Expected rejection, but the write succeeded')


def scalar(db, command, params=None):
    return db.execute(command, params).fetchone()[0]


def module(name):
    return importlib.import_module(name)


def prepare_role(admin, db):
    global role_created
    admin.execute(sql.SQL('CREATE ROLE {} NOLOGIN').format(sql.Identifier(role)))
    role_created = True
    admin.execute(sql.SQL('GRANT USAGE ON SCHEMA {} TO {}').format(sql.Identifier(schema), sql.Identifier(role)))
    admin.execute(sql.SQL('GRANT SELECT ON ALL TABLES IN SCHEMA {} TO {}').format(sql.Identifier(schema), sql.Identifier(role)))
    admin.execute(sql.SQL('GRANT UPDATE ON {}.tickets TO {}').format(sql.Identifier(schema), sql.Identifier(role)))
    load(db, 'policies.sql')
    db.execute(sql.SQL('SET ROLE {}').format(sql.Identifier(role)))


def case(name, admin, db):
    if name == 'create':
        create = module('issue').create_ticket
        title = "O'Reilly'); DROP TABLE tickets; --"
        ticket_id = create(db, 10, title, None)
        assert scalar(db, 'SELECT title FROM tickets WHERE ticket_id=%s', (ticket_id,)) == title
        assert scalar(db, 'SELECT count(*) FROM tickets') == 5
        try:
            create(db, 10, '  ', 10)
        except ValueError:
            pass
        else:
            raise AssertionError('Blank title accepted')
    elif name == 'lookup':
        lookup = module('lookup').ticket_title
        assert lookup(db, 1) == 'Login'
        assert lookup(db, 987654) is None
    elif name == 'atomic':
        close = module('issue').close_ticket
        db.execute("ALTER TABLE ticket_events ADD CONSTRAINT injected_failure CHECK(new_status <> 'closed')")
        try:
            close(db, 1)
        except psycopg.CheckViolation:
            pass
        else:
            raise AssertionError('Injected write failure was hidden')
        assert db.execute('SELECT status,version FROM tickets WHERE ticket_id=1').fetchone() == ('open', 1)
        assert scalar(db, 'SELECT count(*) FROM ticket_events') == 0
        db.execute('ALTER TABLE ticket_events DROP CONSTRAINT injected_failure')
        close(db, 1)
        assert scalar(db, 'SELECT count(*) FROM ticket_events') == 1
    elif name == 'cli':
        env = dict(os.environ, PGOPTIONS=f'-c search_path={schema}')
        result = subprocess.run([sys.executable, 'cli.py', '10', 'CLI ticket'], env=env,
                                text=True, capture_output=True, check=True, timeout=15)
        ticket_id = int(result.stdout.strip())
        assert scalar(db, 'SELECT title FROM tickets WHERE ticket_id=%s', (ticket_id,)) == 'CLI ticket'
    elif name in ('optimistic', 'estimate'):
        fn = module('edits').rename_ticket if name == 'optimistic' else module('estimates').change_estimate
        column, first, second = ('title', 'Ada change', 'Ben change') if name == 'optimistic' else ('estimate_minutes', 45, 70)
        with connection() as other:
            with other.transaction():
                old_version = scalar(other, 'SELECT version FROM tickets WHERE ticket_id=1')
                assert fn(db, 1, old_version, first) == 2
                assert fn(other, 1, old_version, second) is None
        assert scalar(db, f'SELECT {column} FROM tickets WHERE ticket_id=1') == first
    elif name in ('snapshot', 'fresh'):
        with connection() as reader:
            with reader.transaction():
                load(reader, 'snapshot.sql' if name == 'snapshot' else 'fresh-snapshot.sql')
                before = scalar(reader, 'SELECT title FROM tickets WHERE ticket_id=1')
                db.execute("UPDATE tickets SET title='Committed elsewhere' WHERE ticket_id=1")
                after = scalar(reader, 'SELECT title FROM tickets WHERE ticket_id=1')
                assert before == 'Login'
                assert after == ('Login' if name == 'snapshot' else 'Committed elsewhere')
    elif name == 'lock':
        with connection() as contender:
            with db.transaction():
                db.execute('SELECT ticket_id FROM tickets WHERE ticket_id=1 FOR UPDATE')
                try:
                    with contender.transaction():
                        contender.execute("SET LOCAL lock_timeout='100ms'")
                        contender.execute("UPDATE tickets SET title='Waiting' WHERE ticket_id=1")
                except psycopg.errors.LockNotAvailable:
                    pass
                else:
                    raise AssertionError('Conflicting update did not wait for the row lock')
            contender.execute("UPDATE tickets SET title='Released' WHERE ticket_id=1")
            assert scalar(contender, 'SELECT title FROM tickets WHERE ticket_id=1') == 'Released'
    elif name == 'retry':
        attempts = []
        def operation(current):
            attempts.append(1)
            scalar(current, 'SELECT version FROM tickets WHERE ticket_id=1')
            current.execute("INSERT INTO ticket_events(ticket_id,new_status) VALUES(1,'open')")
            if len(attempts) == 1:
                db.execute('UPDATE tickets SET version=version+1 WHERE ticket_id=1')
            return current.execute('UPDATE tickets SET version=version+1 WHERE ticket_id=1 RETURNING version').fetchone()[0]
        result = module('retries').run_retry(connection, operation)
        assert result == 3 and len(attempts) == 2
        assert scalar(db, 'SELECT count(*) FROM ticket_events') == 1
    elif name == 'retry_limit':
        attempts = []
        def conflict(current):
            attempts.append(1)
            raise psycopg.errors.SerializationFailure('deliberate exhaustion probe')
        try:
            module('retries').run_retry(connection, conflict, attempts=2)
        except psycopg.errors.SerializationFailure:
            pass
        else:
            raise AssertionError('Retry exhaustion was swallowed')
        assert len(attempts) == 2
    elif name == 'visibility':
        visible = module('access').visible_tickets
        assert [row[0] for row in visible(db, 1, 10)] == [1, 2, 3]
        assert visible(db, 1, 30) == []
        assert [row[0] for row in visible(db, 2, 30)] == [4]
    elif name == 'authorization':
        close = module('access').close_for
        for actor, ticket in [(2, 1), (1, 4), (999, 1)]:
            try:
                close(db, actor, ticket)
            except PermissionError:
                pass
            else:
                raise AssertionError('Forbidden update succeeded')
        assert scalar(db, 'SELECT count(*) FROM ticket_events') == 0
        close(db, 1, 1)
        assert scalar(db, "SELECT status FROM tickets WHERE ticket_id=1") == 'closed'
        assert scalar(db, 'SELECT count(*) FROM ticket_events') == 1
    elif name == 'count_scope':
        count = module('counts').visible_count
        assert count(db, 1, 10) == 3
        assert count(db, 1, 30) == 0
        assert count(db, 2, 30) == 1
    elif name in ('rls', 'no_identity'):
        prepare_role(admin, db)
        with db.transaction():
            if name == 'no_identity':
                load(db, 'identity.sql')
                assert scalar(db, 'SELECT count(*) FROM tickets') == 0
            else:
                db.execute("SELECT set_config('app.user_id','1',true)")
                assert db.execute('SELECT ticket_id FROM tickets ORDER BY ticket_id').fetchall() == [(1,), (2,), (3,)]
                assert db.execute("UPDATE tickets SET title='Denied' WHERE ticket_id=4 RETURNING ticket_id").fetchone() is None
                rejected(db, 'UPDATE tickets SET project_id=30 WHERE ticket_id=1', error=psycopg.errors.InsufficientPrivilege)
                db.execute("SELECT set_config('app.user_id','2',true)")
                assert db.execute("UPDATE tickets SET title='Denied viewer' WHERE ticket_id=1 RETURNING ticket_id").fetchone() is None
                assert db.execute("UPDATE tickets SET title='Allowed' WHERE ticket_id=4 RETURNING ticket_id").fetchone() == (4,)
        db.execute('RESET ROLE')
    elif name == 'response':
        respond = module('responses').ticket_response
        status, body = respond(db, 1, 10)
        assert status == 200 and len(json.loads(body)['tickets']) == 3
        assert json.loads(respond(db, 1, 30)[1]) == {'tickets': []}
    elif name in ('expand', 'backfill', 'contract', 'remaining'):
        load(db, 'expand.sql')
        assert scalar(db, 'SELECT count(*) FROM tickets WHERE severity IS NULL') == 4
        if name == 'expand':
            new_id = module('issue').create_ticket(db, 10, 'Old client', 10)
            assert scalar(db, 'SELECT severity FROM tickets WHERE ticket_id=%s', (new_id,)) == 'normal'
        else:
            if name == 'remaining':
                assert load(db, 'remaining.sql').fetchone() == (4,)
            db.execute("UPDATE tickets SET severity='urgent' WHERE ticket_id=1")
            load(db, 'backfill.sql')
            assert scalar(db, 'SELECT count(*) FROM tickets WHERE severity IS NULL') == 1
            load(db, 'backfill.sql')
            load(db, 'backfill.sql')
            assert scalar(db, 'SELECT severity FROM tickets WHERE ticket_id=1') == 'urgent'
            assert scalar(db, 'SELECT count(*) FROM tickets WHERE severity IS NULL') == 0
            if name == 'remaining':
                assert load(db, 'remaining.sql').fetchone() == (0,)
            if name == 'contract':
                load(db, 'contract.sql')
                rejected(db, "UPDATE tickets SET severity=NULL WHERE ticket_id=1")
                rejected(db, "UPDATE tickets SET severity='unknown' WHERE ticket_id=1")
    elif name == 'migration':
        migrate = module('migrations').apply_migration
        script = 'ALTER TABLE tickets ADD COLUMN review_note TEXT;'
        assert migrate(db, 1, script) is True
        assert migrate(db, 1, script) is False
        try:
            migrate(db, 1, script + ' SELECT 1;')
        except ValueError:
            pass
        else:
            raise AssertionError('Changed published migration accepted')
        try:
            migrate(db, 2, 'ALTER TABLE tickets ADD COLUMN incomplete TEXT; SELECT no_such_column FROM tickets;')
        except psycopg.errors.UndefinedColumn:
            pass
        else:
            raise AssertionError('Failed migration reported success')
        assert scalar(db, 'SELECT count(*) FROM schema_migrations') == 1
        assert scalar(db, "SELECT count(*) FROM information_schema.columns WHERE table_schema=%s AND table_name='tickets' AND column_name='incomplete'", (schema,)) == 0
    elif name == 'performance':
        db.execute("INSERT INTO tickets(ticket_id,project_id,title,estimate_minutes,status,created_at) "
                   "SELECT 1000+g,CASE WHEN g%20=0 THEN 10 ELSE 30 END,'Generated',30,'open', "
                   "TIMESTAMPTZ '2026-01-01T00:00:00Z'+g*INTERVAL '1 minute' FROM generate_series(1,20000) g")
        db.execute('ANALYZE tickets')
        query = "SELECT ticket_id,title FROM tickets WHERE project_id=10 AND status='open' ORDER BY created_at,ticket_id LIMIT 20"
        before_rows = db.execute(query).fetchall()
        before = db.execute('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+query).fetchone()[0]
        load(db, 'inbox-index.sql')
        after = db.execute('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+query).fetchone()[0]
        assert db.execute(query).fetchall() == before_rows
        assert scalar(db, "SELECT count(*) FROM pg_indexes WHERE schemaname=%s AND indexname='ticket_inbox'", (schema,)) == 1
        print('Observed plans; timings are local measurements, not fixed assertions:')
        print(json.dumps({'before': before, 'after': after}, indent=2))
    elif name == 'index':
        load(db, 'assignee-index.sql')
        definition = scalar(db, "SELECT indexdef FROM pg_indexes WHERE schemaname=%s AND indexname='ticket_assignee'", (schema,))
        assert '(assignee_id)' in definition and 'WHERE' in definition and "'open'" in definition
        assert scalar(db, "SELECT count(*) FROM tickets WHERE assignee_id=1 AND status='open'") == 1
    elif name == 'restore':
        with tempfile.TemporaryDirectory(prefix='issue-backup-') as tmp:
            archive = str(Path(tmp)/'probe.dump')
            start = time.monotonic()
            subprocess.run(['pg_dump', '--format=custom', '--schema='+schema, '--file='+archive], check=True, capture_output=True, timeout=30)
            admin.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))
            subprocess.run(['pg_restore', '--exit-on-error', '--no-owner', '--dbname='+admin.info.dbname, archive], check=True, capture_output=True, timeout=30)
            assert scalar(db, 'SELECT count(*) FROM tickets') == 4
            assert scalar(db, 'SELECT count(*) FROM memberships') == 3
            rejected(db, "INSERT INTO tickets(project_id,title,status,created_at) VALUES(999,'Orphan','open',CURRENT_TIMESTAMP)")
            print(f'Restored isolated schema and constraints in {time.monotonic()-start:.3f}s')
    elif name == 'activity':
        rows = load(db, 'activity.sql').fetchall()
        assert all(len(row) == 4 for row in rows)
        assert any(row[0] == admin.info.backend_pid for row in rows)
    elif name == 'dependencies':
        load(db, 'dependencies.sql')
        db.execute('INSERT INTO ticket_dependencies VALUES(1,2),(1,3)')
        assert scalar(db, 'SELECT count(*) FROM ticket_dependencies') == 2
        for command in [
            'INSERT INTO ticket_dependencies VALUES(1,2)',
            'INSERT INTO ticket_dependencies VALUES(2,2)',
            'INSERT INTO ticket_dependencies VALUES(1,999)',
            'INSERT INTO ticket_dependencies VALUES(NULL,1)',
            'DELETE FROM tickets WHERE ticket_id=2',
        ]:
            rejected(db, command)
    else:
        raise ValueError('Unknown acceptance case: '+name)


if __name__ == '__main__':
    name = sys.argv[1]
    with psycopg.connect(autocommit=True) as admin:
        admin.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
        try:
            with connection() as db:
                load(db, 'pg-model.sql')
                load(db, 'sample.sql')
                case(name, admin, db)
            print('PASS '+name)
        finally:
            admin.execute(sql.SQL('DROP SCHEMA IF EXISTS {} CASCADE').format(sql.Identifier(schema)))
            if role_created:
                admin.execute(sql.SQL('DROP ROLE {}').format(sql.Identifier(role)))
