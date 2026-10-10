// eslint-disable-next-line import/no-unresolved
import lesson01 from "./01-your-first-endpoint.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson02 from "./02-a-router-built-by-hand.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson03 from "./03-path-parameters.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson04 from "./04-query-parameters.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson05 from "./05-post-bodies-and-validation.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson06 from "./06-controllers.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson07 from "./07-middleware.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson08 from "./08-services.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson09 from "./09-persistence.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson10 from "./10-the-query-problem.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson11 from "./11-repositories.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson12 from "./12-dependency-injection.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson13 from "./13-real-sql.md?raw";
// eslint-disable-next-line import/no-unresolved
import lesson14 from "./14-authentication.md?raw";

export interface LessonMeta {
  id: string;
  title: string;
  content: string;
  checklist: string[];
}

export const LESSONS: LessonMeta[] = [
  {
    id: "01",
    title: "Lesson 1 — Your First Endpoint",
    content: lesson01,
    checklist: [
      "You've run the starter successfully, changed its response, and deliberately renamed then restored the handler to understand a missing-function error",
      "handleRequest returns a real { status: 200, body: ... } response for /users",
      "A path other than /users correctly returns a 404",
      "You can explain what a function parameter is and what return does, in your own words",
      "You can explain the difference between a parameter and an argument",
      "You can explain what an object is, how dot notation reads a value off one, and what reference semantics means for an object like request",
      "You can explain what an array is, how to index into one starting at 0, and when an array is the right tool instead of an object",
      "You can explain the client-server model, using this lab's Postman panel as the client",
      "You can explain what inversion of control means, using this lab's hidden bridge as the example",
      "You can explain the difference between this project's conventions (handleRequest, status, body) and real JavaScript language features",
      "You can explain why every request currently re-runs your entire file from scratch, what \"stateless\" means, and why a real server's lifecycle doesn't work that way",
      "You can explain why status codes are a real, extensible protocol rather than a fixed list",
      "You can explain the difference between dispatch by computation and dispatch by lookup, and why one long if/else chain won't scale to a real backend with many routes",
    ],
  },
  {
    id: "02",
    title: "Lesson 2 — A Router, Built By Hand",
    content: lesson02,
    checklist: [
      "/users, /orders, and /products all return their correct data through the routes dispatch table",
      "An unregistered path still correctly returns a 404",
      "You can explain what it means for functions to be first-class values in this language",
      "You can explain what a dictionary/hash map is, using routes as the example, and how a dictionary differs from a hash map from a plain JS object",
      "You can explain the open/closed principle, using this lesson's before-and-after as the concrete case",
      "You can correctly use the words route, handler, and router without confusing them",
      "You can explain why storing getUsers(request) instead of getUsers in the dispatch table would be a real, specific bug",
      "You can explain what a callback is, using a stored handler function as the example",
      "You can explain why a dictionary lookup doesn't get slower as more routes are added, unlike the if/else chain it replaced",
      "You can explain what indirection means, using handler(request) versus calling getUsers(request) directly as the example",
      "You can explain why the handlers don't know the router exists, and why that dependency direction matters",
      "You can explain the difference between registering a route and executing its handler",
      "You can explain what late binding means, using routes[request.path] as the example",
      "You can explain the difference between scalability and extensibility, using this lesson's lookup speed and open/closed property as the two examples",
      "You can explain why handleRequest is now infrastructure rather than application logic",
    ],
  },
  {
    id: "03",
    title: "Lesson 3 — Path Parameters",
    content: lesson03,
    checklist: [
      "/users/1, /users/2, and any other /users/<id> all return a per-id response through one route",
      "/users (no id) still correctly returns the full list, unaffected by the new pattern",
      "An unmatched path still correctly returns a 404",
      "You can explain what .split(\"/\") does to a path string and why the result has an empty first entry",
      "You can explain what a placeholder segment (:id) means inside a route pattern",
      "You can explain why the segment-count check has to happen before comparing individual segments",
      "You can explain why more specific patterns should be listed before more general ones",
      "You can explain why matchRoute counts as an algorithm, not just \"some code\"",
      "You can explain what a sentinel value is, using matchRoute's null return as the example",
      "You can explain why this lesson's router is slower, in the worst case, than lesson 2's dispatch table, and why that trade was necessary",
      "You can explain reference semantics using request.params as the example, connecting it back to lesson 1",
    ],
  },
  {
    id: "04",
    title: "Lesson 4 — Query Parameters",
    content: lesson04,
    checklist: [
      "/users with no query string still returns every user",
      "/users?limit=1 returns exactly one user; /users?limit=2 returns exactly two",
      "/users?limit=abc returns an empty array, not a crash - and you can explain why",
      "You can explain the difference between a resource and a representation of that resource",
      "You can explain the difference between what a path segment answers and what a query parameter answers",
      "You can explain why every query parameter arrives as a string, even ones that look numeric",
      "You can explain the difference between parsing a query string and interpreting what its values mean",
      "You can explain what truthiness is, and why ?limit= and ?limit=0 land in different branches",
      "You can explain what makes a GET request stateless and idempotent",
      "You can explain why independent if blocks per query parameter are composable, and what would go wrong without that independence",
      "You can explain the difference between conversion and validation, using ?limit=-5 as an example that converts cleanly but isn't valid",
    ],
  },
  {
    id: "05",
    title: "Lesson 5 — POST Bodies and Validation",
    content: lesson05,
    checklist: [
      "POST /users with a valid { \"name\": ... } body returns a 201 with the new user",
      "POST /users with an empty or malformed body returns a 400, not a crash",
      "POST /users with valid JSON but no name field returns a 400 naming the missing field",
      "GET /users and POST /users are correctly told apart, even though they share a path",
      "You can explain the difference in meaning between the GET and POST HTTP methods",
      "You can explain what try/catch does and why JSON.parse specifically can throw",
      "You can explain why validation should happen before any other work in a handler, not after",
      "You can explain what continue does inside the router's loop, and how it differs from return and from break",
      "You can explain the difference between a safe method and an idempotent method, using GET and POST as the examples",
      "You can explain the difference between an exception and an ordinary return value as two ways of signaling failure, using createUser's two error paths as the example",
      "You can name the two distinct failure modes this lesson identifies and why they need different defenses",
    ],
  },
  {
    id: "06",
    title: "Lesson 6 — Controllers",
    content: lesson06,
    checklist: [
      "usersController and ordersController both have a getAll, with no naming collision",
      "The router matches on both pattern and method before calling a handler",
      "/users, /users/:id, and POST /users all still work exactly as they did before the refactor",
      "You can explain what a namespace collision is, using two same-named top-level functions as the example",
      "You can explain why organization, not just naming, is the deeper problem this lesson solves",
      "You can explain what scope means, and why the collision above is specifically a global scope problem",
      "You can explain the difference between a function and a method",
      "You can explain what domain decomposition means and how it differs from organizing by verb",
      "You can explain what discoverability means and why it's a practical reason to organize code",
      "You can explain what a hierarchical namespace is, using usersController.getAll as the example",
      "You can explain encapsulation as hiding, not just bundling, and how it differs from lesson 1's use of the term",
      "You can explain cohesion and how it relates to (but differs from) lesson 2's decoupling, and how locality relates to cohesion",
      "You can explain why usersController.getAll (no parentheses) is required inside the routes list, not usersController.getAll()",
      "You can explain what happens if a controller object literal accidentally defines the same key twice",
      "You can explain how this lesson kept the router's interface stable while completely changing the implementation underneath it",
      "You can explain the difference between changing a system's organization and changing its behavior, using this lesson's refactor as the example",
    ],
  },
  {
    id: "07",
    title: "Lesson 7 — Middleware",
    content: lesson07,
    checklist: [
      "GET /users still works and is logged",
      "POST /users with no Authorization header returns a real 401, and createUser never runs",
      "POST /users with an Authorization header set (any value) succeeds exactly as it did before this lesson",
      "You can explain DRY and how it names the exact problem duplicated logging created",
      "You can explain what a cross-cutting concern is, using logging and auth as the two examples",
      "You can explain why logRequest returns null even though nothing used its return value at first",
      "You can explain the Chain of Responsibility pattern, using the middleware array as the example",
      "You can explain how this lesson's pipeline extends lesson 4's pipeline definition with early exit",
      "You can explain why this lesson's \"auth\" is not real authentication",
      "You can explain why logRequest is listed before requireAuth, and what would go quietly wrong if the order were reversed",
    ],
  },
  {
    id: "08",
    title: "Lesson 8 — Services",
    content: lesson08,
    checklist: [
      "POST /users with a valid name still returns a 201, unchanged from lesson 5",
      "POST /users with a missing name still returns a 400 with the same message, unchanged from lesson 5",
      "usersService.create never reads request or returns a status field",
      "You can explain the difference between an HTTP-layer concern and a domain-layer concern, using this lesson's two validations as the examples",
      "You can explain why HTTP-independence, not purity itself, is the property that actually matters here",
      "You can explain what a result object is and how it relates to lesson 5's exceptions-vs-return-values distinction",
      "You can explain what would break if usersService read request.headers directly",
      "You can explain dependency direction between a controller and a service, and why it only points one way",
      "You can explain inversion of responsibility, using the controller's shift from deciding to asking as the example",
      "You can explain what a domain is and why business rules tend to outlive their transport",
    ],
  },
  {
    id: "09",
    title: "Lesson 9 — Persistence",
    content: lesson09,
    checklist: [
      "POST /users followed by GET /users shows the created user, in the same response list",
      "Two separate POST /users calls produce two different, auto-incrementing ids",
      "You can explain why db is a convention this lab provides, not a JavaScript language feature",
      "You can explain what survives requests and reloads, and why browser storage still needs a backup",
      "You can explain the difference between volatile and durable storage",
      "You can explain why usersController never needed to change in this lesson, even though storage completely did",
      "You can explain what would happen, and what wouldn't be caught, if a handler called db.insertUser directly instead of going through usersService",
      "You can explain what state means and why this project had none before this lesson",
      "You can explain why HTTP itself is still stateless, even though this project now has application state",
      "You can explain what a side effect is, using usersService.create before and after this lesson as the example",
      "You can explain why an id serves a different purpose than a name",
      "You can explain what shared mutable state means, using db as the example",
      "You can explain the difference between reading state and writing state, and how it connects to lesson 4's idempotence",
    ],
  },
  {
    id: "10",
    title: "Lesson 10 — The Query Problem",
    content: lesson10,
    checklist: [
      "GET /users with no query string still returns everyone",
      "GET /users?name=Priya returns only users with that exact name",
      "GET /users?id=1 returns the correct user, despite id being a stored number compared against a string",
      "You can explain what Object.keys returns and why this function needed it",
      "You can explain what a predicate is, using matchesFilters as the example",
      "You can explain why String(user[key]) is necessary, connecting it back to lesson 4's \"everything from a query string is a string\" rule",
      "You can explain why adding a new filterable field requires zero new code in this mechanism",
    ],
  },
  {
    id: "11",
    title: "Lesson 11 — Repositories",
    content: lesson11,
    checklist: [
      "POST /users and GET /users?name=... behave identically to lesson 10",
      "usersService no longer references db or findUsers anywhere",
      "You can explain what a repository is and what specific concern it isolates",
      "You can explain what CRUD stands for and name which repository method corresponds to each letter so far",
      "You can explain why a fake, array-backed repository could replace usersRepository in a test without changing usersService at all",
      "You can explain the difference between coupling and cohesion, using this lesson's before-and-after as the concrete case",
      "You can explain what an abstraction is, using usersRepository's two methods as the example",
      "You can explain why the real and fake repositories are an example of polymorphism",
      "You can explain, in your own words, what the Dependency Inversion Principle means",
      "You can explain when a repository layer is genuinely worth adding, and when it's unnecessary overhead",
    ],
  },
  {
    id: "12",
    title: "Lesson 12 — Dependency Injection",
    content: lesson12,
    checklist: [
      "usersService, built via makeUsersService(usersRepository), behaves identically to lesson 11",
      "A second service, built via makeUsersService(fakeRepository), reads and writes only the fake array, never real db data",
      "You can explain what a closure is, using search's access to repository as the example",
      "You can explain dependency injection and how it relates to lesson 1's inversion of control",
      "You can explain the difference between tight coupling (Step 1) and loose coupling (Step 2), using usersService's two versions as the example",
      "You can explain why a missing dependency (makeUsersService() with no argument) fails when a method is called, not when the factory is called",
    ],
  },
  {
    id: "13",
    title: "Lesson 13 — Real SQL",
    content: lesson13,
    checklist: [
      "usersRepository.findAll/.insert, rewritten with db.query, behave identically to lesson 11's version",
      "The SQL console tab, running SELECT * FROM users;, shows a user created through a normal POST /users request",
      "You can explain what a placeholder (?) is and why it's different from concatenating a value into a SQL string",
      "You can reproduce the SQL injection example and explain, in your own words, why it returns every user",
      "You can explain what PRIMARY KEY, AUTOINCREMENT, and NOT NULL each guarantee about the users table",
      "You can explain what last_insert_rowid() is for and why an INSERT statement alone doesn't return it",
    ],
  },
  {
    id: "14",
    title: "Lesson 14 — Authentication",
    content: lesson14,
    checklist: [
      "Registering, then logging in with the correct password, returns a real token",
      "Logging in with the wrong password returns a 401, identical in wording to a nonexistent username",
      "A protected route rejects a missing token and a made-up token, and accepts a real one from a successful login",
      "You can explain what a one-way hash function is and why the original password can't be recovered from it",
      "You can explain why plain SHA-256 alone isn't sufficient for real production password storage",
      "You can explain why Math.random() is unsuitable for generating a security token",
      "You can explain why the missing-token check has to happen before querying the database with it",
    ],
  },
];
