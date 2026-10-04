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

Create `decisions/009-threats.md`. Identify task content and session credentials as assets. Consider an unauthenticated visitor, a read-only teammate attempting a write, and a malicious page making a browser send an authenticated request.

A session cookie can be sent automatically by a browser. CSRF protection requires an additional token for state-changing requests to distinguish intentional application requests from cross-site submissions. CORS and CSRF address different browser behaviors; enabling CORS is not authentication.

We use Spring Security instead of writing password verification or session cryptography. Understand its flow and configuration, while delegating cryptographic primitives to maintained libraries. Production identity lifecycle, password reset and abuse prevention remain explicit release concerns.

```check
file decisions/009-threats.md
```

## Add narrowly scoped dependencies

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

A missing environment variable fails startup rather than silently enabling a shared default password. Set a local password of at least 12 characters before starting Java. In bash/zsh use `export WORKSPACE_PASSWORD='your-local-secret'`; in PowerShell use `$env:WORKSPACE_PASSWORD='your-local-secret'`. Choose your own value and do not commit it.

Open `/login`, sign in as editor, and reach `/app/`. This deliberately uses the framework's form page so we learn session integration without writing authentication primitives.

Type this fragment yourself. Append to `src/main/resources/application.properties`:

```properties edit=src/main/resources/application.properties mode=append
workspace.password=${WORKSPACE_PASSWORD}
```

## Isolate test configuration from learner data

Test resources override application resources on the test classpath. This password is only a fixture for an in-process test context, not a production default. The test datasource is in memory; running tests must never clear or alter the learner's file database.

The JdbcTest method-level context property still selects its own named database. Each test creates distinct identities rather than depending on rows left by another test.

Type this fragment yourself. Start an empty file at `src/test/resources/application.properties`:

```properties edit=src/test/resources/application.properties mode=replace
spring.datasource.url=jdbc:h2:mem:course-tests;DB_CLOSE_DELAY=-1
spring.sql.init.mode=always
workspace.password=local-test-password-only
```

## Send the token through one client boundary

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
