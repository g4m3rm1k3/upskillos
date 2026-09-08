# Lesson 8 — The Weather Dashboard

## What you'll learn
- Centralizing an app's entire state in one class instance, instead of scattered top-level variables
- The difference between a method that *changes* state and a method that *renders* it — and why keeping that boundary sharp matters
- Combining everything from Phases A and B: fetch, async/await, DOM rendering, classes, error handling
- Exactly why this pattern is what React formalizes — set up deliberately, right before Phase C

## What you'll build
A small dashboard: type a city name, fetch current weather for it, display
temperature/conditions, keep a short history of recently searched cities.

## The question
Lesson 6's `QuoteService` bundled *one* piece of behavior (fetching a quote)
into a class. This app has several pieces of state that all change together
and depend on each other: the current search text, the fetched weather data,
a loading flag, an error message, and a search history list. If each of
those lived as a separate top-level `let`, how many places in your code would
need to remember to keep them all consistent with each other?

## 1. Predict

You've now built four apps with scattered top-level `let`/`const` variables
(Lessons 1, 2, 3's `todos`, 6's `quoteService` alongside separate DOM
variables). Predict: what would change if instead of five separate top-level
variables for this app's data, you had **one** object — say, `appState` —
containing all five as properties? What becomes easier? What, if anything,
becomes harder?

## 2. Try it

Create `src/lesson-08-weather-dashboard/index.html`, `style.css`,
`script.js`. This lesson uses `https://api.open-meteo.com` (no API key
required) via a small two-step lookup: first geocode the city name to
coordinates, then fetch weather for those coordinates.

**`index.html`**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Weather Dashboard</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <input type="text" id="city-input" placeholder="Enter a city">
  <button id="search-btn">Search</button>
  <div id="result"></div>
  <ul id="history"></ul>
</body>
<script src="script.js"></script>
</html>
```

### The `WeatherState` class

```js
class WeatherState {
  constructor() {
    this.currentCity = null;
    this.currentWeather = null;
    this.isLoading = false;
    this.error = null;
    this.history = [];
  }

  startLoading(city) {
    this.currentCity = city;
    this.isLoading = true;
    this.error = null;
  }

  setWeather(weather) {
    this.currentWeather = weather;
    this.isLoading = false;
    this.error = null;
    if (!this.history.includes(this.currentCity)) {
      this.history.unshift(this.currentCity);
      this.history = this.history.slice(0, 5);
    }
  }

  setError(message) {
    this.error = message;
    this.isLoading = false;
    this.currentWeather = null;
  }
}
```

### What this code does

**`this.currentCity = null; this.currentWeather = null; ...`**
- Five properties, all initialized in one place, describing the *entire*
  meaningful state of this app. Anyone reading just the constructor can see
  every piece of data the app tracks — nothing is hidden in some function
  three hundred lines down that happens to declare its own `let`.

**`startLoading(city) { this.currentCity = city; this.isLoading = true; this.error = null; }`**
- A method whose entire job is to **transition state**, in one consistent
  bundle, for one specific moment in the app's lifecycle (a search just
  began). Notice it sets *three* related properties together — `isLoading`
  to `true` and `error` back to `null` always happen together with starting
  a new search; there's no way to call this method and accidentally leave
  a stale error message showing from a previous failed search while a new
  one loads.
- **This is the direct answer to your Predict question.** With five separate
  top-level `let`s, "start loading" would mean four separate assignment
  lines scattered wherever a search begins — and if you ever added a search
  trigger somewhere else in the app (say, clicking a history item), you'd
  have to remember to repeat all four lines correctly there too. As one
  method, that logic exists exactly once, and *is* the single definition of
  "what does starting a search mean."

**`setWeather(weather) { ... if (!this.history.includes(this.currentCity)) { this.history.unshift(this.currentCity); this.history = this.history.slice(0, 5); } }`**
- `.includes(...)` — an array method checking whether a value is present,
  returning a boolean. Prevents duplicate entries in the history list.
- `.unshift(...)` — same method from Lesson 7's snake, adding to the front
  (most recent search shown first).
- `.slice(0, 5)` — returns a **new** array containing elements from index 0
  up to (not including) index 5, i.e. the first five. **Unlike `.push`,
  `.pop`, `.unshift`, and `.splice` (all of which mutate the array in
  place), `.slice` does not modify the original array — it returns a copy.**
  This distinction — mutating methods vs. methods that return a new copy —
  becomes important again, more strictly, in React (Lesson 9 onward), where
  mutating state arrays directly is actively discouraged. This line is
  deliberately written the way React will later require, as a preview.
- Together: cap the history at 5 most-recent, no-duplicate entries — all as
  one method's responsibility, not logic repeated at every call site that
  might add to history.

**`setError(message) { this.error = message; this.isLoading = false; this.currentWeather = null; }`**
- Same bundling idea as `startLoading`: an error state means *simultaneously*
  storing the message, ending the loading state, and clearing out any
  previous weather data — three properties, one coherent transition, defined
  once.

### The service — geocoding + weather, two chained fetches

```js
class WeatherService {
  async getWeatherForCity(city) {
    const geoResponse = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city)
    );
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("City not found");
    }

    const { latitude, longitude, name } = geoData.results[0];

    const weatherResponse = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=" + latitude +
      "&longitude=" + longitude + "&current_weather=true"
    );
    const weatherData = await weatherResponse.json();

    return {
      city: name,
      temperature: weatherData.current_weather.temperature,
      windspeed: weatherData.current_weather.windspeed
    };
  }
}
```

**`encodeURIComponent(city)`**
- A built-in function that escapes characters unsafe or meaningful in a URL
  (spaces, `&`, `?`, accented characters) into a URL-safe encoded form. If a
  user types "New York" and this were omitted, the raw space would either
  break the URL or be silently mishandled — this is a small, easy-to-forget
  detail specifically about *combining* user input with URLs, distinct from
  anything covered in Lesson 6.

**`if (!geoData.results || geoData.results.length === 0) { throw new Error("City not found"); }`**
- `||` (logical OR) covers two distinct failure shapes defensively: the API
  might return no `results` property at all (`!geoData.results` catches
  `undefined`), or it might return `results` as a present-but-empty array
  (`.length === 0` catches that separately). Either condition alone is
  enough to mean "nothing usable came back" — this is the same
  `response.ok`-style defensive check from Lesson 6, applied to the *shape*
  of the data itself rather than the HTTP status.

**`const { latitude, longitude, name } = geoData.results[0];`**
- **Destructuring** — pulls three named properties out of one object
  directly into three separate variables, in one line. Equivalent to
  writing:
  ```js
  const latitude = geoData.results[0].latitude;
  const longitude = geoData.results[0].longitude;
  const name = geoData.results[0].name;
  ```
  but without repeating `geoData.results[0]` three times. This syntax
  appears constantly in React code from Lesson 9 onward — worth being
  comfortable with it now, in a context you already understand.

**Second `fetch` call, using `latitude`/`longitude` from the first result**
- This is the concrete case your Predict-section-1 "callback hell" question
  gestured at back in Lesson 6: step two genuinely depends on step one's
  result. Written with `await`, this reads as plain sequential code — get
  the geocoding result, *then* use it to build the next URL, `await` that
  too. Try mentally rewriting this with `.then()` chains instead, if you
  want to feel directly why `await` was worth learning.

### Wiring it together

```js
const state = new WeatherState();
const service = new WeatherService();

const input = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const resultDiv = document.getElementById("result");
const historyList = document.getElementById("history");

function render() {
  if (state.isLoading) {
    resultDiv.textContent = "Loading weather for " + state.currentCity + "...";
  } else if (state.error) {
    resultDiv.textContent = "Error: " + state.error;
  } else if (state.currentWeather) {
    resultDiv.textContent =
      state.currentWeather.city + ": " + state.currentWeather.temperature + "°C, " +
      state.currentWeather.windspeed + " km/h wind";
  } else {
    resultDiv.textContent = "Search for a city to see the weather.";
  }

  historyList.innerHTML = "";
  state.history.forEach(function (city) {
    const li = document.createElement("li");
    li.textContent = city;
    li.addEventListener("click", function () {
      runSearch(city);
    });
    historyList.appendChild(li);
  });
}

async function runSearch(city) {
  state.startLoading(city);
  render();

  try {
    const weather = await service.getWeatherForCity(city);
    state.setWeather(weather);
  } catch (error) {
    state.setError(error.message);
  }

  render();
}

searchBtn.addEventListener("click", function () {
  const city = input.value.trim();
  if (city !== "") runSearch(city);
});
```

### Code walkthrough — the pattern this whole lesson is building toward

**`function render() { ... }` reads `state.*` but never writes to it.**
- This is the sharp boundary the "What you'll learn" section promised.
  `render` has exactly one job: look at whatever `state` currently contains,
  and produce matching DOM output — the same "state → DOM sync" idea from
  Lesson 1's counter, and the same "wipe and rebuild" list pattern from
  Lesson 3's todos, now applied to an entire multi-piece app state at once
  rather than one variable or one array.
- **`render` never calls `state.startLoading` or `state.setWeather` or
  mutates any state property directly.** This one-directional rule — state
  methods change data, `render` only reads it — is deliberately the exact
  shape of a React component's render function, which you'll meet directly
  in Lesson 9. You are, by hand, already doing what a React component does
  automatically.

**`async function runSearch(city) { state.startLoading(city); render(); try { ... } catch (error) { state.setError(...); } render(); }`**
- Notice `render()` is called **twice** — once immediately after
  `startLoading` (so the loading message appears right away, before the
  `await` pauses this function), and once again after the `try`/`catch`
  resolves (so the final result or error appears). **Every state change is
  immediately followed by a `render()` call** — this pairing, repeated
  everywhere state changes in this file, is the exact manual chore Lesson 9
  eliminates: React re-renders automatically whenever state changes, so you
  stop needing to remember to call `render()` yourself after every mutation.

**`li.addEventListener("click", function () { runSearch(city); });`** (inside
the `history.forEach` in `render`)
- Attaching a fresh listener to each newly created `<li>`, every time
  `render()` runs — following the same "clear and rebuild" pattern as
  Lesson 3, including its consequence: since `historyList.innerHTML = ""`
  destroys old list items (and their listeners) every render, fresh
  listeners on the fresh elements are both necessary and automatically
  correct, with no leftover stale listeners to worry about.
- Compare to Lesson 3, which used event delegation (one listener on the
  parent `<ul>`) instead — this lesson deliberately shows the *other* valid
  approach (listener per item, re-attached each render) so you've now seen
  both, and can recognize either style later.

### What happens

Typing a city and clicking Search calls `runSearch`, which calls
`state.startLoading` (updating three state properties together) then
`render()` (showing "Loading..."), then awaits the two chained fetches
inside `service.getWeatherForCity`, then either `state.setWeather` or
`state.setError` (again, each updating several related properties together),
then `render()` again to reflect the final outcome.

## 3. Why?

### Mental model

```
ONE state object (WeatherState instance) — single source of truth
   ↓
methods on state (startLoading / setWeather / setError)
   — the ONLY places state properties are ever assigned
   ↓
render() — the ONLY place state is ever read to produce DOM output
   ↓
called manually, by hand, after every single state change
```

This one-way flow — state methods mutate, `render` reads, nothing reads and
writes in the same place — is the exact discipline this lesson set out to
teach as a bridge. Everything about it is still 100% ordinary JavaScript you
already know; only the *organization* is new.

## 4. Change one thing

```diff
   setWeather(weather) {
     this.currentWeather = weather;
     this.isLoading = false;
     this.error = null;
+    this.lastFetchedAt = new Date();
     if (!this.history.includes(this.currentCity)) {
```

**What changed:** one new property, tracking when the last successful fetch
completed.
**What did not change:** `render()` needed zero changes to keep working
correctly — it simply doesn't display this new property yet. This is worth
noticing precisely: adding new state is safe and additive as long as nothing
*requires* every consumer of state to handle every property; `render` staying
correct without modification here is a small preview of how React components
tolerate new, unused state similarly.

## 5. Put it in the project

Every piece of this lesson — a class as single source of truth, methods that
bundle related mutations, a render function that only reads and never
writes, and the manual "mutate then re-render" pairing — is the exact shape
Lesson 9 hands off to React's `useState`. You are not learning a
"vanilla-only" pattern that gets discarded; you're learning the concept
React formalizes, by hand, first.

## 6. Trap

Predict, then test: search for a real city, then quickly search for a
misspelled/nonexistent one before the first request finishes.

Depending on network timing, you may see the *first* (real) city's weather
flash briefly and then get overwritten by the second search's error — or
vice versa, if the requests resolve out of order. **The trap: nothing in
`runSearch` checks whether it's still the "current" search by the time its
`await` resolves.** If search A starts, then search B starts before A
finishes, and A's network response happens to arrive *after* B's, A's
`state.setWeather(...)` will overwrite B's already-displayed result —
showing stale data as if it were current. This is a real, common class of
bug in async UIs called a **race condition**, and this simple version of the
app doesn't guard against it — worth recognizing as an open edge case rather
than something this lesson silently got right.

## 7. Exercise

Pick at least one:

- **Repair:** Fix the race condition above — give `WeatherState` a
  `searchId` counter, incremented in `startLoading`, and have `runSearch`
  capture the id locally before `await`ing, then check it's still the
  latest id before calling `setWeather`/`setError`. (This is genuinely
  tricky — attempt a prediction of the shape of the fix before looking
  anything up.)
- **Predict:** If `render()` were accidentally called *before*
  `state.startLoading(city)` instead of after, what would the loading
  message briefly (or not-so-briefly) show instead?
- **Modify:** Add a "clear history" button that empties `state.history` via
  a new method (not by reaching into `state.history` directly from outside
  the class) and re-renders.
- **Compare:** Identify every place in this file's code where "change state"
  and "render" are paired together. Is there ever a state change *not*
  immediately followed by a `render()` call? What would happen on screen if
  there were?

## What to remember
- Centralizing related state in one class instance means "what does this
  transition mean" is defined exactly once, as a method — not repeated at
  every call site that needs it.
- `.slice()` returns a new array without mutating the original — different
  from `.push`/`.pop`/`.unshift`/`.splice`, and the direction React state
  updates will require going forward.
- Destructuring (`const { a, b } = obj;`) pulls multiple properties out in
  one line — ordinary syntax, not a new concept, but one you'll see
  constantly starting next lesson.
- The "state methods mutate, render only reads, call render manually after
  every mutation" pattern is not a vanilla-JS quirk — it's the exact model
  React automates starting now.

## Next lesson
Lesson 9 opens Phase C by rebuilding Lesson 3's todo list in React —
directly comparing the two, side by side, so you can see exactly which of
today's manual chores (`render()` calls, `innerHTML = ""` clearing,
listener re-attachment) React's `useState` and JSX take over for you, and
which underlying ideas (state, one-way data flow) carry over completely
unchanged.
