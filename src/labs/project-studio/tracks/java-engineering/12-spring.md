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

### Distinguish inheritance from a dependency

A Maven parent contributes configuration to a child's effective POM. It is not a Java superclass and does not make our domain classes inherit Spring methods. The parent coordinates versions known to work together, so adding a starter later does not require separately selecting every transitive library version.

`<relativePath/>` is XML's self-closing form of an empty relativePath element. It disables Maven's usual neighboring-parent-file lookup for this parent declaration. Maven resolves the parent by its coordinates instead. Our application coordinates remain outside the parent element so they identify our artifact, not Spring's.

Compare old and new properties before typing: the Boot parent uses `java.version` to configure the compiler. Merely retaining the old setting without understanding the inherited configuration would make the build harder to explain. After completing the POM, inspect `mvn help:effective-pom` to see the merged configuration. This is how you investigate a default rather than assuming it is magic.

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

### Predict what each starter enables

A starter is a curated dependency declaration bringing related libraries together. The web starter includes a servlet server, Spring's web routing, and JSON conversion support. Our earlier HttpServer experiment manually handled headers and bytes; this stack will perform those mechanics around our handler methods.

JDBC means Java Database Connectivity, Java's API for talking to database drivers. The JDBC starter contributes integration helpers and database connection management. H2 is the actual database implementation and driver here. Its runtime scope makes the driver available when the application runs without making our source depend on H2-specific classes. We code against JDBC and Spring abstractions, though our SQL still needs testing against each database engine.

The test starter supplies JUnit plus Spring testing utilities. Test scope keeps those tools on the testing side of the build. **Predict:** would adding H2 by itself make Task persistent? No. The driver can be available and a datasource configured while our TaskStore still uses memory. Availability of a library is separate from using it in the application path.

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

### Follow the build artifact to its launcher

An ordinary JAR is an archive of compiled classes and resources. The Boot plugin's repackaging step creates an executable archive with a launcher and runtime dependencies. That arrangement lets `java -jar ...` start the application without a separate classpath command listing each dependency.

The plugin declaration lives under build/plugins, unlike runtime libraries under dependencies. Its version is managed by the parent. Maven test stops before packaging; package includes earlier test phases and archive creation; verify runs through later verification phases. A successful test command does not by itself prove the archive contains browser assets.

At this point the application composition is still MemoryTasks. JDBC on the classpath can cause Boot to configure a datasource, but no domain operation becomes persistent until we wire the database adapter. Keep a written distinction between configured infrastructure and the object actually receiving controller calls.

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

### Reconstruct the object creation Spring performs

`SpringApplication.run(Application.class, args)` receives a value identifying our configuration class and the launcher arguments. It starts a Spring **application context**, the registry that creates and manages application objects. `@SpringBootApplication` combines configuration, component discovery and conditional automatic configuration. Discovery begins in Application's package and its subpackages, so putting a controller outside that tree without explicit configuration can leave it undiscovered.

`@Bean TaskStore taskStore()` tells Spring to call this factory method and register its result. The method body still runs ordinary Java: `new MemoryTasks()` constructs a store and return hands its reference back. A managed object is called a **bean**. The default bean scope is one instance per application context, so controllers can share this store rather than each constructing an empty board.

The later controller constructor requests a TaskStore. Spring resolves that request to the registered bean and supplies it. In ordinary construction terms, create a store, then construct the controller with that store. Dependency injection moves those construction decisions to composition code; it does not change what a Java constructor or reference means.

**Diagnose:** no matching bean means construction cannot be completed. Two equally eligible TaskStore beans can make selection ambiguous. A component outside the scan path may never be constructed at all. Compare these startup/configuration failures with an exception thrown while processing an already-running request.

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

### Trace one POST through the layers

Send a body shaped as `{"title":"  Plan  "}` with Content-Type application/json to POST /api/tasks. The servlet server receives bytes. Spring selects TaskController because the class's RequestMapping supplies /api/tasks and the method's PostMapping selects POST. A converter uses Jackson to decode JSON and construct the nested NewTask record.

`@RequestBody NewTask request` means this argument comes from the decoded body. `request.title()` reads its component. `store.add(...)` invokes the injected implementation, which constructs Task and calls title normalization. Returning a Task lets Spring serialize its components into JSON. `@ResponseStatus(HttpStatus.CREATED)` sets status 201 for a normal return. An exception interrupts that path; the next lesson defines the error mapping.

The field and constructor parameter are both named store. `this.store = store` assigns the parameter on the right to the field of the current controller on the left. Private hides the field from callers; final prevents replacing that reference later. Neither keyword makes the referenced store immutable.

GET takes a different route to `list()` and has no request record. It returns a list of Task values, serialized as a JSON array. **Predict:** moving normalization solely into this controller would leave which caller unprotected? A test, command-line tool or future handler calling Task construction directly. Keeping the invariant in the domain protects every construction path.

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

### Bind two inputs from different request locations

The method-level path `/{id}/advance` extends the class-level /api/tasks path. The braces are a route placeholder, not literal characters the browser sends. @PathVariable tells Spring to take that segment and convert it to UUID. @RequestBody tells it to decode the JSON body into Advance, whose revision accessor returns the supplied number.

For POST /api/tasks/A/advance with revision 0, conceptually call store.advance(A, 0). A must be a real UUID in a runnable request; a malformed string fails conversion before the store is invoked. A valid but absent UUID reaches the store and becomes a not-found outcome. Our error lesson will distinguish that from a stale existing task.

**Predict:** using the current server revision instead of the submitted revision would silently defeat stale-client protection. The server already knows its own current state; this field communicates what the user actually reviewed.

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
