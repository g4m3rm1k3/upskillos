# Backend bootcamp verification

Verified 2026-10-11 on Apple silicon macOS. This records local reference execution and repository checks, not production certification or completion of independent learner extensions.

## Reference reconstruction

Executed:

```sh
BACKEND_DOTNET=/tmp/backend-author/dotnet/dotnet node scripts/check-backend-bootcamp.mjs --run
```

The selected .NET executable was a complete .NET 10 SDK installed temporarily for verification. The runner created fresh projects from the lesson code, installed dependencies, checked Django configuration before later routes could mask setup errors, migrated its database, and executed pytest, Django tests, xUnit and Node tests. It then ran each distinct lesson command through the actual Desktop check engine. Django's check used explicit test settings without relying on terminal-exported secrets. The explicit BACKEND_DOTNET override also selects the executable inside the check's login shell, because the system SDK here is older than the course requirement. Selected literal output:

```text
4 passed, 1 warning in 0.52s
PASS Desktop check: .venv/Scripts/python -m pytest -q
PASS backend-fastapi: reconstructed reference executed at /var/folders/rg/q0tmgs012fg54dqg49jvthkh0000gn/T/backend-bootcamp-sXLCIu/fastapi
System check identified no issues (0 silenced).
System check identified no issues (0 silenced).
Ran 5 tests in 1.733s
OK
System check identified no issues (0 silenced).
PASS Desktop check: .venv/Scripts/python manage.py test --settings=desk.test_settings
PASS backend-django: reconstructed reference executed at /var/folders/rg/q0tmgs012fg54dqg49jvthkh0000gn/T/backend-bootcamp-sXLCIu/django
Passed!  - Failed:     0, Passed:     3, Skipped:     0, Total:     3, Duration: 881 ms - Stock.Tests.dll (net10.0)
PASS Desktop check: dotnet test Stock.Tests
PASS backend-aspnet: reconstructed reference executed at /var/folders/rg/q0tmgs012fg54dqg49jvthkh0000gn/T/backend-bootcamp-sXLCIu/aspnet
# tests 1
# pass 1
# fail 0
PASS Desktop check: npm test
PASS backend-nestjs: reconstructed reference executed at /var/folders/rg/q0tmgs012fg54dqg49jvthkh0000gn/T/backend-bootcamp-sXLCIu/nestjs
PASS: 24 backend lessons parsed and validated. Reference projects retained at /var/folders/rg/q0tmgs012fg54dqg49jvthkh0000gn/T/backend-bootcamp-sXLCIu; no servers left running.
```

FastAPI emitted a Starlette deprecation warning about using HTTPX with TestClient. Nest emitted Node 22's experimental SQLite warning. Neither was suppressed. The earlier ASP.NET replay caught incorrect validation metadata on a record property; the lesson now places Range on the constructor parameter and the final replay passes. The Django setup now explicitly removes the generated admin route before checking settings that do not install the admin app.

## Repository checks

The required command is:

```sh
npx vitest run src/labs/project-studio --exclude '**/*.desktop.test.js'
```

Its first sandbox run reported failures in the existing temporary Git-repository check and child-process cleanup check. With local process access, only the Git check remained: its direct path comparison sees macOS's /var and /private/var spellings differently. No unrelated source was changed. The passing invocation used a canonical temporary directory:

```sh
TMPDIR=/private/tmp npx vitest run src/labs/project-studio --exclude '**/*.desktop.test.js'
```

Final suite output (exit 0):

```text
 Test Files  45 passed (45)
      Tests  208 passed (208)
   Duration  8.74s (transform 22.27s, setup 0ms, import 44.00s, tests 12.11s, environment 7.54s)
```

Executed `npm run facts` (exit 0):

```text
> open-calc@0.1.5 facts
> node src/scripts/build-lesson-titles.js && node scripts/build-lesson-ids.mjs && node scripts/generate-project-facts.mjs

✓ Lesson titles built: 1374 lessons
✓ Lesson id map built: 1374 lessons
✓ Project facts written: 44 courses, 1374 lessons, 55 labs, 16 games.
⚠ 14 content problem(s) listed under "Problems found" in docs/generated/project-inventory.md
```

Executed `npm run catalog:check` (exit 0):

```text
> open-calc@0.1.5 catalog:check
> node src/scripts/build-lesson-titles.js --check && node scripts/build-lesson-ids.mjs --check && node scripts/generate-project-facts.mjs --check

✓ Lesson titles are current: 1374 lessons
✓ Lesson id map is current: 1374 lessons
✓ Project facts are current (44 courses, 1374 lessons, 55 labs, 16 games).
⚠ 14 content problem(s) listed under "Problems found" in docs/generated/project-inventory.md
```

Executed `npm run typecheck` (exit 0):

```text
> open-calc@0.1.5 typecheck
> tsc --noEmit
```

The inventory warnings were already present; regenerating facts made no tracked inventory changes. TypeScript finished without diagnostics. Git diff whitespace checking also completed without output.

Executed `npm run docs:check` (exit 0):

```text
> open-calc@0.1.5 docs:check
> node scripts/check-docs.mjs

✓ Contributor docs checked: 10 file(s), links, paths and commands all exist.
```

## Remaining verification

- Guided code was reconstructed and executed; independent extensions were not solved or graded by this runner.
- No real external OIDC issuer or production deployment was exercised. The ASP.NET authorization tests deliberately isolate authentication and include a regression that rejects the test header in the real application.
- PostgreSQL migration, production TLS/ingress, backup operations, external delivery and load objectives require the learner's implementations and their own evidence.
- Windows/Linux Desktop walkthroughs, browser accessibility review for the Django pages, and learner pacing sessions remain open.
- No production Vite build was run for this content addition. The Project Studio discovery tests and repository typecheck cover the changed integration.
- No repository commit or push was performed.
