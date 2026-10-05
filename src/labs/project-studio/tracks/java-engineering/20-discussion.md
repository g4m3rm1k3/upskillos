---
title: Discussion — extend a system without scattering rules
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

A teammate needs to explain a task without changing its title. We add comments as their own resource with an author and a length rule. The important design question is where authority comes from: the authenticated server identity, never an author field supplied by the browser.

## Add a related table

### Decide which fact each column owns

id identifies one comment independently of its text. task_id relates it to a task, so two comments can belong to the same task without sharing a primary key. author records the server-established identity. body stores bounded text. Every value is required; the foreign key rejects a task id absent from tasks.

The schema does not yet declare a creation timestamp or a chronological index. Therefore the later ORDER BY id promises stable identifier order, not discussion chronology. If chronological conversation is required, add an explicit time/order contract and migrate it rather than assuming random UUID order means creation order.

**Predict:** deleting a task with related comments would require a deliberate policy—reject, cascade, or preserve history differently. We have not implemented deletion, and the foreign key's default restriction prevents silently orphaning comments. A new product operation can change which existing constraints need design work.

A foreign key prevents comments attached to nonexistent tasks. Author stores the authenticated username for this local application; a production identity system should use a stable subject id and separately manage display names. The body limit bounds storage and response size per comment.

Adding a new table with IF NOT EXISTS works for this learning schema. Changing an existing table's shape needs a versioned migration, which we practice later. Restart after adding this schema fragment.

Type this fragment yourself. Append to `src/main/resources/schema.sql`:

```sql edit=src/main/resources/schema.sql mode=append
CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL REFERENCES tasks(id),
  author VARCHAR(80) NOT NULL,
  body VARCHAR(1000) NOT NULL
);
```

## Define comment resources and reads

### Reuse the mapping pattern with a new ownership boundary

@RequestMapping contains a taskId placeholder, so every read is scoped by its parent task's identity. The constructor receives JdbcTemplate; it does not construct a separate database connection for each request. The nested Comment record describes response data, while NewComment describes only the client-supplied body.

The SELECT asks for id, author and body from comments belonging to the bound task id. For each row, the mapper constructs a Comment from those three strings. The returned list becomes a JSON array. The UUID in the path is converted to text for the database parameter, keeping its representation consistent with task_id.

An empty array can mean the task has no comments; in this read implementation it can also mean no task with that id exists, because we do not separately query tasks. Creation does perform the existence check. Record this distinction in the API contract; if the product requires GET to distinguish those cases, that is a behavior change needing its own test.

A nested resource communicates which task the discussion belongs to. This small adapter uses JDBC directly; compare that with a separate comment service. Extraction becomes valuable when another entry point or substantial business policy appears. We do not add layers solely to match a diagram.

The query binds taskId and returns value records. Its order is deterministic but not chronological; a timestamp and ordering contract would be an explicit follow-up requirement.

Type this fragment yourself. Start an empty file at `src/main/java/workspace/CommentController.java`:

```java edit=src/main/java/workspace/CommentController.java mode=replace
package workspace;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/tasks/{taskId}/comments")
public class CommentController {
    private final JdbcTemplate jdbc;
    public CommentController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public record Comment(String id, String author, String body) {}
    public record NewComment(String body) {}
    @GetMapping public List<Comment> list(@PathVariable UUID taskId) {
        return jdbc.query("SELECT id,author,body FROM comments WHERE task_id=? ORDER BY id",
            (rs, row) -> new Comment(rs.getString("id"), rs.getString("author"), rs.getString("body")), taskId.toString());
    }
```

## Take the author from the security context

### Separate client input from server authority

The parameter taskId comes from the URL, request comes from JSON, and principal comes from authenticated security state. These sources have different trust. A caller can invent a body property named author, but our NewComment record only accepts body and the saved author comes from principal.getName().

The ternary `request.body() == null ? "" : request.body().strip()` selects an empty string for absent text or normalized text otherwise. Only the selected branch is evaluated, so strip is never called on null. The next if rejects emptiness or excessive length before database work.

`SELECT COUNT(*) ... WHERE id=?` returns the number of matching task rows. queryForObject asks for one scalar result of type Integer, supplying Integer.class as the conversion target. A primary key means the count should be zero or one. The null check guards the boxed value before comparing it to zero, which requires unboxing.

The comment id is generated on the server; the author is taken from the principal; the body is normalized user input. Bind all four inserted values in column order. **Predict:** moving author into the request record and trusting it would let a client write someone else's name without changing its login. This is a data provenance failure even if SQL parameters and CSRF remain correct.

Principal is the identity established by the security filter chain. There is no author field in NewComment, so a client cannot impersonate someone through this request. The existence check improves the not-found response; the foreign key is still the final data integrity boundary.

There is no task deletion in this release. If deletion is added, consider a concurrent deletion between the check and insert and translate the resulting constraint failure appropriately. Design correctness is always relative to a set of supported operations.

Type this fragment yourself. Append to `src/main/java/workspace/CommentController.java`:

```java edit=src/main/java/workspace/CommentController.java mode=append
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Comment add(@PathVariable UUID taskId, @RequestBody NewComment request, Principal principal) {
        String body = request.body() == null ? "" : request.body().strip();
        if (body.isEmpty() || body.length() > 1000) throw new IllegalArgumentException("Invalid comment");
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM tasks WHERE id=?", Integer.class, taskId.toString());
        if (count == null || count == 0) throw new NoSuchElementException();
        Comment comment = new Comment(UUID.randomUUID().toString(), principal.getName(), body);
        jdbc.update("INSERT INTO comments(id,task_id,author,body) VALUES (?,?,?,?)",
            comment.id(), taskId.toString(), comment.author(), comment.body());
        return comment;
    }
}
```

## Give a task an independent discussion component

### Decode props destructuring and state ownership

A component receives one props object. `Discussion({ taskId }: { taskId: string })` destructures its taskId property into a local name and annotates the expected props shape. It is not a Java constructor. Board supplies the value with `<Discussion taskId={task.id} />` for each rendered task.

Each mounted Discussion instance has its own comments, body, message and busy state. The path template inserts that instance's id into the nested URL. Load is a user-triggered action, so rendering a board does not immediately request every discussion. This reduces initial requests at the cost of requiring an explicit load before seeing comments.

Send awaits creation, clears only the accepted draft, then reloads this discussion. If the reload fails after creation, the comment may already be stored. That is the same acceptance-versus-refresh distinction as the board. Reuse that reasoning rather than treating every component as a new special case.

**Trace with two tasks:** type a draft under task A and expand task B. B should have its own empty draft. Then refresh the board and inspect whether A's identity and draft are preserved. This tests the interaction between parent keys and child state ownership.

This component owns its draft and fetched comments. TaskId is a prop from the parent, not duplicated state. Load is explicit so collapsed discussions do not fetch every thread on the board. The same API helper carries authentication and CSRF behavior.

A component boundary helps when state and interactions belong together. Extracting every span into a component would not provide the same benefit.

Type this fragment yourself. Start an empty file at `frontend/src/Discussion.tsx`:

```tsx edit=frontend/src/Discussion.tsx mode=replace
import { useState } from 'react';
import { api } from './api';
type Comment = { id: string; author: string; body: string };
export function Discussion({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const path = `/api/tasks/${taskId}/comments`;
  async function load() { setComments(await api<Comment[]>(path)); }
  async function send() {
    setBusy(true);
    try {
      await api<Comment>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      setBody(''); await load(); setMessage('Comment saved');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Request failed'); }
    finally { setBusy(false); }
  }
```

## Render discussion with named controls

### Follow the native structure beneath React

Details contains a summary control that toggles disclosure using built-in browser interaction. Load comments has type button so it does not accidentally become a form submission control if markup is later rearranged. The comment form appears after the board's creation form has closed; forms must not nest.

The template `comment-${taskId}` creates a distinct id for each input. The label's htmlFor expression produces exactly that same string. A shared id such as comment on every row would make label targeting ambiguous. Both dynamic expressions must use the same identity source.

The comments map produces list items keyed by comment id. Strong wraps the author with semantic emphasis, while the body remains an ordinary escaped text expression. Browser safety does not depend on authors being honest; even a comment containing markup-like text remains text here.

Unique input ids keep labels associated with the correct task's field. Details and summary provide native disclosure behavior. The comment form is inside the task list, not inside the board's create form; nested forms would be invalid HTML.

In Board.tsx, type `import { Discussion } from './Discussion';` beside the other imports. Immediately after the Advance button in each task's li, type `<Discussion taskId={task.id} />`. This is a focused insertion, not a replacement of the component. Test with two tasks to ensure drafts stay attached to the correct ids.

Type this fragment yourself. Append to `frontend/src/Discussion.tsx`:

```tsx edit=frontend/src/Discussion.tsx mode=append
  return <details>
    <summary>Discussion</summary>
    <button type="button" onClick={() => { void load().catch(error => setMessage(error.message)); }}>Load comments</button>
    <ul>{comments.map(comment => <li key={comment.id}><strong>{comment.author}</strong>: {comment.body}</li>)}</ul>
    <form onSubmit={event => { event.preventDefault(); void send(); }}>
      <label htmlFor={`comment-${taskId}`}>Comment</label>
      <input id={`comment-${taskId}`} required maxLength={1000} value={body} onChange={event => setBody(event.target.value)} />
      <button disabled={busy}>Send comment</button>
    </form>
    <p role="status">{message}</p>
  </details>;
}
```

```check
run "npm run build --prefix frontend" timeout=180
```

## Reject forged attribution

### Trace the attempted forgery through input conversion

The test creates a real task and sends JSON containing body plus an extra author property. The test identity is alice. Under our current Jackson configuration the unknown author field is ignored when mapping NewComment, and the handler obtains alice from Principal. The response must therefore contain author alice even though the submitted text asked for admin.

`"/api/tasks/" + task.id() + "/comments"` concatenates the fixed path pieces and the task's UUID string representation. The quoted JSON inside the Java string uses escaped double quotes, as in ApiTest. The request includes an editor role and CSRF token so permission or token denial does not hide the attribution behavior.

`.andExpect(jsonPath("$.author").value("alice"))` checks the actual returned field. A successful status alone would miss forged attribution. For blank-body and unknown-task cases, first write the expected error status and unchanged database state, then add requests varying only that input. Do not declare the whole discussion feature tested by this one case.

The attacker-controlled author field is ignored by the request record mapping; the response must still name alice. This test crosses JSON binding, authorization, principal injection and persistence. Add your own blank-body and unknown-task cases before moving on; keep the expected status tied to the published API contract.

Type this fragment yourself. Start an empty file at `src/test/java/workspace/CommentTest.java`:

```java edit=src/test/java/workspace/CommentTest.java mode=replace
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
class CommentTest {
    @Autowired MockMvc mvc;
    @Autowired TaskStore store;
    @Test void authorComesFromTheAuthenticatedIdentity() throws Exception {
        Task task = store.add("Discuss design");
        mvc.perform(post("/api/tasks/" + task.id() + "/comments").with(user("alice").roles("EDITOR")).with(csrf())
            .contentType("application/json").content("{\"body\":\"Looks good\",\"author\":\"admin\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.author").value("alice"));
    }
}
```

```check
run "mvn -q test" timeout=180
```
