---
title: Spring Boot — delegate plumbing you can explain
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

Spring creates configured objects, connects dependencies, maps HTTP requests and serializes responses. We keep domain types independent of it. That lets us distinguish a domain failure from a framework configuration failure and test each at the appropriate boundary.

## Replace the build header deliberately

Commit the working prototype before replacing pom.xml. This is a planned configuration migration, not an unexplained generated file. The parent supplies compatible dependency and plugin versions; relativePath disables looking for a parent in a neighboring folder. Java.version is the parent build's compiler setting. The following steps complete this replacement before Maven runs again.

A baseline version makes the exercise reproducible. Before an internet deployment, review supported releases and security advisories and test upgrades; “pinned” does not mean “safe forever.”

Type this fragment yourself. Start an empty file at `pom.xml`:

```xml edit=pom.xml mode=replace
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.6</version>
    <relativePath/>
  </parent>
  <groupId>studio</groupId>
  <artifactId>common-ground</artifactId>
  <version>1.0.0</version>
  <properties><java.version>21</java.version></properties>
  <dependencies>
```

## Select framework capabilities

The web starter supplies HTTP handling and JSON mapping. JDBC supplies database integration for a later lesson; H2 is an embedded relational database driver. Test starter includes JUnit and integration testing tools, replacing the earlier explicit JUnit dependency. Dependencies without a version inherit a managed version from the parent.

We are choosing JDBC before an ORM so you see the SQL and transaction boundaries. Adding persistence dependencies does not force domain objects to know about a database.

Type this fragment yourself. Append to `pom.xml`:

```xml edit=pom.xml mode=append
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-jdbc</artifactId>
    </dependency>
    <dependency>
      <groupId>com.h2database</groupId>
      <artifactId>h2</artifactId><scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId><scope>test</scope>
    </dependency>
```

## Package an executable application

The Boot plugin builds an executable archive containing the application and its runtime dependencies. `mvn test` still runs tests; `mvn package` additionally builds the archive. A framework changes some build defaults, so inspect the effective dependency tree rather than assuming the old versions remained.

The database dependency will auto-configure an in-memory database initially. We explicitly switch to a file database in the persistence lesson.

Type this fragment yourself. Append to `pom.xml`:

```xml edit=pom.xml mode=append
  </dependencies>
  <build><plugins>
    <plugin>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-maven-plugin</artifactId>
    </plugin>
  </plugins></build>
</project>
```

## Start the application and wire the store

An annotation adds metadata; Spring reads it to discover components and configuration. The application package is the root of component scanning. `@Bean` tells the container to manage the returned object. A controller can request TaskStore in its constructor; Spring supplies this object. That is dependency injection: construction is separated from use, not a mysterious alternate way to call methods.

No domain class needs to call SpringApplication or look up a global container. Keeping construction here makes replacement explicit.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/Application.java`:

```java edit=src/main/java/workspace/Application.java mode=replace
package workspace;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
    @Bean TaskStore taskStore() { return new MemoryTasks(); }
}
```

## Map reads and creates

RestController writes return values as response bodies. RequestMapping sets a shared path; method annotations choose HTTP methods. Jackson maps JSON fields into the request record. RequestBody identifies body binding, while ResponseStatus chooses 201 for creation.

The constructor receives an interface; it does not choose storage. Validation still occurs in Titles through Task construction, so another entry point cannot bypass the invariant just by avoiding this controller. We finish the class in the next step.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/TaskController.java`:

```java edit=src/main/java/workspace/TaskController.java mode=replace
package workspace;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskStore store;
    public TaskController(TaskStore store) { this.store = store; }
    public record NewTask(String title) {}
    public record Advance(long revision) {}
    @GetMapping public List<Task> list() { return store.list(); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Task add(@RequestBody NewTask request) { return store.add(request.title()); }
```

## Map versioned updates

PathVariable binds a path segment to a UUID. Invalid UUID syntax is a bad request, while a well-formed missing id is a separate domain outcome. The JSON revision tells the server which snapshot the client used. The server cannot infer that merely from when the request arrives.

Run `mvn spring-boot:run`. In another terminal use curl (on Windows, `curl.exe`) or a REST client to GET `http://localhost:8080/api/tasks`. Expect an empty JSON array. Stop with Ctrl+C when finished. The next lesson turns errors into deliberate API behavior.

Type this fragment yourself. Append to `src/main/java/workspace/TaskController.java`:

```java edit=src/main/java/workspace/TaskController.java mode=append
    @PostMapping("/{id}/advance")
    public Task advance(@PathVariable UUID id, @RequestBody Advance request) {
        return store.advance(id, request.revision());
    }
}
```

```check
run "mvn -q test" timeout=180
```
