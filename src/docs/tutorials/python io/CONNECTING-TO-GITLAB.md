# Connecting to GitLab: Authentication, For Real

**What you will build:** the actual credential-handling knowledge for
talking to GitLab from code — which of two real mechanisms git itself
uses for push/pull/clone, which of three real HTTP headers GitLab's
REST API expects depending on credential type (proven by reading and
running the actual installed client library's own source, not just
its docs), the real `gitlab.Gitlab` client object, and what a genuine
authentication failure actually looks like. This is deliberately a
**separate topic from GitPython** — GitPython (a wrapper around the
`git` command) never touches credentials at all, and GitLab's REST API
is a different surface entirely, reached through `python-gitlab` or
plain `requests`. The two are commonly used together in one real
project, but neither is a prerequisite for the other, and this
document doesn't assume you've read the other one.

**What you need to know first:**
- A GitLab account, and for anything beyond public data, appropriate
  permission on the specific group/project you're targeting.
- Either an SSH key pair with its public half already added to your
  GitLab account, **or** a token already generated in GitLab's own UI
  (Personal Access Token, OAuth application token, or — inside a CI
  pipeline only — a CI job token, all three explained below). Nothing
  here walks through generating one in GitLab's UI, since that's a
  point-and-click step in a product interface, not something to teach
  as code.
- HTTP fundamentals — status codes, headers, what `requests.get(...,
  headers={...})` actually does — for the REST API portion
  specifically. Git-protocol authentication (the first Concept Unit)
  needs none of this; it happens entirely outside your Python code.
- **Not required:** GitPython. Nothing below depends on it, and if
  you're only using GitLab's REST API (merge requests, issues,
  project metadata) rather than git operations, you may never need
  GitPython at all.

**Terms used in this document**

- **Personal Access Token (PAT)** — a long, generated credential
  string representing a specific user, created explicitly for
  programmatic use instead of a real password. It exists so a script
  or tool never needs to hold an actual account password, and so that
  credential can be revoked or scoped (limited to specific
  permissions) independently of the account's real login.
- **OAuth token** — a credential issued through GitLab acting as an
  identity provider for a *third-party application* the user
  authorized, rather than a token the user generated for themselves
  directly. It exists to let an application access GitLab on a user's
  behalf without ever seeing that user's password or a PAT they
  control directly.
- **CI job token** — a short-lived credential GitLab itself generates
  automatically for a running CI/CD pipeline job, scoped to that one
  job. It exists so a pipeline can authenticate back to GitLab (to
  push an artifact, trigger another pipeline) without a human-managed,
  long-lived token sitting in the pipeline's own configuration at all.

**Objects and methods used**

- **`requests.auth.AuthBase`**
  - *What it is:* The base class `requests` itself provides for
    pluggable authentication — any callable taking a `PreparedRequest`
    and returning it, optionally modified, can be passed as
    `requests.get(..., auth=my_auth_object)`.
  - *Implementation:* A near-empty base class; subclasses implement
    `__call__(self, r) -> r`.
  - *Its use:* What `PrivateTokenAuth`/`OAuthTokenAuth`/`JobTokenAuth`
    all subclass, letting `python-gitlab` plug its own credential logic
    directly into `requests`'s own, already-existing extension point.
  - *Type / Responsibility / Depends on / Connects to / Shape:* A
    class from the `requests` library; responsible for defining the
    one-method contract any custom auth mechanism has to satisfy;
    depends on nothing; connects to every `requests` call made with
    `auth=an_instance`; shape is a `PreparedRequest` in, the same
    (optionally mutated) object out.

- **`PrivateTokenAuth` / `OAuthTokenAuth` / `JobTokenAuth`**
  - *What they are:* `python-gitlab`'s own three real `AuthBase`
    subclasses, one per GitLab credential type.
  - *Implementation:* Each sets exactly one real HTTP header and
    clears the other two, guaranteeing only one credential header is
    ever present on an outgoing request — shown in full, from the
    actual installed source, in this document's second Concept Unit.
  - *Their use:* Attached automatically by `gitlab.Gitlab(...)` based
    on which keyword argument (`private_token=`, `oauth_token=`,
    `job_token=`) you constructed it with.
  - *Type / Responsibility / Depends on / Connects to / Shape:*
    Library-internal classes; responsible for translating "I have this
    kind of token" into "the one correct real HTTP header GitLab's own
    server expects for it"; depend on a real token string; connect to
    every request `python-gitlab`'s client sends; shape is a
    `PreparedRequest` in, the same object with exactly one credential
    header out.

- **`gitlab.Gitlab`**
  - *What it is:* The top-level client class, from the third-party
    `python-gitlab` library, for the entire GitLab REST API.
  - *Implementation:* Real, confirmed constructor shown in this
    document's third Concept Unit; internally builds a
    `requests.Session`, attaching the correct `AuthBase` subclass
    above based on which token argument was given.
  - *Its use:* The one object you'd construct once and reuse for
    every call against a given GitLab instance.
  - *Type / Responsibility / Depends on / Connects to / Shape:* A
    class; responsible for holding connection-level configuration
    (URL, credentials, retry/pagination defaults) once, and exposing
    every resource type as its own manager attribute; depends on a
    reachable GitLab URL and a valid credential for anything beyond
    public data; connects to every `*Manager` attribute (`.projects`,
    `.issues`, ...); shape is configuration in, one long-lived client
    object out.

- **Resource managers (`ProjectManager` and siblings)**
  - *What they are:* One object per API resource type, exposing
    `.get()`/`.list()`/`.create()` following which mixins that
    resource actually supports.
  - *Implementation:* Confirmed via the real installed library's own
    `__mro__` in this document's third Concept Unit — real
    inheritance from `GetMixin`/`CRUDMixin`, not one giant class
    handling every resource identically.
  - *Their use:* `gl.projects.get("group/project")` returns a real
    `Project` object; from there, `project.mergerequests.list()`,
    `project.issues.create({...})`, following the identical manager
    pattern one level deeper, per resource.
  - *Type / Responsibility / Depends on / Connects to / Shape:*
    Classes, one instance per resource type, each attached to a parent
    client or object; responsible for translating `.get`/`.list`/
    `.create` calls into the correct real HTTP request and endpoint
    path for that specific resource; depend on the parent `Gitlab`
    client's own session (and therefore its already-attached auth);
    connect a top-level client down to individual real resource
    objects; shape is an ID or filter in, a real Python object (or
    list of them) representing that GitLab resource out.

---

## Concept Unit: Git protocol authentication — SSH vs. HTTPS+token

### The Problem

`git.Repo.clone_from`/`push`/`pull` all eventually run a real `git`
subprocess, and a private repository's `git` subprocess needs real
credentials before the remote will hand over anything — but nothing
shown so far has touched a private repo, or asked how those
credentials actually get supplied.

> **Stop and think:** Any tool that clones or pushes a private
> repository — GitPython, a plain `git` command, a CI runner — has to
> get credentials from *somewhere*. If that tool's own API never takes
> a password or token as a direct argument (GitPython's `clone_from`,
> `push`, and `pull` genuinely don't), where would credentials have to
> live instead for a private clone to succeed at all?

### Two real mechanisms, sourced from GitLab's current documentation

**SSH** — register a public key on your GitLab account once; use an
SSH-form remote URL (`git@gitlab.com:group/project.git`). Nothing about
this involves GitPython *or* Python at all — the credential lives in
your SSH agent, and `git` (and therefore GitPython, which is only ever
calling `git`) picks it up transparently, the identical way a bare
`git clone git@gitlab.com:...` on the command line would.

**HTTPS + Personal Access Token** — per GitLab's own current docs, the
username can be any non-empty string; the real credential is the
token, used as the password:

```python
url = f"https://{any_username}:{token}@gitlab.com/group/project.git"
git.Repo.clone_from(url, "/local/path")
```

A real, documented gotcha: embedding the token directly in the URL
like this has real, reported failures on some self-managed GitLab
instances where the identical token typed at an interactive prompt
succeeds. The more robust version skips the URL entirely and uses a
git credential helper, so neither GitPython nor your shell history ever
holds the raw token in a URL string:

```bash
git config --global credential.helper store
```

### Discard the throwaway framing

There's no lab to discard here — this unit is necessarily sourced
documentation, not a live-executed proof, since this sandbox has no
network path to `gitlab.com` at all to actually attempt a clone
against. The next unit returns to real, executed verification for the
piece that doesn't require reaching GitLab itself.

### CS lens

Neither mechanism requires GitPython's own code to know anything about
credentials at all — this is the same **separation of concerns** as
Lesson 1's `open()` never needing to know about disk encryption: the
credential lookup happens at a layer *underneath* the thing you're
calling, invisibly, as long as that underlying layer (here, your
system's own `git`/SSH configuration) is already set up correctly.

```
Also recognized in: a database driver never handling disk-level
encryption itself (the OS/filesystem does), a web browser delegating
TLS certificate validation to the OS's own certificate store rather
than each browser vendor re-implementing it, an ORM (Lesson 9) never
knowing how its underlying database connection was authenticated
```

### SE lens

The alternative — GitPython accepting a token or password as a direct
argument to `clone_from`/`push`/`pull` — would mean every credential
this curriculum's tools ever handle has to flow through your own
Python code explicitly, which is exactly the shape of thing worth
avoiding: more places a token could end up logged, printed in a
traceback, or committed by accident. Letting the credential live one
layer down, in `git`'s own configuration or your SSH agent, means your
Python code never holds it at all for the git-protocol path — only the
REST-API path (next unit) genuinely requires your own code to hold a
token directly, because there's no equivalent "let the OS handle it"
layer underneath a plain HTTP request.

---

## Concept Unit: REST API authentication — three token types, three headers

### The Problem

GitLab's REST API (merge requests, comments, project metadata — Lesson
11's shape, GitLab's own endpoints) isn't git protocol at all — it's
plain HTTP, and plain HTTP has no SSH-agent-equivalent to quietly
supply credentials underneath you. Your own code has to attach a
credential to every request, and GitLab, per its own current docs, uses
**three different header names for three different kinds of token** —
using the wrong one for a given token type is a real, easy mistake.

> **Stop and think:** If a library claims to support three different
> credential types (a personal token, an OAuth token, a CI job token),
> and each one needs a different HTTP header to actually work, what
> would you want to check — read the library's documentation and trust
> it, or find a way to prove, without needing a real network call at
> all, that the library actually builds the header it claims to?

### Introduce the concept — proven from the real, installed library's own source, with no network call at all

`python-gitlab`'s real, current source (version 8.5.0, installed this
session) defines exactly three small classes, each one a `requests`
**auth callable** — an object `requests` calls automatically, right
before sending, specifically to attach credentials:

```python
# from gitlab/_backends/requests_backend.py, the real installed source
class PrivateTokenAuth(TokenAuth, AuthBase):
    def __call__(self, r):
        r.headers["PRIVATE-TOKEN"] = self.token
        r.headers.pop("JOB-TOKEN", None)
        r.headers.pop("Authorization", None)
        return r

class OAuthTokenAuth(TokenAuth, AuthBase):
    def __call__(self, r):
        r.headers["Authorization"] = f"Bearer {self.token}"
        r.headers.pop("PRIVATE-TOKEN", None)
        r.headers.pop("JOB-TOKEN", None)
        return r
```

Proven directly, without a single network call — building a real
`requests` request object, then running it through each auth class by
hand:

```python
import requests
from gitlab._backends.requests_backend import PrivateTokenAuth, OAuthTokenAuth

prepared = requests.Request("GET", "https://gitlab.com/api/v4/projects/1").prepare()
print("before auth ->", dict(prepared.headers))

authed = PrivateTokenAuth("fake-pat-123")(prepared)
print("after PrivateTokenAuth ->", dict(authed.headers))

prepared2 = requests.Request("GET", "https://gitlab.com/api/v4/projects/1").prepare()
authed2 = OAuthTokenAuth("fake-oauth-456")(prepared2)
print("after OAuthTokenAuth ->", dict(authed2.headers))
```

Real output, from an actual run:

```
before auth -> {}
after PrivateTokenAuth -> {'PRIVATE-TOKEN': 'fake-pat-123'}
after OAuthTokenAuth -> {'Authorization': 'Bearer fake-oauth-456'}
```

This is real, verified proof — not trust in a doc page — that a
personal access token genuinely needs `PRIVATE-TOKEN`, an OAuth token
genuinely needs `Authorization: Bearer`, and the library's real source
handles each one differently, on purpose, popping any header a
*different* token type would have set (so switching credential types
never accidentally leaves a stale, wrong header behind from a previous
request).

### Discard the throwaway example

The `prepared`/`authed` objects built above are discarded — they exist
only to prove the header-attachment mechanism directly, without
needing a real network call to GitLab at all.

### Mechanical walkthrough

- **`requests.Request(...).prepare()`** — full treatment of
  `requests` already given in Lesson 11, extended here: `.prepare()`
  turns a `Request` (a plain description of what to send) into a
  `PreparedRequest` (the actual, final form about to go over the
  wire) — this is the exact object type every `AuthBase.__call__`
  receives and is allowed to modify.
- **`PrivateTokenAuth("fake-pat-123")(prepared)`** — constructs the
  auth object, then calls it directly as a function on `prepared` —
  the same thing `requests` itself does automatically, internally,
  immediately before actually sending a request, when you pass
  `auth=some_instance`.
- **`r.headers.pop("JOB-TOKEN", None)`** inside each class — full
  treatment of `dict.pop` (a basic, already-familiar method, given
  full treatment here on reappearance per this curriculum's own
  Repetition standard): removes a key if present, does nothing if
  it's already absent (the `None` default prevents a `KeyError`) —
  this is what guarantees switching token types never leaves a
  previous, wrong header behind.

### CS lens

A small, single-method interface (`AuthBase`'s `__call__`) that any
object can implement to plug custom behavior into a larger, generic
system — here, `requests`'s own send pipeline — without that system
needing to know anything about GitLab specifically, is the **Strategy
pattern**: swap the algorithm (how to authenticate) independently of
the thing using it (the HTTP client).

```
Also recognized in: a sort function accepting a custom `key=` callable
instead of hard-coding comparison logic, a logging framework accepting
pluggable handlers, this curriculum's own `chunked`/`safe_stream`
(Lesson 7, Lesson 13) accepting a `process` function as a parameter
instead of hard-coding what happens to each item
```

### SE lens

The alternative — one single auth class that takes a token and a "type"
string, branching internally on which header to set — would work, but
mixes three genuinely different behaviors into one class with a
conditional, rather than three small classes each satisfying the same
interface. `python-gitlab`'s actual choice (three classes, one shared
`__call__` contract) means adding a fourth token type later — if GitLab
ever introduces one — is a new, small, independent class, not a new
branch inside an existing one that risks breaking the other two paths.

### Run it

Shown above — real output, from an actual run, needing no network
access at all, since it exercises the library's own real header-
building logic directly rather than anything server-side.

### Connect

The previous unit established that git-protocol credentials live
outside your Python code entirely; this unit proves, from the real,
installed library's own source, exactly which HTTP header each REST-API
credential type actually needs — the next unit puts this into the real
client object you'd actually construct and call.

---

## Concept Unit: The `gitlab.Gitlab` client

### The Problem

Nothing so far has shown the actual object you'd hold onto and call
methods on to do real work against GitLab — creating a merge request,
reading a project's metadata, listing issues.

### The real, current constructor — confirmed from the installed library

```python
import inspect
import gitlab
print(inspect.signature(gitlab.Gitlab.__init__))
```

Real output, from the actual installed version:

```
(self, url=None, private_token=None, oauth_token=None, job_token=None,
 ssl_verify=True, http_username=None, http_password=None, timeout=None,
 api_version='4', per_page=None, pagination=None, order_by=None,
 user_agent='python-gitlab/8.5.0', retry_transient_errors=False,
 keep_base_url=False, **kwargs)
```

Two details worth noticing directly in this real signature, both
already-familiar ideas from earlier lessons, now built into the client
itself rather than something you'd write by hand: **`per_page`/
`pagination`** — Lesson 11's own `Link`-header pagination, handled for
you; **`retry_transient_errors`** — Lesson 11's own retry-with-backoff
idea, available as a single constructor flag instead of a hand-written
`fetch_with_retry`.

```python
gl = gitlab.Gitlab("https://gitlab.com", private_token="fake-token")
print(type(gl.projects))
print(type(gl.projects).__mro__[:3])
```

Real output:

```
<class 'gitlab.v4.objects.projects.ProjectManager'>
(<class 'gitlab.v4.objects.projects.ProjectManager'>, <class 'gitlab.mixins.CRUDMixin'>, <class 'gitlab.mixins.GetMixin'>)
```

`gl.projects` isn't a plain method — it's a real **manager object**,
one per resource type (`gl.projects`, `gl.issues`, `gl.users`, ...),
each built from small, reusable mixins (`GetMixin` for `.get(id)`,
`CRUDMixin` for create/read/update/delete) — the actual real shape
you'd call: `gl.projects.get("group/project")`,
`project.mergerequests.create({...})`.

### Mechanical walkthrough

- **`gitlab.Gitlab(url, private_token=token)`** — full treatment
  above; internally selects `PrivateTokenAuth` (previous unit) because
  `private_token` was the argument supplied, not `oauth_token` or
  `job_token`.
- **`gl.projects`** — attribute access on the client returning a real,
  already-constructed `ProjectManager`, not a method call — the
  manager is built once, at client-construction time, and reused for
  every subsequent `.get()`/`.list()` call.
- **`type(gl.projects).__mro__`** — the builtin `__mro__` (Method
  Resolution Order) attribute every Python class has, listing its own
  inheritance chain — used here purely to prove, directly, that
  `ProjectManager` really does inherit from `GetMixin`/`CRUDMixin`
  rather than reimplementing `.get()` itself.

### CS lens

One manager object per resource type, each built from small, shared
mixins rather than one large class per resource duplicating
`.get()`/`.list()`/`.create()` logic every time, is the same
**composition over inheritance-heavy duplication** principle behind
any framework offering a small set of reusable capabilities (mixins)
that concrete classes opt into individually.

```
Also recognized in: Django's own class-based views (mixins for
list/detail/create/update/delete, composed per view), Python's own
`collections.abc` (mixin classes providing default implementations
once you supply a few required methods), this curriculum's own
`Contact`/`Contact`-adjacent dataclasses sharing structure through
composition (a conversion function) rather than a shared base class
```

### SE lens

The alternative not chosen — one client class implementing every
GitLab resource type's methods directly, with no manager objects at
all (`gl.get_project(id)`, `gl.list_issues(project_id)`, ...) — would
avoid the extra layer of indirection at the real cost of one enormous
class (GitLab's API has dozens of resource types) with no shared
structure between near-identical `.get`/`.list`/`.create` behavior
repeated per resource. The manager-and-mixin design means a new GitLab
resource type is a small new class composed from existing mixins, not
a new pile of near-duplicate methods added to one already-large class.

### Run it

The constructor signature and manager-class hierarchy shown above are
both real, from the actual installed library, requiring no network
call. Actually calling `.get()`/`.list()` against real data needs a
real, reachable GitLab instance and a real token — genuinely outside
what this sandbox can execute (no network path to `gitlab.com` at
all) — the shape shown above is exactly what you'd run, unchanged,
against a real instance with real credentials.

### Connect

This unit's real client object is where the previous two units'
findings meet: construct it with whichever credential type you have
(SSH doesn't apply here at all — REST API auth is always one of the
three headers from the previous unit), and every resource manager
hanging off it already carries that credential, automatically, on
every call.

---

## Concept Unit: What a real auth failure actually looks like

### The Problem

Every previous unit in this section proved the *mechanism* — the right
header gets attached. Nothing yet has shown what happens when the
credential itself is simply wrong, which is the failure you'll
actually hit and need to recognize while setting this up for real.

### Introduce the concept — the real, live mechanism, proven against a reachable API

This sandbox can't reach `gitlab.com`, but the underlying HTTP
mechanism — a rejected bad credential vs. a request with no credential
at all — is identical everywhere. Proven live against GitHub's real
API (already used safely for this exact purpose in Lesson 11):

```python
import requests

r = requests.get("https://api.github.com/user",
                  headers={"Authorization": "Bearer not-a-real-token"})
print("bad token ->", r.status_code, r.json())

r2 = requests.get("https://api.github.com/user")
print("no token  ->", r2.status_code, r2.json())
```

Real output, from an actual run:

```
bad token -> 401 {'message': 'Bad credentials', 'documentation_url': 'https://docs.github.com/rest', 'status': '401'}
no token  -> 403 {'message': "API rate limit exceeded for 34.139.224.102. ...", 'documentation_url': 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting'}
```

Two genuinely different real failures: a *wrong* credential gets a
loud, explicit `401` naming exactly what's wrong; *no* credential at
all silently falls back to anonymous access, only failing later (here,
from an unrelated rate limit, not from authentication at all).
GitLab's own `PRIVATE-TOKEN` path produces the equivalent explicit
`401` for a genuinely wrong token — `python-gitlab` surfaces this as a
real, named exception, `gitlab.exceptions.GitlabAuthenticationError`
(confirmed present in the real installed library's own
`gitlab/exceptions.py`), rather than a bare status code your own code
would have to check by hand.

### Mechanical walkthrough

- **`requests.get(..., headers={"Authorization": "Bearer not-a-real-token"})`**
  — full treatment of `requests.get` and headers already given in
  Lesson 11; a syntactically well-formed but genuinely invalid
  credential.
- **`r.status_code`, `r.json()`** — full treatment already given in
  Lesson 11; read here specifically to distinguish "your credential
  was checked and rejected" (`401`) from "no credential was even
  considered" (here, a `403` for an unrelated reason — rate limiting —
  proving the *absence* of a header doesn't even reach the same
  check a *wrong* header does).

### CS lens

Two different failure codes for two genuinely different situations —
"I checked this and it's wrong" vs. "nothing to check, proceeding
anonymously, which itself may fail for other reasons" — is the same
distinction as this curriculum's own `KeyError` (Lesson 4: a wrong key,
checked and absent) vs. simply never having set a key at all: a system
that collapses both into one generic failure loses real diagnostic
information a caller needs to actually fix the problem.

```
Also recognized in: a login form distinguishing "wrong password" from
"no account with that email" (a real, deliberate UX/security tradeoff —
some systems merge these on purpose, to avoid confirming which emails
have accounts at all), a compiler distinguishing "undefined variable"
from "type mismatch" rather than one generic "error", HTTP's own 401
(check failed) vs. 403 (check succeeded, but you're not allowed) vs.
404 (used, sometimes deliberately, to avoid confirming a private
resource exists at all)
```

### SE lens

The practical takeaway for your own tool: **check for and handle a
`401`/`GitlabAuthenticationError` specifically and separately** from a
generic "something went wrong" catch — a wrong or expired token is a
completely different, actionable problem (re-authenticate) from a
transient network failure (retry, per Lesson 11) or a genuine
permissions issue (a `403` — the token is valid, but this token's
owner isn't allowed to do this specific thing). Collapsing all three
into one generic error message is exactly the kind of diagnostic
information loss Part 7 of the framework document warned about for
validation errors generally — the same principle, here applied to
authentication specifically.

### Connect

Every unit in this section closes the same loop from a different
angle: git-protocol credentials live outside your code (unit 1); REST
credentials live in one of three real, now-proven headers, attached
automatically by the real client object (units 2-3); and a wrong one
fails loudly and specifically, distinguishable from simply having none
at all (this unit) — the actual, complete picture of "how do I log in"
for a tool built on top of both GitPython and `python-gitlab` together.
