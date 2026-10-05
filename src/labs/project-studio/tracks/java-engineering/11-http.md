---
title: HTTP — inspect a request before adding a framework
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

HTTP exchanges a method, a target, headers and an optional body for a status, headers and a body. A successful network connection does not mean the application accepted the operation. We build a small transport experiment, then replace its plumbing with Spring.

## Expose one local resource

### Follow bytes across the process boundary

A server listens at a network address and port. `127.0.0.1` is loopback, reaching this computer; 8090 identifies the listening endpoint within it. `new InetSocketAddress(...)` packages those two values. HttpServer.create receives that address plus a backlog value of 0, requesting the implementation's default pending-connection queue behavior. Creating the server object and starting it are distinct operations.

`createContext("/health", handler)` registers a path-prefix handler. The lambda parameter exchange represents one HTTP request/response exchange. The server invokes this callback for matching requests, potentially long after main registered it. The outer setup statements are not rerun for each request.

`"ready".getBytes(StandardCharsets.UTF_8)` encodes text into a byte array. A byte is eight bits. The five ASCII characters here encode to five bytes, but non-ASCII text can require more than one byte per character. `body.length` measures actual encoded bytes, the length the response protocol needs.

`getResponseHeaders().set(...)` first obtains the response header collection, then assigns a header. Content-Type says these bytes should be interpreted as plain UTF-8 text. `sendResponseHeaders(200, body.length)` starts the response with status 200 and its byte count. Only afterward do we write the body bytes to the response stream.

`try (var output = exchange.getResponseBody()) { output.write(body); }` is **try-with-resources**. Java obtains the stream, runs the block, and closes the stream on exit even if writing throws. Closing signals completion and releases the resource. It is different from hoping garbage collection eventually cleans up. `throws Exception` on main permits setup failures to propagate to the launcher; it is not a handler that repairs them.

Finally server.start begins accepting requests. Printing the URL helps the human find the endpoint; it does not make the server start or send the response. The process stays alive servicing requests until stopped.

### Inspect the response, then vary one thing

In the browser's Network panel, select /health and find status 200, the Content-Type header, and the body ready. Change the text to a non-ASCII word, restart, and compare text length with byte length rather than manually hardcoding Content-Length. Restore ready afterward. Request /missing and observe the absence of a matching handler. Also notice /health/extra can match our prefix context: registering a context is not exact route validation.

**Design boundary:** this experiment has one unconditional response and no method checking. It teaches transport mechanics. A reusable application framework will supply routing, conversion and error handling, but you still need to understand which layer produced a missing route, wrong media type or failed connection.

The JDK HTTP server accepts TCP connections on the loopback interface. A context maps a path prefix to a handler. UTF-8 converts text to bytes; Content-Length counts bytes, not Java characters. Try-with-resources closes the response stream even on failure.

Run `java scratch/Health.java`, visit the printed URL, and inspect the network response. This experiment does not validate methods or provide authentication; it is not our production server. Stop it with Ctrl+C before continuing. Port already in use means another process owns that listening address; changing domain code will not fix it.

Type this fragment yourself. Start an empty file at `scratch/Health.java`:

```java edit=scratch/Health.java mode=replace
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class Health {
    public static void main(String[] args) throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 8090), 0);
        server.createContext("/health", exchange -> {
            byte[] body = "ready".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        server.start();
        System.out.println("Open http://127.0.0.1:8090/health; Ctrl+C stops it");
    }
}
```

## Write an API contract

### Separate the URL, representation and result

In `http://localhost:8080/api/tasks`, http is the scheme, localhost identifies the host, 8080 is the port, and /api/tasks is the path. A request method such as GET or POST specifies the operation at that path. Headers carry metadata, such as Content-Type; a body carries optional representation bytes.

JSON is a text format for objects, arrays, strings, numbers, booleans and null. `{"title":"Plan"}` is an object with a title property; `[]` is an empty array. JSON does not contain Java constructors or enum types. A conversion layer must turn those external values into our application's typed values.

For an advance request, distinguish the id in the path from the revision in the body. Id selects which task; revision identifies the snapshot on which the command was based. Write acceptance and rejection examples including both response status and what durable state may change. A 409 must leave the newer task intact, not merely display a conflict message after overwriting it.

**Failure trace:** the server commits creation, then its connection closes before the response reaches the browser. The browser observes a connection error, while a subsequent list may contain the task. This is why “client failed” and “operation did not happen” are different claims.

Create `decisions/006-http.md` with these resources: GET `/api/tasks` lists tasks; POST creates one from `{ "title": "..." }`; POST `/api/tasks/{id}/advance` advances the expected revision. A create succeeds with 201; malformed input gets 400; unknown ids get 404; stale edits get 409.

GET must not change application state. HTTP method semantics matter for browser behavior, caching and retries. A retry of POST can create duplicates unless an application protocol prevents it. We will not blindly retry mutations.

Use the browser Network panel to distinguish DNS/connection failures, HTTP error statuses and JSON decoding failures. In your notes, explain why a server might commit a change even when the client never receives its response.

```check
file decisions/006-http.md
```
