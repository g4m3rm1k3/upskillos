---
title: Integration tests — verify the boundary users depend on
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

A unit test isolates a small behavior. An integration test checks cooperating components and configuration. Both are useful; neither replaces the other. An HTTP assertion should inspect status and body, not only whether a handler method was called.

## Translate domain errors at the transport boundary

### Read the builder chain as ordinary method calls

`ResponseEntity.badRequest().body(Map.of("error", "Invalid task input"))` first creates a response builder for status 400. Map.of creates an immutable key/value map. Calling body supplies that map as the response content and returns the completed response. JSON conversion later turns it into an object with an error property. Status is part of the HTTP response, not merely text in its body.

`ResponseEntity<?>` uses an unbounded wildcard for the body type: the response can contain a value of a type this method signature does not specify more narrowly. This is not “turn off Java type checking”; it describes uncertainty about that generic parameter. We still return ResponseEntity objects.

`@ExceptionHandler(IllegalArgumentException.class)` tells Spring which exception type selects this method. The parameter e receives the exception, but this implementation intentionally sends a fixed client message rather than e's potentially internal details. The advice class applies this mapping across relevant controllers. It does not catch arbitrary exceptions in every background thread.

**Trace:** a blank title throws during Task construction; normal controller return stops; Spring selects invalid; the client receives 400 and an error object. If the handler instead returned 200, a client checking response.ok would treat the failed operation as success. Transport semantics and message text must agree.

ControllerAdvice centralizes transport translation. ResponseEntity carries status and body. A generic wildcard means the body can have different concrete types. The client receives a useful category without stack traces or SQL details.

This exception mapping is deliberately narrow to our current code, but IllegalStateException is still broad. If unrelated internal failures begin using it, introduce a dedicated conflict exception rather than returning 409 for server defects. Record that trigger in your decision log.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/ApiErrors.java`:

```java edit=src/main/java/workspace/ApiErrors.java mode=replace
package workspace;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.util.*;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<?> invalid(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", "Invalid task input"));
    }
    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<?> missing(NoSuchElementException e) {
        return ResponseEntity.status(404).body(Map.of("error", "Task not found"));
    }
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<?> conflict(IllegalStateException e) {
        return ResponseEntity.status(409).body(Map.of("error", "Reload before changing this task"));
    }
}
```

## Exercise the actual Spring wiring

### Identify which code is real and which transport is simulated

`@SpringBootTest` creates the application context using our configuration. `@AutoConfigureMockMvc` prepares a MockMvc instance, and `@Autowired MockMvc mvc` asks Spring to place it in the test field. Unlike a unit test that constructs Task directly, this test depends on routing and conversion being wired correctly.

`post("/api/tasks")` creates a request builder. `.contentType("application/json")` sets its media type. `.content("{\"title\":\" \"}")` supplies JSON text. The backslashes escape quotation marks *inside the Java string literal*; the HTTP body contains ordinary quote characters, not those Java escapes.

`mvc.perform(...)` sends the constructed request through the test servlet machinery. `.andExpect(status().isBadRequest())` builds and applies a status assertion. It observes 400, not a particular internal method call. `throws Exception` lets unexpected checked failures reach JUnit and fail the test.

**Predict coverage:** this can catch missing controller mapping, invalid JSON binding, or missing exception advice. It cannot catch a port blocked by the operating system, a wrong Vite proxy target, or an inaccessible keyboard control, because no real socket or browser participates. Write one example from each category in your log.

SpringBootTest loads our application context. MockMvc exercises HTTP mapping, JSON conversion and controller collaboration without a listening socket. It is an integration test, but not a browser or network test. Autowired requests a test dependency from the container; it does not change our production constructor design.

Run this test and then manually POST a valid title. Explain which failures MockMvc could catch and which require a real browser or socket. Later, security changes will require updating the test to authenticate and send a CSRF token.

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

@SpringBootTest
@AutoConfigureMockMvc
class ApiTest {
    @Autowired MockMvc mvc;
    @Test void rejectsBlankTitlesAtTheHttpBoundary() throws Exception {
        mvc.perform(post("/api/tasks").contentType("application/json").content("{\"title\":\" \"}"))
            .andExpect(status().isBadRequest());
    }
}
```

```check
run "mvn -q test" timeout=180
```

## Keep integration tests off the learning database

### Decode the test URL before trusting isolation

`jdbc:h2:mem:course-tests` selects a named H2 in-memory database. It does not use the workspace-data file. `DB_CLOSE_DELAY=-1` keeps that named database alive when the last connection closes, until the test JVM ends. The setting prevents a connection being released from unexpectedly erasing the fixture between operations; it also means tests sharing that context can share rows.

Test resources join the test classpath with precedence over the corresponding application resource. The same filename therefore supplies different values during tests. This is a build/runtime resolution rule, not a second production configuration to deploy.

`spring.sql.init.mode=always` runs schema initialization when available. Before the persistence lesson introduces schema.sql, there is no task-table initialization to perform. Later tests should create their own distinct task ids and query those ids rather than assuming the whole database is empty. **Predict:** a test asserting the total task count is exactly one can become order-dependent if another case already inserted a task into the shared context.

Test resources take precedence on the test classpath. This isolated database is created for tests; your application's file-backed database must never be the test fixture. In-memory state lasts only for the test JVM. Unique task identities keep cases independent when Spring reuses a context. We will add a local test credential when authentication arrives.

Type this fragment yourself. Start an empty file at `src/test/resources/application.properties`:

```properties edit=src/test/resources/application.properties mode=replace
spring.datasource.url=jdbc:h2:mem:course-tests;DB_CLOSE_DELAY=-1
spring.sql.init.mode=always
```

## Inspect errors instead of hiding them

### Build an observation table for the transport boundary

For each request record method, path, exact input, response status, response media type and body. Malformed JSON should fail during conversion; a blank title fails after conversion during domain construction. An absent UUID fails lookup; a wrong port has no application response at all.

When results differ, locate the earliest layer that could produce them. An HTML response where JSON was expected may be a login page or error page, not a defective JSON parser. A 200 containing an error property violates our success contract even if a human reading the body understands it. Keep the client/server contract explicit enough that machines can distinguish outcomes too.

Using a REST client, submit malformed JSON, a blank title, a valid title and an unknown UUID. Record the statuses and bodies in `decisions/007-api-observations.md`. A generic catch that returns 200 with an error string would make clients mistake failure for success.

Temporarily point a client at the wrong port. That is a connection failure, not a 400 response. Do not report every exception as “invalid input.” Preserve the difference between a user-correctable problem and unavailable infrastructure.

```check
file decisions/007-api-observations.md
```
