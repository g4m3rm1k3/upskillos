---
title: 4 — Keep the write and its audit atomic
track: Backend Developer Bootcamp — Django — Service Desk
trackOrder: 51.02
runtime: none
---

Outcome: validate only editable fields and implement a protected state transition. The transaction owns both the status update and the audit insert.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Allowlist form fields

The form permits only subject. Fields such as owner and status are server-controlled even if a hostile request includes them. An explicit allowlist survives later model additions more safely than exposing every field.

```python file=tickets/forms.py
from django import forms
from .models import Ticket

class TicketForm(forms.ModelForm):
    class Meta:
        model = Ticket
        fields = ["subject"]
```


```predict
question: Should a failed audit insert leave the ticket closed?
choice: No
choice: Yes
answer: No
explain: The use case requires the transition and its audit to commit together.
```

## Implement the application service

The conditional UPDATE combines “is this still open and owned by this actor?” with changing it. Only one request can change the row from open to closed. The audit insert shares the transaction, so a failure there rolls back the status. A second close deliberately returns unavailable; this is a policy choice, not a universal REST rule.

Do not send email inside this transaction. A remote timeout holds database resources and cannot be rolled back. `transaction.on_commit` runs after commit, but a crash can still lose the notification; reliable delivery requires a durable outbox row and a retrying worker. Reference: [Django transactions](https://docs.djangoproject.com/en/5.2/topics/db/transactions/).

```python file=tickets/services.py
from django.db import transaction
from .models import Audit, Ticket

class Unavailable(Exception):
    pass

@transaction.atomic
def close_ticket(*, ticket_id, actor):
    changed = Ticket.objects.filter(pk=ticket_id, owner=actor, status="open").update(status="closed")
    if changed != 1:
        raise Unavailable("ticket unavailable")
    Audit.objects.create(ticket_id=ticket_id, actor=actor, action="closed")
```


## Coordinate HTTP

The view binds a form, supplies the authenticated user and chooses a response. GET reads; POST mutates. The list is filtered by owner before pagination, never after fetching someone else's records. Redirect-after-POST avoids accidental resubmission on refresh. `require_POST` rejects a GET-based close link, which could otherwise be triggered by crawlers or prefetching.

```python file=tickets/views.py
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.http import HttpResponse
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods, require_POST
from .forms import TicketForm
from .models import Ticket
from .services import close_ticket, Unavailable

@login_required
@require_http_methods(["GET", "POST"])
def index(request):
    form = TicketForm(request.POST if request.method == "POST" else None)
    if request.method == "POST" and form.is_valid():
        ticket = form.save(commit=False)
        ticket.owner = request.user
        ticket.save()
        return redirect("/tickets/")
    page = Paginator(Ticket.objects.filter(owner=request.user).order_by("-id"), 20).get_page(request.GET.get("page"))
    return render(request, "tickets/index.html", {"form": form, "page": page},
                  status=422 if request.method == "POST" else 200)

@login_required
@require_POST
def close(request, ticket_id):
    try:
        close_ticket(ticket_id=ticket_id, actor=request.user)
    except Unavailable:
        return HttpResponse("ticket unavailable", status=404)
    return redirect("/tickets/")
```


## Connect routes

Routing maps URLs to handlers. A numeric URL id is not proof of permission. LoginView and LogoutView supply maintained session behavior; logout uses POST. No access is granted simply because a user is staff.

```python file=desk/urls.py
from django.urls import path
from django.contrib.auth.views import LoginView, LogoutView
from tickets import views
urlpatterns = [
    path("login/", LoginView.as_view(template_name="tickets/login.html")),
    path("logout/", LogoutView.as_view()),
    path("tickets/", views.index),
    path("tickets/<int:ticket_id>/close/", views.close),
]
```


## Your turn: add a staff transition deliberately

Design an “assign to technician” operation. Add a technician relation, an explicit permission check and an audit event in one transaction. Test ordinary employee denial, authorized assignment and audit-write rollback. Never infer authorization from a submitted is_staff field.

Write your evidence in `evidence/workflow.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/workflow.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If a ticket closes but the audit is absent, inspect transaction scope and exception handling. Explain why catching and swallowing a database exception inside an atomic block can hide the failure.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
