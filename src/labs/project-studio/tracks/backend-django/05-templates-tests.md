---
title: 5 — Render safely and test the real boundary
track: Backend Developer Bootcamp — Django — Service Desk
trackOrder: 51.02
runtime: none
---

Outcome: complete the server-rendered workflow and exercise sessions, CSRF, escaping, authorization and rollback.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Build the sign-in page

The CSRF tag inserts a request token. The framework supplies form labels, password handling and validation errors. A template is a representation; it must not decide whether an actor can close a ticket.

```html file=tickets/templates/tickets/login.html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Sign in to Service Desk</title></head>
<body><main><h1>Sign in</h1>
<form method="post">{% csrf_token %}{{ form.as_p }}<button>Sign in</button></form>
</main></body></html>
```


```predict
question: Does Django’s ordinary test client enforce CSRF by default?
choice: No
choice: Yes
answer: No
explain: Opt in with enforce_csrf_checks=True to test that middleware.
```

## Build the ticket page

Django escapes text by default, so a subject containing angle brackets is displayed as text. Marking untrusted content safe would undo this protection. Each mutation is a form with a CSRF token. Pagination bounds the amount of data rendered per request; later large datasets may need cursor pagination to avoid deep offsets.

```html file=tickets/templates/tickets/index.html
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Your tickets</title></head>
<body><main><h1>Your tickets</h1>
<form method="post">{% csrf_token %}{{ form.as_p }}<button>Create ticket</button></form>
<ul>{% for ticket in page %}
<li>{{ ticket.subject }} — {{ ticket.status }}
{% if ticket.status == 'open' %}
<form method="post" action="/tickets/{{ ticket.id }}/close/">{% csrf_token %}<button>Close ticket {{ ticket.id }}</button></form>
{% endif %}</li>
{% empty %}<li>No tickets yet</li>{% endfor %}</ul>
<nav aria-label="Ticket pages">
{% if page.has_previous %}<a href="?page={{ page.previous_page_number }}">Previous</a>{% endif %}
<span>Page {{ page.number }} of {{ page.paginator.num_pages }}</span>
{% if page.has_next %}<a href="?page={{ page.next_page_number }}">Next</a>{% endif %}
</nav>
<form method="post" action="/logout/">{% csrf_token %}<button>Sign out</button></form>
</main></body></html>
```


## Isolate test configuration from the terminal

Project Studio's Check my work starts a separate process; it does not inherit variables you exported inside an already running terminal. This explicitly selected test settings module supplies a test-only key when needed. It imports the same application settings, so middleware and validation stay under test. Never select this module for a deployed server.

```python file=desk/test_settings.py
import os
os.environ.setdefault("DJANGO_SECRET_KEY", "test-only-key-do-not-deploy")
from .settings import *
```

The automatic check calls the project's virtual-environment interpreter directly and passes `--settings=desk.test_settings`. The checker translates `.venv/Scripts/python` to `.venv/bin/python` on macOS/Linux. This does not depend on activating a different terminal's environment. Your manually running server still requires its real environment secret.

## Test security and transactional behavior

Django's default test client skips CSRF checks. The dedicated CSRF test opts in, otherwise a “passing security suite” would never exercise that boundary. force_login sets up identity for authorization tests; it does not prove the login flow or password policy. Add a separate real-login test when changing authentication.

The audit failure is injected at the external effect boundary, and the test then reloads the ticket from the real database. This verifies rollback instead of checking a mock call count. Reference: [Django test tools](https://docs.djangoproject.com/en/5.2/topics/testing/tools/).

```python file=tickets/tests.py
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from .models import Audit, Ticket
from .services import close_ticket, Unavailable

class DeskTests(TestCase):
    def setUp(self):
        self.alice = get_user_model().objects.create_user(username="alice", password="test-only-password")
        self.bob = get_user_model().objects.create_user(username="bob", password="test-only-password")
        self.ticket = Ticket.objects.create(owner=self.alice, subject="Monitor broken")

    def test_login_ownership_and_method(self):
        self.assertEqual(self.client.get("/tickets/").status_code, 302)
        self.client.force_login(self.bob)
        self.assertNotContains(self.client.get("/tickets/"), "Monitor broken")
        url = f"/tickets/{self.ticket.pk}/close/"
        self.assertEqual(self.client.post(url).status_code, 404)
        self.client.force_login(self.alice)
        self.assertEqual(self.client.get(url).status_code, 405)
        self.assertEqual(self.client.post(url).status_code, 302)
        self.assertEqual(self.client.post(url).status_code, 404)
        self.assertEqual(Audit.objects.count(), 1)

    def test_mass_assignment_and_escaping(self):
        self.client.force_login(self.alice)
        self.client.post("/tickets/", {"subject":"<script>alert(1)</script>", "owner":self.bob.pk, "status":"closed"})
        created = Ticket.objects.latest("id")
        self.assertEqual(created.owner, self.alice)
        self.assertEqual(created.status, "open")
        self.assertContains(self.client.get("/tickets/"), "&lt;script&gt;")
        self.assertEqual(self.client.post("/tickets/", {"subject":""}).status_code, 422)

    def test_csrf_is_enforced(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.alice)
        url = f"/tickets/{self.ticket.pk}/close/"
        self.assertEqual(client.post(url).status_code, 403)
        client.get("/tickets/")
        csrf = client.cookies["csrftoken"].value
        self.assertEqual(client.post(url, HTTP_X_CSRFTOKEN=csrf).status_code, 302)

    def test_audit_failure_rolls_back_status(self):
        with patch("tickets.services.Audit.objects.create", side_effect=RuntimeError("disk failure")):
            with self.assertRaises(RuntimeError):
                close_ticket(ticket_id=self.ticket.pk, actor=self.alice)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, "open")
        self.assertEqual(Audit.objects.count(), 0)

    def test_database_constraint_and_pagination(self):
        Ticket.objects.bulk_create([Ticket(owner=self.alice, subject=f"Issue {i}") for i in range(25)])
        self.client.force_login(self.alice)
        response = self.client.get("/tickets/")
        self.assertEqual(len(response.context["page"]), 20)
        self.assertContains(response, "Next")
```


## Run and inspect the browser workflow

Run `python manage.py test`, then `python manage.py runserver 127.0.0.1:8001`. Open `/login/`, sign in with the locally created account, create a ticket containing `<b>broken</b>`, and observe literal text. Close it and refresh. In browser Network inspect POST → redirect → GET. Sign out, then verify the list requires login. Stop the server with Ctrl+C. The browser check is manual; the in-process tests do not establish visual accessibility.

## Your turn: test login and query cost

Add tests for failed and successful login using client.login, and a rendered page with many tickets. Use assertNumQueries or CaptureQueriesContext to establish a query budget before adding technician names. Compare lazy relation access with select_related; demonstrate the N+1 query problem and its fix.

Write your evidence in `evidence/templates-tests.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/templates-tests.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Run the regression suite

Run from this project’s root with its tools installed. A nonzero exit means stop and read the first failure. These are finite tests; no manually running server is required.

```check
run ".venv/Scripts/python manage.py test --settings=desk.test_settings"
```

## Diagnose, explain and review

A template that hides a close button does not enforce permissions. Send the request directly and inspect persisted state. Explain why a mocked ORM cannot establish transaction rollback.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
