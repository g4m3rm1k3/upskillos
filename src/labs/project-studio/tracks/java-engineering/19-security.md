---
title: Security — identity, permission and browser trust
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

Authentication establishes who is making a request. Authorization decides whether that identity may perform an operation. Neither is established by hiding a button. We add standard session authentication and CSRF protection, then test denial as carefully as success. This is a local learning deployment; internet exposure requires TLS, managed identity and operational review.

## Model the threats before configuration

### Describe an attack as a sequence of requests

Assume an editor has signed in and holds a session cookie. A different web page attempts to cause that browser to submit a state-changing request. The browser can attach cookies automatically, so merely finding a valid session cookie is not enough to establish that the request originated from our intended interaction. CSRF protection adds a token the hostile origin should not be able to obtain through permitted browser access.

A viewer who intentionally writes through an HTTP client is a different case. They can obtain a token for their own authenticated session, but their role must still prohibit mutation. An unauthenticated client is different again. Write all three sequences and expected denials before configuring rules, so one defense is not credited for all threats.

CORS controls which cross-origin browser interactions are permitted; it does not stop a standalone HTTP client from sending a request. TLS protects transport, authentication establishes identity, authorization enforces permissions, and output handling prevents user text becoming executable markup. Each addresses a different boundary. Map a defense to its threat instead of treating a security dependency as a universal guarantee.

Create `decisions/009-threats.md`. Identify task content and session credentials as assets. Consider an unauthenticated visitor, a read-only teammate attempting a write, and a malicious page making a browser send an authenticated request.

A session cookie can be sent automatically by a browser. CSRF protection requires an additional token for state-changing requests to distinguish intentional application requests from cross-site submissions. CORS and CSRF address different browser behaviors; enabling CORS is not authentication.

We use Spring Security instead of writing password verification or session cryptography. Understand its flow and configuration, while delegating cryptographic primitives to maintained libraries. Production identity lifecycle, password reset and abuse prevention remain explicit release concerns.

```check
file decisions/009-threats.md
```

## Add narrowly scoped dependencies

### Review the configuration change like an application change

These dependency declarations reuse the Maven syntax taught earlier. Insert them as siblings of the existing dependency elements, not inside another dependency. The security starter is an application dependency because the running server needs its filters. The security-test library has test scope because user and csrf request helpers belong only in the test environment.

Adding the starter changes application behavior through automatic configuration even before we finish our explicit SecurityConfig. Existing unauthenticated requests can begin failing. That is a dependency-induced behavior change, not evidence that a domain class stopped compiling. Complete the configuration and update tests to exercise the intended identity conditions; do not disable protection merely to recover old test expectations.

In pom.xml, insert these two dependency elements immediately before `</dependencies>`. Type them; do not replace unrelated configuration:

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.security</groupId>
  <artifactId>spring-security-test</artifactId><scope>test</scope>
</dependency>
```

The first installs the request security filter chain. The second provides test identities and CSRF request helpers without shipping test code. Dependency management still supplies versions. Run dependency:tree and identify the transitive security modules. Our existing unauthenticated API test will need updating because denial is now intentional.

## Construct local identities with a password encoder

### Follow identity construction without confusing it with login

`@Configuration` marks this class as configuration discovered by Spring. Its @Bean method returns a UserDetailsService, an abstraction the authentication system uses to look up an account. `@Value("${workspace.password}")` asks Spring to resolve the configured property and supply its string value. This happens while building the application context, not once per submitted password.

The length comparison rejects a too-short configured local secret. `new BCryptPasswordEncoder()` creates a library encoder. `encoder.encode(password)` produces a salted password hash: different salts can give different encoded strings for the same password. Verification must use the library's matching operation, which reads the encoded parameters and checks a submitted password appropriately. It must not compare a newly generated hash for string equality.

The User builder chain starts with username editor, adds the encoded password, assigns the EDITOR role and builds a user record. Each chained call returns the builder used by the next call. The `{bcrypt}` prefix identifies the encoding scheme to Spring's delegating verifier. Omitting the prefix can leave a stored hash the verifier cannot interpret even though account lookup works.

`roles("EDITOR")` produces the role authority that hasRole("EDITOR") will later check. The local InMemoryUserDetailsManager stores these identity records in this process; it is separate from task persistence. **Predict:** a test that injects an authenticated editor without submitting a password cannot catch a broken password encoder configuration. We therefore test both authorization and actual login.

Configuration declares managed objects. Value injects an external property. BCrypt stores a salted password hash rather than the plaintext password in the identity record; salts mean repeated encoding produces different hashes. The {bcrypt} prefix tells Spring’s delegating password verifier which algorithm encoded the value. Without it, a mocked identity test can pass while real login fails. Do not compare hash strings to verify passwords manually.

The local editor is a development identity, not a public registration system. In-memory identities are intentionally small in scope; the application's tasks remain persistent. We will test a VIEWER role even though this local setup only provisions an editor. Adding a real identity provider should preserve the authorization policy.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/SecurityConfig.java`:

```java edit=src/main/java/workspace/SecurityConfig.java mode=replace
package workspace;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.http.HttpStatus;

@Configuration
public class SecurityConfig {
    @Bean UserDetailsService users(@Value("${workspace.password}") String password) {
        if (password.length() < 12) throw new IllegalArgumentException("Use a longer local password");
        var encoder = new BCryptPasswordEncoder();
        var editor = User.withUsername("editor").password("{bcrypt}" + encoder.encode(password)).roles("EDITOR").build();
        return new InMemoryUserDetailsManager(editor);
    }
```

## Enforce permissions before controller execution

### Expand the security builder into an ordered decision

HttpSecurity is a configuration builder. `authorizeHttpRequests(auth -> ...)` passes an authorization builder to our callback. Each requestMatchers call selects a set of requests; the following permitAll, hasAnyRole or hasRole assigns the rule for that selection. These rules are ordered, so an earlier match determines the policy before a later general match is reached.

For /app/index.html, the public asset matcher applies. For GET /api/tasks, the method-specific API matcher permits an editor or viewer. For POST /api/tasks, the GET matcher does not apply, so the next API rule requires editor. Other paths require authentication through anyRequest. Public asset access does not grant public API access; a page can load while its data request receives 401.

formLogin configures the library's login flow. `defaultSuccessUrl("/app/", true)` forces the post-login destination. exceptionHandling supplies a special authentication entry point for API paths. Its request lambda is a predicate: getServletPath reads the path and startsWith answers whether it belongs to /api/. Those unauthenticated requests receive 401 instead of a login page that a JSON client would try to decode.

A **security filter chain** runs around servlet handling before our controller is selected or invoked. Authorization and CSRF can reject a request before domain validation ever sees it. Therefore a 403 from a blank-title request is not evidence that title validation worked.

**Predict:** moving the editor-only /api/** rule above the GET-specific rule would deny viewer reads as well as writes. Rule order is product behavior, not formatting. Keep a viewer-read success test alongside viewer-write denial when extending this policy.

Rules are evaluated in order: public assets, authenticated API reads, then editor-only mutations. API authentication failures return 401 instead of an HTML login redirect that a JSON client could misinterpret. FormLogin supplies a framework login page and session handling; it does not generate our application files.

CSRF stays enabled. We did not call a disable method to make tests easier. The default logout handler expects a protected POST. Before exposing this beyond loopback, configure HTTPS, secure cookies, a real identity lifecycle and infrastructure limits.

Type this fragment yourself. Append to `src/main/java/workspace/SecurityConfig.java`:

```java edit=src/main/java/workspace/SecurityConfig.java mode=append
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/login", "/app/**", "/style.css").permitAll()
            .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/**").hasAnyRole("EDITOR", "VIEWER")
            .requestMatchers("/api/**").hasRole("EDITOR")
            .anyRequest().authenticated())
            .formLogin(form -> form.defaultSuccessUrl("/app/", true))
            .exceptionHandling(errors -> errors.defaultAuthenticationEntryPointFor(
                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                request -> request.getServletPath().startsWith("/api/")))
            .build();
    }
}
```

## Let the client obtain its CSRF token

### Identify who creates the method argument

@GetMapping assigns /api/csrf to this handler. CsrfToken is a framework interface exposing the current request's token and its expected header/parameter names. Spring's argument resolution supplies it; the browser does not send a JSON object to create this method argument. Returning it through RestController lets JSON conversion expose the values our client reads.

The security rules place this GET under authenticated API reads, so an unauthenticated caller receives the configured API denial rather than a useful token. The client uses headerName to avoid assuming a hardcoded name and token as the corresponding value. It must use the same authenticated session for the subsequent mutation.

**Predict:** possessing a token alone should not turn a viewer into an editor. Token validation and role authorization are independent requirements, enforced before the controller changes data. Keep both in the failure matrix.

Spring resolves the CsrfToken method parameter from the current request. Returning its headerName and token lets the same-origin client send the expected value on mutations. A token is not a user identity; the session must also be authenticated. Do not log tokens or paste them into committed examples.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/SessionController.java`:

```java edit=src/main/java/workspace/SessionController.java mode=replace
package workspace;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;

@RestController
public class SessionController {
    @GetMapping("/api/csrf")
    public CsrfToken csrf(CsrfToken token) { return token; }
}
```

## Keep credentials outside source

### Follow configuration into one process

The placeholder has no colon/default value: `${WORKSPACE_PASSWORD}` must resolve. That intentionally prevents an undocumented shared production password. Shell assignment changes the environment inherited by processes started afterward. It does not change a server already running or another terminal's environment.

Use a local exercise secret, never an account password you use elsewhere. Enter it only in your local environment setup and login form. Do not put it into the learning log, commit message or screenshots. The configured value initializes the local identity at startup; changing it requires a restart in this implementation.

After login, inspect that navigation reaches /app/ and an API read succeeds. Do not copy cookie or token values into your evidence. Record the observed status and username instead. A successful HTML page load without a successful authenticated API request is incomplete evidence.

A missing environment variable fails startup rather than silently enabling a shared default password. Set a local password of at least 12 characters before starting Java. In bash/zsh use `export WORKSPACE_PASSWORD='your-local-secret'`; in PowerShell use `$env:WORKSPACE_PASSWORD='your-local-secret'`. Choose your own value and do not commit it.

Open `/login`, sign in as editor, and reach `/app/`. This deliberately uses the framework's form page so we learn session integration without writing authentication primitives.

Type this fragment yourself. Append to `src/main/resources/application.properties`:

```properties edit=src/main/resources/application.properties mode=append
workspace.password=${WORKSPACE_PASSWORD}
```

## Isolate test configuration from learner data

### Separate a fixture from a deployment fallback

The explicit test password exists only in src/test/resources. Tests use it to exercise real password verification reproducibly. The application's src/main/resources file still requires an environment value. Maven's normal application artifact includes main resources, not test resources, so this fixture must not become the deployed default.

The in-memory URL also belongs to the test boundary. Review both paths when a test unexpectedly asks for your local password or seems to see your personal tasks. Do not “repair” such a failure by copying test defaults into application configuration. Repair how the correct resource is selected.

Test resources override application resources on the test classpath. This password is only a fixture for an in-process test context, not a production default. The test datasource is in memory; running tests must never clear or alter the learner's file database.

The JdbcTest method-level context property still selects its own named database. Each test creates distinct identities rather than depending on rows left by another test.

Type this fragment yourself. Start an empty file at `src/test/resources/application.properties`:

```properties edit=src/test/resources/application.properties mode=replace
spring.datasource.url=jdbc:h2:mem:course-tests;DB_CLOSE_DELAY=-1
spring.sql.init.mode=always
workspace.password=local-test-password-only
```

## Send the token through one client boundary

### Trace the two-request mutation protocol

`new Headers(options.headers)` constructs a mutable header collection from any caller-provided headers. The condition checks whether a method was explicitly supplied and differs from GET; our current helper callers use uppercase method names. Ordinary reads omit method and skip the token request.

Before POST, fetch /api/csrf using the current same-origin session cookie. An unsuccessful token response becomes a sign-in error. Decoding the response yields an object with headerName and token; the TypeScript annotation describes that expected shape but does not validate it at runtime. `headers.set(csrf.headerName, csrf.token)` adds the server-selected header while retaining Content-Type supplied by the caller.

`{ ...options, headers }` uses **object spread**. Copy the enumerable properties from options into a new object, then assign its headers property to the merged Headers instance. Order matters: placing `...options` last could overwrite those newly added headers with the caller's original headers and lose the CSRF token.

The second fetch performs the requested mutation with both the session cookie and CSRF header. The cookie identifies the session; the token supplies the additional CSRF proof. Neither replaces role authorization. A viewer with a valid token must still be denied writes.

**Predict:** why does a write need a token when an authenticated GET works without one? Reads are required not to mutate state, while a forged write could change the user's data. This protocol depends on preserving that method contract; implementing destructive behavior under GET would undermine it.

Replace the small helper. Headers handles header names and merging consistently. Object spread preserves caller options while replacing headers with the merged object. Fetch includes same-origin session cookies by default; the CSRF header accompanies them for mutations.

Obtaining a token before each mutation is simple but adds a request. Caching one reduces overhead but must handle login/session changes correctly. Make the tradeoff explicit before optimizing. The older vanilla prototype is now a historical learning artifact; use the React app for authenticated writes.

Type this fragment yourself. Start an empty file at `frontend/src/api.ts`:

```typescript edit=frontend/src/api.ts mode=replace
export type Task = { id: string; title: string; status: 'TODO' | 'DOING' | 'DONE'; revision: number };
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.method && options.method !== 'GET') {
    const tokenResponse = await fetch('/api/csrf');
    if (!tokenResponse.ok) throw new Error('Sign in at /login before changing tasks');
    const csrf: { headerName: string; token: string } = await tokenResponse.json();
    headers.set(csrf.headerName, csrf.token);
  }
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401) throw new Error('Sign in at /login');
  if (!response.ok) throw new Error(`Request failed (${response.status}); reload if your task changed.`);
  return response.json();
}
```

## Prove unauthorized operations are denied

### Make negative tests discriminate between causes

The test post-processor `.with(user("reader").roles("VIEWER"))` supplies a test identity. `.with(csrf())` supplies a valid test CSRF token. Neither submits a real password. The viewer-write test intentionally provides valid identity and token so role policy is the remaining reason for rejection.

The next tests vary one condition at a time:

| Identity | Token | Body | Expected reason/outcome |
|---|---|---|---|
| None, GET | Not needed | None | 401, identity required |
| Viewer, POST | Valid | Valid | 403, insufficient permission |
| Editor, POST | Missing | Valid | 403, CSRF requirement |
| Editor, POST | Valid | Blank | 400, domain validation |
| Editor, POST | Valid | Valid | 201 and TODO task |

A suite that only checks 403 could pass if all requests were broken. The positive case prevents that false confidence. `jsonPath("$.status")` selects the status property at the JSON root; its value assertion checks response content as well as transport status. Keep those observations separate from Java Task.status, even though they should agree through serialization.

Replace the earlier test with this beginning and append the next fragment. The user helper establishes a test security context; it does not bypass authorization. Supplying csrf in the viewer test ensures the denial is about permissions rather than a missing token. Distinguish failure causes so a passing negative test proves the intended property.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/ApiTest.java`:

```java edit=src/test/java/workspace/ApiTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest @AutoConfigureMockMvc
class ApiTest {
    @Autowired MockMvc mvc;
    @Test void requiresIdentity() throws Exception {
        mvc.perform(get("/api/tasks")).andExpect(status().isUnauthorized());
    }
    @Test void deniesViewerWrites() throws Exception {
        mvc.perform(post("/api/tasks").with(user("reader").roles("VIEWER")).with(csrf())
            .contentType("application/json").content("{\"title\":\"Plan\"}"))
            .andExpect(status().isForbidden());
    }
```

## Separate CSRF denial from domain validation

### Trace each assertion through its intended layer

requiresCsrfForWrites provides an editor identity and a valid body but no token. It expects 403 before task construction. validatesAuthorizedRequests supplies both identity and token but blank text, so the request reaches domain normalization and returns 400. allowsAnEditorToCreate supplies all valid inputs, then checks both 201 and JSON status TODO.

The fluent request methods build input; perform executes the request; andExpect observes the result. `jsonPath("$.status")` selects the root object's status property and value compares its decoded value. A response containing some text that happens to include TODO is weaker than checking the property used by the client.

**Planted mistake:** broadening editor-only writes to every authenticated identity should make the viewer denial test fail while editor success remains possible. If it does not, determine whether another earlier failure is preventing the viewer request reaching authorization. A negative assertion can accidentally pass for the wrong reason.

The three cases isolate token enforcement, domain validation and successful creation. A suite containing only denial tests could pass even if every request were rejected. Conversely, only success tests would miss unintended access.

Run Java tests and the frontend build. Sign in through the browser, create a task, and verify a private window cannot read the API. Authentication mocking does not test the real login form; that browser check covers a different boundary.

Type this fragment yourself. Append to `src/test/java/workspace/ApiTest.java`:

```java edit=src/test/java/workspace/ApiTest.java mode=append
    @Test void requiresCsrfForWrites() throws Exception {
        mvc.perform(post("/api/tasks").with(user("editor").roles("EDITOR"))
            .contentType("application/json").content("{\"title\":\"Plan\"}"))
            .andExpect(status().isForbidden());
    }
    @Test void validatesAuthorizedRequests() throws Exception {
        mvc.perform(post("/api/tasks").with(user("editor").roles("EDITOR")).with(csrf())
            .contentType("application/json").content("{\"title\":\" \"}"))
            .andExpect(status().isBadRequest());
    }
    @Test void allowsAnEditorToCreate() throws Exception {
        mvc.perform(post("/api/tasks").with(user("editor").roles("EDITOR")).with(csrf())
            .contentType("application/json").content("{\"title\":\"Plan\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("TODO"));
    }
}
```

```check
run "mvn -q test" timeout=180
run "npm run build --prefix frontend" timeout=180
```

## Verify real login as well as mocked identities

### Exercise the authentication provider instead of supplying its result

formLogin builds the framework's form request, including the expected login path, fields and CSRF handling. user and password set submitted credentials. The application still looks up the account and verifies its encoded password. This differs from `.with(user(...))`, which supplies an already-authenticated test identity for authorization tests.

`authenticated().withUsername("editor")` checks the resulting security identity. `unauthenticated()` checks that the wrong-password request did not establish one. These assertions are imported from the security test response matchers rather than the ordinary HTTP status matchers.

The test does not render or navigate the actual login page in a browser, nor prove the deployed archive serves /app/. The release smoke test covers that remaining boundary. **Predict:** a missing {bcrypt} identifier can break this test while all mocked-role tests remain green, because they never ask the password verifier to work.

Mocked identities establish authorization behavior but bypass password verification. This test submits the actual form-login flow using the test-only configured credential. It catches a wrong encoder configuration that every mocked permission test could miss. The second assertion establishes that an arbitrary password is rejected. Framework helpers create the login request and CSRF token; the application's real authentication provider still verifies it.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/LoginTest.java`:

```java edit=src/test/java/workspace/LoginTest.java mode=replace
package workspace;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.*;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class LoginTest {
    @Autowired MockMvc mvc;
    @Test void verifiesActualCredentials() throws Exception {
        mvc.perform(formLogin().user("editor").password("local-test-password-only"))
            .andExpect(authenticated().withUsername("editor"));
        mvc.perform(formLogin().user("editor").password("wrong-password"))
            .andExpect(unauthenticated());
    }
}
```

```check
run "mvn -q test" timeout=180
```
