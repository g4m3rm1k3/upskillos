---
title: Production 3 — Regression tests through real controls
track: Frontend Developer Bootcamp — Production React
trackOrder: 50.095
runtime: none
---

Outcome: reproduce important user journeys in a browser with controlled network responses and useful failure traces.

### The story so far

Pure tests proved calculations and transformations. They could not tell us whether a label found its input, a handler saved the book or navigation lost focus. Browser tests connect those boundaries. Think of a fire drill: it exercises the route through the building, but it does not prove every future emergency will be identical.

## Create an isolated test server

Run `npx playwright install chromium` once after npm install to install the matching browser binary. On a Linux CI runner use `npx playwright install --with-deps chromium`. Package and browser installation are distinct steps. A missing executable is setup failure, not a failed app assertion.

The runner owns a server on a fixed local port and shuts it down afterwards. reuseExistingServer=false avoids silently testing another project already listening there. If the port is busy, stop your own conflicting process or choose another port in both config values. Never kill an unidentified process.

Each test receives a fresh browser context, including separate localStorage. A reload within one test retains that test's storage. A trace captures evidence on failure; inspect it with `npx playwright show-trace path/to/trace.zip`.

```predict
question: Should a save-and-reload regression depend on today’s live catalog response?
choice: No
choice: Yes
answer: No
explain: A controlled fixture makes the expected result stable and isolates our application behavior.
```

```typescript file=playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './quality/browser',
  use: { baseURL: 'http://127.0.0.1:4178', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 4178 --strictPort', url: 'http://127.0.0.1:4178/react/index.html', reuseExistingServer: false },
});
```

```check
file playwright.config.ts
```

## Test persistence, navigation, focus and retry

Read each test as arrange → act → assert. Accessible names locate controls the same way a person understands them; exact matching prevents a broad substring from selecting the wrong control. Playwright locators retry until ready, and expect waits for the stated condition. Arbitrary sleep durations trade speed for flakiness and do not define success.

The first journey distinguishes in-memory navigation from disk persistence: leaving and returning tests the state owner; reloading tests storage. It also catches the disappearing-button focus defect. The second controls HTTP responses: fail once, retry the same text, save a result, then reload. A click passing alone is insufficient; the heading must appear after the reload.

Run `npm run test:browser`. When it fails, read the first failed expectation, screenshot and trace. Do not immediately increase timeouts: missing labels, bad routing and the wrong expected result are not slow browsers. These tests cover Chromium and named flows, not all browsers or complete accessibility.

```typescript file=quality/browser/reading.spec.ts
import { test, expect } from '@playwright/test';
test('a saved book survives navigation and reload; removal keeps focus', async ({ page }) => {
  await page.goto('/react/index.html');
  await page.getByLabel('Book title', { exact: true }).fill('Design for people');
  await page.getByRole('button', { name: 'Add book', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Design for people', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Find books', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Find books', exact: true })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Design for people', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Remove Design for people', exact: true }).click();
  await expect(page.getByLabel('Book title', { exact: true })).toBeFocused();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Design for people', exact: true })).toHaveCount(0);
});
test('API failure can retry, save a fixture and retain it on the shelf', async ({ page }) => {
  let calls = 0;
  await page.route('https://openlibrary.org/**', route => {
    calls++;
    return route.fulfill({ status: calls === 1 ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ docs: [{ key: '/works/test', title: 'Test Book', author_name: ['Test Author'] }] }) });
  });
  await page.goto('/react/index.html#/search');
  await page.getByLabel('Title or author', { exact: true }).fill('Design');
  await page.getByRole('button', { name: 'Search catalog', exact: true }).click();
  await expect(page.getByText('Search failed. Submit again to retry.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Search catalog', exact: true }).click();
  await page.getByRole('button', { name: 'Save Test Book', exact: true }).click();
  await page.getByRole('link', { name: 'My shelf', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Test Book', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Test Book', exact: true })).toBeVisible();
});
```

```check
run "npm run test:browser" timeout=120
```

## Your turn: protect unknown-address recovery

Add a third browser test named unknown routes recover to the shelf. Open /react/index.html#/missing, assert the Page not found heading, use Return to shelf, and assert the Book title input is visible. Run all browser tests.

```check
run "npm run test:browser" stdout="3 passed" timeout=120
```

```hints
nudge: Use the existing arrange, act and assert pattern.
concept: Assert the destination after following recovery, not only the presence of a link.
shape: Use getByRole for the heading/link and getByLabel for the destination input.
```

## Diagnose, explain and review

Temporarily disable the storage effect and confirm the reload assertion fails. Restore it. Temporarily remove the focus call and confirm the focused assertion fails. Restore it. Compare these failures with a missing browser executable. Add manual keyboard and screen-reader observations: role locators are not an accessibility audit.

### Explain it without the reference

Explain the input, state transition and observable output of your change. Predict a failure before introducing it, record what actually happened, restore the code and rerun the check. Write the observed result, your explanation and one case these checks do not establish in your learning journal.
