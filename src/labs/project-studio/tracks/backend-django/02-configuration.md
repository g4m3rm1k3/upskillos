---
title: 2 — Sessions and configuration are architecture
track: Backend Developer Bootcamp — Django — Service Desk
trackOrder: 51.02
runtime: none
---

Outcome: require a secret, configure middleware intentionally and distinguish local HTTP from deployment settings.

### The story so far

Continue in this framework’s project folder, after the preceding lesson. Keep earlier files unless a step explicitly replaces one. Each file block shows its complete contents.

## Configure the project

Settings fail closed when DJANGO_SECRET_KEY is missing. Generate a random value with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Set it in this terminal using `export DJANGO_SECRET_KEY=...` or PowerShell `$env:DJANGO_SECRET_KEY = '...'`. Do not commit the value. For loopback development only set `DESK_DEBUG=1` (`export DESK_DEBUG=1` or `$env:DESK_DEBUG='1'`). This permits cookies over local HTTP; with debug off secure cookies require HTTPS.

Middleware order is meaningful: the session must exist before authentication can read it. CSRF protects cookie-authenticated state changes because a browser automatically attaches cookies. HttpOnly limits JavaScript access to the session cookie, but does not prevent all XSS. SameSite is defense in depth, not a replacement for a CSRF token.

The database stores users once and tickets reference their identities. Database sessions support invalidation; signing keys, browser cookies and password hashes solve different problems. Django's authentication code handles password hashing; do not write your own.

```python file=desk/settings.py
import os
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
DEBUG = os.getenv("DESK_DEBUG", "0") == "1"
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "testserver"]
INSTALLED_APPS = [
    "django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions", "tickets",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]
ROOT_URLCONF = "desk.urls"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [], "APP_DIRS": True,
    "OPTIONS": {"context_processors": ["django.template.context_processors.request", "django.contrib.auth.context_processors.auth"]}}]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "desk.db"}}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"
LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/tickets/"
LOGOUT_REDIRECT_URL = "/login/"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
```


```predict
question: Does an HttpOnly session cookie eliminate CSRF?
choice: No
choice: Yes
answer: No
explain: The browser can still attach the cookie to a forged request.
```

## Start with an empty route table

The generated project includes an admin route, but this project does not install the admin application. Replace that scaffold route now; otherwise Django's system check tries to import an application we did not enable. Feature routes arrive with their views later.

```python file=desk/urls.py
urlpatterns = []
```

## Understand configuration scope

The generated manage.py and desk/wsgi.py select `desk.settings`; they do not load an arbitrary `.env` file automatically. Environment variables must be present in the process running each command. Run `python manage.py check`. Expected: no system-check errors. We will add feature routes after their views exist.

For deployment use separate environment-specific settings, explicit hostnames, TLS and correct trusted proxy handling. Do not set `ALLOWED_HOSTS=["*"]` to hide a Host-header problem. The testserver name is only for the local test client and should not be in your production host list.

## Your turn: show a configuration failure

Unset DJANGO_SECRET_KEY in a disposable terminal and run the check. Confirm startup fails. Restore it. Explain why silently using a default production secret is worse than failing startup. Record the error category without recording the secret.

Write your evidence in `evidence/configuration.txt`: command, observed result, explanation, and one new counterexample. This file check is a submission gate only; review the behavior and reasoning yourself.

```check
file evidence/configuration.txt
```

```hints
nudge: Start with the failure the application must prevent.
concept: Identify which boundary owns that rule and which observable result would disprove it.
shape: Arrange a small fixture, perform the operation, assert the result and persisted state, then explain why it failed before your change.
```

## Diagnose, explain and review

If login appears to succeed but the next request is anonymous on localhost, inspect cookie Secure and the request scheme. Do not disable CSRF to diagnose a cookie transport issue.

### Explain it without the reference

Trace one input through transport, application rules and persistence to the response. Name the authority for each piece of data. Show the new test you wrote, make it fail deliberately, restore the rule, and rerun. Passing these examples does not establish production readiness or independent mastery.
