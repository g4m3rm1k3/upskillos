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

Create `decisions/006-http.md` with these resources: GET `/api/tasks` lists tasks; POST creates one from `{ "title": "..." }`; POST `/api/tasks/{id}/advance` advances the expected revision. A create succeeds with 201; malformed input gets 400; unknown ids get 404; stale edits get 409.

GET must not change application state. HTTP method semantics matter for browser behavior, caching and retries. A retry of POST can create duplicates unless an application protocol prevents it. We will not blindly retry mutations.

Use the browser Network panel to distinguish DNS/connection failures, HTTP error statuses and JSON decoding failures. In your notes, explain why a server might commit a change even when the client never receives its response.

```check
file decisions/006-http.md
```
