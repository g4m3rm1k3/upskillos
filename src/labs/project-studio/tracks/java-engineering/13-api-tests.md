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

Test resources take precedence on the test classpath. This isolated database is created for tests; your application's file-backed database must never be the test fixture. In-memory state lasts only for the test JVM. Unique task identities keep cases independent when Spring reuses a context. We will add a local test credential when authentication arrives.

Type this fragment yourself. Start an empty file at `src/test/resources/application.properties`:

```properties edit=src/test/resources/application.properties mode=replace
spring.datasource.url=jdbc:h2:mem:course-tests;DB_CLOSE_DELAY=-1
spring.sql.init.mode=always
```

## Inspect errors instead of hiding them

Using a REST client, submit malformed JSON, a blank title, a valid title and an unknown UUID. Record the statuses and bodies in `decisions/007-api-observations.md`. A generic catch that returns 200 with an error string would make clients mistake failure for success.

Temporarily point a client at the wrong port. That is a connection failure, not a 400 response. Do not report every exception as “invalid input.” Preserve the difference between a user-correctable problem and unavailable infrastructure.

```check
file decisions/007-api-observations.md
```
