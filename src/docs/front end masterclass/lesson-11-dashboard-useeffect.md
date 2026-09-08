# Lesson 11 — useEffect, and Your First Custom Hook

## What you'll learn
- `useEffect` — code that runs in response to rendering, not in response to a user event
- Dependency arrays — what they actually control, and the empty-array/no-array/some-values distinction
- The cleanup function — `useEffect`'s answer to Lesson 4's `clearInterval`/`clearTimeout` discipline
- Writing your own custom hook — extracting reusable stateful logic into a function starting with `use`

## What you'll build
A weather dashboard in React — Lesson 8's app, rebuilt, fetching automatically
whenever the searched city changes, with the fetch/loading/error logic
extracted into a reusable `useWeather` custom hook.

## The question
Every `useState` setter call you've written so far has been triggered by a
user action — a click, a keystroke. Fetching weather data, though, needs to
happen right when the component first appears on screen, *before* any click
has happened at all. What triggers code to run in response to "this
component just rendered" rather than "the user just did something"?

## 1. Predict

You already used `async`/`await` and `fetch` directly inside an event
handler function in Lesson 9-and-earlier-style code (well, Lesson 6/8's
vanilla version). Predict: could you just call an `async` function directly
in the body of a component function, the same way `Board` in Lesson 10
called `calculateWinner(squares)` directly? What might go wrong if a
component's function body — which React calls fresh on every single
render — directly triggered a network request every time it ran?

## 2. Try it

Create `src/lesson-11-dashboard-react/index.html`, same React+Babel CDN
setup as Lessons 9-10.

### Building up to it: the wrong way first

```jsx
function BrokenWeather({ city }) {
  const [weather, setWeather] = React.useState(null);

  fetch("https://api.open-meteo.com/v1/forecast?latitude=40&longitude=-74&current_weather=true")
    .then((res) => res.json())
    .then((data) => setWeather(data.current_weather));

  return <p>{weather ? weather.temperature + "°C" : "Loading..."}</p>;
}
```

### What this code does — and why it's the wrong shape

**`fetch(...)` called directly in the component body, outside any handler**
- Recall: React calls a component function **every single time it
  re-renders** — and calling `setWeather(...)` (inside the `.then`) is
  itself exactly what *triggers* a re-render. Trace this through: render →
  `fetch` starts → eventually `setWeather` is called → this triggers a
  re-render → the component function runs again from the top → `fetch`
  starts *again* → eventually `setWeather` is called again → triggers
  another re-render → ...
- **This is an infinite loop of network requests**, each one re-triggering
  the next. This is the direct answer to your Predict question: directly
  triggering an async operation (or *any* side effect) in a component body
  is dangerous specifically because the body re-runs on every render, and
  if the side effect itself can cause a re-render (which state updates
  always do), you get exactly this runaway cycle.

## 3. Why — `useEffect` as the fix

```jsx
function Weather({ city }) {
  const [weather, setWeather] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      setIsLoading(true);
      setError(null);

      try {
        const geoResponse = await fetch(
          "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city)
        );
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
          throw new Error("City not found");
        }

        const { latitude, longitude } = geoData.results[0];
        const weatherResponse = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=" + latitude +
          "&longitude=" + longitude + "&current_weather=true"
        );
        const weatherData = await weatherResponse.json();

        if (!cancelled) {
          setWeather(weatherData.current_weather);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }

    fetchWeather();

    return () => {
      cancelled = true;
    };
  }, [city]);

  if (isLoading) return <p>Loading weather for {city}...</p>;
  if (error) return <p>Error: {error}</p>;
  return <p>{city}: {weather.temperature}°C, {weather.windspeed} km/h wind</p>;
}
```

### Code walkthrough

**`React.useEffect(() => { ... }, [city]);`**
- `useEffect` is another hook (same family as `useState`), taking **two**
  arguments: a function containing the side effect, and a **dependency
  array**.
- The function runs **after** React has rendered/updated the DOM for this
  component — not during rendering itself, which is why it's safe to
  trigger a fetch or any other side effect here that a plain component body
  cannot safely do.
- **`[city]` — the dependency array — is what controls *when* the effect
  re-runs.** React compares each value in this array to its value from the
  *previous* render; if any value differs, the effect function runs again.
  If `[city]` is unchanged between renders, the effect is skipped entirely
  on that render.
- **The three possible forms, and what each means** (worth memorizing
  precisely, since this is a frequent source of bugs):
  - **No array at all** (`useEffect(() => {...})`) — runs after *every*
    single render, no exceptions. Rarely what you want.
  - **Empty array** (`useEffect(() => {...}, [])`) — runs exactly *once*,
    after the very first render, and never again (since an empty array
    never "changes" between renders — there's nothing in it to compare).
  - **Array with values** (`useEffect(() => {...}, [city])`, as used here)
    — runs after the first render, and again any time `city` specifically
    changes between one render and the next; changes to other props/state
    *not* listed in the array do not re-trigger it.

**`async function fetchWeather() { ... } fetchWeather();`** (defined and
called *inside* the effect)
- **The function passed directly to `useEffect` cannot itself be `async`.**
  This is a real constraint worth understanding, not just a syntax rule:
  `useEffect`'s function is expected to *optionally* return a cleanup
  function directly (see below); an `async` function always returns a
  `Promise` instead, which `useEffect` cannot correctly interpret as a
  cleanup function. The standard workaround — used here — is defining a
  separate `async` function *inside* the effect, then calling it
  immediately, so the outer effect function itself stays synchronous.

**`let cancelled = false;` ... `if (!cancelled) { setWeather(...); ... }` ...
`return () => { cancelled = true; };`**
- This is the **cleanup function** — the value `useEffect`'s callback
  returns. React calls this cleanup function right before running the
  effect again (when a dependency changes) and also when the component is
  removed from the screen entirely.
- **Why is this needed here specifically?** This directly solves Lesson
  8's unresolved race-condition trap. If `city` changes quickly (e.g. a
  user searches "London" then immediately "Paris" before London's fetch
  finishes), the *first* effect's cleanup runs (setting that call's own
  `cancelled` to `true`) right before the *second* effect starts fresh with
  its own independent `cancelled` variable. When London's slow-arriving
  response finally comes back, `cancelled` (that specific effect run's own
  variable, captured via closure) is `true`, so its `setWeather` call is
  skipped — preventing London's stale result from ever overwriting Paris's
  already-displayed one.
- **This is the direct parallel to Lesson 4's `clearInterval`/`clearTimeout`
  discipline** — both are answers to the same underlying question: "how do
  you stop something you started earlier from having an effect later, once
  it's no longer relevant?" Timers needed explicit cancellation via a
  stored ID; effects need an explicit cleanup function returned from the
  effect itself, called automatically by React at the right moment.

**`if (isLoading) return <p>...</p>; if (error) return <p>...</p>; return <p>...</p>;`**
- **Multiple `return` statements in a component function** — new to this
  lesson, though not a new *concept*: this is exactly the "check the
  loading flag, then the error, then the success case" branching from
  Lesson 8's `render()` function, just written as three early returns
  instead of one `if`/`else if`/`else` chain building up a single string.
  Whichever branch's condition is `true` first, that branch's JSX is what
  gets rendered — the rest of the function body below it simply never runs
  for that render.

### What happens

`Weather` renders once with `isLoading` true, showing "Loading..." —
*then*, after that render completes, the effect runs, kicking off the
two-step fetch. When it resolves, `setWeather`/`setIsLoading` calls trigger
a re-render showing the real data. If `city` (the prop) ever changes, the
cleanup from the *previous* effect run fires first (marking that run
cancelled), then the effect re-runs for the new city.

## 4. Change one thing

```diff
   React.useEffect(() => {
     let cancelled = false;
     async function fetchWeather() { ... }
     fetchWeather();
     return () => { cancelled = true; };
-  }, [city]);
+  }, []);
```

**What changed:** the dependency array, from `[city]` to `[]`.
**What did not change:** the effect's own code — fetching, cancellation
logic, everything inside the function body is identical.
**Predict, then verify:** with `[]`, the effect now runs exactly once, when
`Weather` first mounts, using whatever `city` was at that moment — and
**never again**, even if the `city` prop later changes. This is a subtle,
common real bug: the component would keep displaying the *original* city's
weather forever, silently ignoring prop changes, because nothing tells
React "also re-run this when `city` changes" — the dependency array is the
only thing that does.

## 5. Put it in the project — extracting a custom hook

The fetch-with-cancellation logic above is reusable — nothing about it is
specific to how the JSX renders. Pulling it into its own function is a
**custom hook**:

```jsx
function useWeather(city) {
  const [weather, setWeather] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      setIsLoading(true);
      setError(null);
      try {
        const geoResponse = await fetch(
          "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city)
        );
        const geoData = await geoResponse.json();
        if (!geoData.results || geoData.results.length === 0) {
          throw new Error("City not found");
        }
        const { latitude, longitude } = geoData.results[0];
        const weatherResponse = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=" + latitude +
          "&longitude=" + longitude + "&current_weather=true"
        );
        const weatherData = await weatherResponse.json();
        if (!cancelled) {
          setWeather(weatherData.current_weather);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }

    fetchWeather();
    return () => { cancelled = true; };
  }, [city]);

  return { weather, isLoading, error };
}

function Dashboard() {
  const [cityInput, setCityInput] = React.useState("Boston");
  const { weather, isLoading, error } = useWeather(cityInput);

  return (
    <div>
      <input value={cityInput} onChange={(e) => setCityInput(e.target.value)} />
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {weather && !isLoading && (
        <p>{weather.temperature}°C, {weather.windspeed} km/h wind</p>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Dashboard />);
```

**`function useWeather(city) { ... return { weather, isLoading, error }; }`**
- A custom hook is, structurally, just a JavaScript function — **the only
  thing making it a "hook" by convention (and by a rule React's tooling
  enforces) is that its name starts with `use`.** This isn't cosmetic:
  React's own hooks (`useState`, `useEffect`) can only be called from inside
  component functions or other hooks, and the `use` prefix is how tooling
  (and other developers) recognize "this function itself calls hooks
  internally, so it must follow the same calling rules."
- It bundles exactly the state and effect logic from the `Weather`
  component above, but returns the *data* (`{ weather, isLoading, error }`)
  instead of returning JSX — decoupling "how to fetch and track weather"
  from "how to display it."

**`const { weather, isLoading, error } = useWeather(cityInput);`** (inside
`Dashboard`)
- Calling a custom hook looks exactly like calling any function, with one
  important detail: `useWeather` internally calls `useState`/`useEffect`
  three and one times respectively, and those hook calls become tied to
  *this specific call site*, inside *this specific component*, on every
  render — the same "hooks are per-component-instance" rule from Lesson
  10's broken `Square` example, just now wrapped inside a function you wrote
  yourself instead of a component.
- Destructuring immediately pulls out the three named values `Dashboard`
  needs — `Dashboard` itself never needs to know *how* those values are
  produced, only what they mean, exactly mirroring how `TodoItem` (Lesson 9)
  never needed to know how `toggleTodo` worked, only that calling it did
  something useful.

**`{isLoading && <p>Loading...</p>}`**
- `&&` used directly inside JSX as a conditional-rendering idiom: if
  `isLoading` is `true`, the expression evaluates to the `<p>` element
  (rendered); if `false`, it evaluates to `false` itself, which React
  specifically knows to render as *nothing* (not the literal text "false").
  This is the JSX-idiomatic alternative to an early `if`/`return`, useful
  when you want to conditionally include *part* of the output rather than
  the whole return value.

### What happens

`Dashboard` starts with `cityInput` = `"Boston"`; `useWeather("Boston")`
kicks off its own internal effect immediately. Typing in the input updates
`cityInput` on every keystroke — and because `useWeather`'s effect depends
on `[city]` internally, **every keystroke that changes the string would
re-trigger a fetch**, worth noticing as a real (if currently unaddressed)
inefficiency — a natural setup for the "debounce" exercise below.

## 6. Trap

Predict, then test: type a few characters into the city input quickly (e.g.
"B", "Bo", "Bos", "Bost"...).

Run it — you'll see loading flicker rapidly, or possibly an error for each
incomplete, invalid partial city name, because **every single keystroke is
its own `city` change, triggering its own effect run, fetch, and (correctly,
thanks to the cleanup function) cancellation of the previous one.** The
cancellation logic prevents *stale data* from ever showing — that part
works correctly — but it does nothing to prevent the *wasted network
requests* themselves from firing on every keystroke. **The trap: cleanup
functions solve the correctness problem (never show stale results) but not
the efficiency problem (don't fire requests you don't need)** — these are
two separate concerns, easy to conflate as "the same problem, solved."

## 7. Exercise

Pick at least one:

- **Repair (conceptual):** Research what "debouncing" means in the context
  of input handling — you don't need to implement it fully here, but write
  down, in your own words, roughly where in `Dashboard` a debounce would
  need to sit, and why it wouldn't belong *inside* `useWeather` itself.
- **Predict:** If `useWeather`'s dependency array were `[]` instead of
  `[city]`, what would typing in the input actually change on screen, if
  anything?
- **Modify:** Add a `useEffect` with an empty dependency array to `Dashboard`
  that logs `"Dashboard mounted"` to the console exactly once, to directly
  observe the empty-array behavior for yourself.
- **Trace:** Write out, step by step, what happens — including which
  `cancelled` variable belongs to which effect run — when a user changes
  the city from "Boston" to "Denver" while Boston's fetch is still pending.

## What to remember
- `useEffect` runs *after* rendering, in response to dependency-array
  changes — never call it to synchronously compute what to render; use it
  for side effects (fetching, subscriptions, timers) instead.
- The dependency array's three forms (none / empty / with values) mean
  three genuinely different things — "every render," "once, ever," and
  "when these specific values change" — not variations on the same idea.
- A cleanup function (returned from the effect) is `useEffect`'s version of
  `clearInterval`/`clearTimeout` — necessary to prevent stale, out-of-order
  async results from overwriting newer ones.
- A custom hook is just a function whose name starts with `use` and which
  internally calls other hooks — it extracts reusable stateful logic,
  returning data (or nothing) rather than JSX.

## Next lesson
Lesson 12 closes Phase C with a canvas game rebuilt inside React —
`useRef` as the tool for reaching into the actual DOM canvas element (React
doesn't manage canvas drawing itself), and how an imperative
`requestAnimationFrame` loop (Lesson 5) coexists with React's declarative
render cycle without fighting it.
