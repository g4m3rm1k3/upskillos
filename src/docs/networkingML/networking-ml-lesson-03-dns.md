# Lesson 3 — DNS & the Path a Request Takes

## What you'll learn
- Why `connect()` (Lesson 1) can't actually accept a domain name directly —
  what it really needs, and what resolves a domain into that
- `socket.gethostbyname` — triggering real DNS resolution yourself, in code
- The resolver hierarchy, conceptually: root → TLD → authoritative servers
  — why a domain lookup isn't one flat table, but a chain of referrals
- The hosts file — a real, local override that bypasses DNS entirely, and
  why that fact matters for local development

## What you'll build
A script that resolves a real domain name to its actual IP address, a
demonstration of DNS caching behavior, and a local hosts-file override you
create yourself, confirming you can redirect a domain without touching DNS
at all.

## The question
Lesson 1's `clientSocket.connect(("127.0.0.1", 9000))` used a literal IP
address. Every real website you've ever visited, you typed as a domain
name (`google.com`), never an IP. What actually happens, mechanically,
between typing a domain and `connect()` receiving something it can use?

## 1. Predict

You already know `connect()` needs an (address, port) tuple, and Lesson 1
used a literal IP for "address." Predict: is there any way `connect()`
itself could accept a domain name directly and figure out the IP
internally, or does *something else*, running *before* `connect()` is
ever called, have to do that translation first?

## 2. Try it — resolving a real domain

```python
import socket

domainName = "example.com"
resolvedIpAddress = socket.gethostbyname(domainName)

print(domainName, "resolves to", resolvedIpAddress)
```

### What this code does

**`socket.gethostbyname(domainName)`**
- **This is the direct answer to your Predict question.** `connect()`
  itself never accepts a domain name — something has to resolve it to an
  IP address *first*, as a completely separate step. `gethostbyname` is
  that step, made explicit: it performs actual **DNS resolution** —
  querying the Domain Name System — and returns the resulting IP address
  as a plain string, exactly the format `connect()`'s address argument
  expects.
- **Every single `fetch("https://...")` call and every `requests.get(...)`
  you've ever made has triggered this exact resolution step internally,
  automatically, before ever opening a socket** — you've simply never seen
  it happen explicitly until now.

### What happens

Running this prints something like `example.com resolves to
93.184.216.34` (the actual IP may vary/change over time — worth noting
domains can resolve to different IPs at different times, a real fact
explored further in Section 6). This one function call is doing
real, nontrivial network communication — reaching out to DNS
infrastructure — even though it looks like a simple, synchronous local
function call.

## 3. Why — DNS resolution is a chain of referrals, not one flat lookup

**No new code needed for this section — this is conceptual, grounding
what `gethostbyname` actually triggers underneath.**

- DNS is **not** one giant table mapping every domain to its IP, stored in
  one place. It's a **hierarchical, distributed** system:
  1. Your resolution request first goes to a **recursive resolver**
     (typically run by your ISP, or a public one like Google's `8.8.8.8` —
     configurable, and often what's actually configured on your machine
     right now, worth checking).
  2. If that resolver doesn't already have the answer cached, it asks a
     **root server** — not "what's `example.com`'s IP," but effectively
     "who handles `.com` domains?"
  3. The root server refers it to a **TLD (Top-Level Domain) server** for
     `.com` — which in turn answers "who is authoritative for
     `example.com` specifically?"
  4. Finally, the **authoritative name server** for `example.com` —
     controlled by whoever actually owns/manages that domain — provides
     the actual IP address.
- **This is why DNS resolution, while usually fast, is genuinely a
  multi-step network process**, not a single instant lookup — your
  recursive resolver typically caches results (Section 4) specifically to
  avoid repeating this entire chain for every single request.

### Mental model

```
gethostbyname("example.com")
   ↓
your recursive resolver (checks its own cache first)
   ↓ (if not cached)
root server → "ask the .com TLD server"
   ↓
.com TLD server → "ask example.com's authoritative server"
   ↓
example.com's authoritative server → "here's the actual IP"
   ↓
IP address returned to your code
```

## 4. Change one thing — observing caching behavior

```python
import socket
import time

domainName = "example.com"

startTime = time.time()
firstResolution = socket.gethostbyname(domainName)
firstDuration = time.time() - startTime

startTime = time.time()
secondResolution = socket.gethostbyname(domainName)
secondDuration = time.time() - startTime

print("First resolution:", firstDuration, "seconds")
print("Second resolution:", secondDuration, "seconds")
```

**What changed:** resolving the *same* domain twice in a row, timing each.
**Predict, then verify**: the **second** resolution is typically
noticeably faster than the first — sometimes dramatically so. This is the
direct, measurable consequence of caching at multiple levels: your
operating system, and/or your configured recursive resolver, remembers a
recent answer and returns it immediately without repeating Section 3's
full referral chain. **This caching is exactly why a DNS change (pointing
a domain at a new server) can take time to "propagate"** — cached
answers, sitting in resolvers you don't control, at various points around
the internet, continue being returned until each individual cache's
**TTL (Time To Live)** — a real, specific expiration value the
authoritative server sets — actually expires.

## 5. Put it in the project — overriding DNS locally with the hosts file

Your machine has a **hosts file** — a plain text file the operating
system checks **before** ever performing real DNS resolution at all,
letting you manually map a domain name to any IP you choose, entirely
locally, entirely bypassing the Section 3 referral chain.

**Location**: `/etc/hosts` on macOS/Linux, `C:\Windows\System32\drivers\etc\hosts`
on Windows (requires administrator/sudo privileges to edit).

Add a line like:
```
127.0.0.1   myfakesite.local
```

Then run:
```python
import socket

resolvedIpAddress = socket.gethostbyname("myfakesite.local")
print(resolvedIpAddress)
```

**What this demonstrates**
- `myfakesite.local` isn't a real, registered domain, and no actual DNS
  query happens for it at all — `gethostbyname` returns `127.0.0.1`
  **immediately**, because the hosts file entry short-circuits the entire
  process before Section 3's chain would ever begin.
- **This is a genuinely useful, real development technique**: pointing a
  domain-like name at `127.0.0.1` (or any IP) during local development —
  testing how your own code behaves with a "real-looking" domain, without
  needing to actually register one or configure real DNS — is a standard,
  practical use of this exact mechanism, not just a teaching device.

## 6. Trap

Predict, then test: resolve a real domain (e.g. a large site you know
uses multiple servers, like a major tech company's homepage), then resolve
it again a few times in quick succession, and compare the returned IP
addresses closely.

You may find the IP address **changes between calls**, even without any
caching-expiration time having passed. **This is a real, deliberate DNS
behavior called round-robin DNS** — some domains are configured with
*multiple* IP addresses behind one name specifically so that different
resolution requests can be spread across *different* actual servers (a
simple, real form of load balancing). **The trap: assuming a domain
always resolves to exactly one, fixed IP address is a genuinely incorrect
assumption for many real, large-scale sites** — code that resolves a
domain once and hardcodes/caches that specific IP indefinitely can end up
talking to a server that's since been taken out of rotation, or missing
the load-distribution benefit entirely.

## 7. Exercise

- **Predict:** If your hosts file mapped `example.com` (a real, existing
  domain) to `127.0.0.1` instead of a made-up name, and you had a local
  server (Lesson 1/2) running on port 80, what do you think would happen
  if you visited `http://example.com` in a real browser on that same
  machine? Reason about it, then (carefully, and only if you understand
  what you're doing and remember to remove the entry afterward) test it.
- **Modify:** Write a small script that resolves a list of 5 different
  real domains and prints each one's IP — observe how some domains'
  resolution is noticeably slower than others (often domains you've never
  visited before on this machine, with nothing cached anywhere yet).
- **Research:** Look up what a `CNAME` record is (a real, common DNS
  record type distinct from the `A` records `gethostbyname` ultimately
  resolves) — in your own words, describe why a domain might be configured
  to point to *another domain name* rather than directly to an IP.
- **Trace:** Using a command-line tool (`dig example.com` on macOS/Linux,
  or `nslookup example.com` on Windows — both real, standard diagnostic
  tools, worth knowing exist independent of writing any code), compare
  its output against your Python `gethostbyname` result — confirm they
  agree, and note what *additional* information the command-line tool
  shows that your one-line Python call didn't.

## What to remember
- `connect()` never accepts a domain name — resolution to an IP address is
  a separate, explicit step that happens first, whether you see it
  (`gethostbyname`) or it happens invisibly inside `fetch`/`requests`.
- DNS is a hierarchical chain of referrals (root → TLD → authoritative),
  not one flat lookup table — caching at multiple levels is what makes
  repeated resolutions fast in practice.
- The hosts file lets you override resolution entirely, locally, before
  any real DNS query happens — a genuinely useful local-development tool,
  not just a lesson demonstration.
- Some domains legitimately resolve to different IPs across calls
  (round-robin DNS for load balancing) — assuming one fixed IP per domain
  is a real, incorrect assumption for many large sites.

## Next lesson
Lesson 4 builds a tiny web server with **no framework at all** — you've
already built the raw-socket pieces (Lesson 1) and the HTTP parsing/
construction (Lesson 2); this lesson organizes those into something
resembling a real, if minimal, web server, giving you new eyes for exactly
what FastAPI/`uvicorn` (Lesson 18) are abstracting away on your behalf.
