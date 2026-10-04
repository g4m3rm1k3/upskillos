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
