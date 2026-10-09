import { run } from "../../engines/js/interpreter/interpreter.js";
import { heapUnwrap } from "./heapUnwrap";
import { heapWrap } from "./heapWrap";
import { withDatabase, persistDatabase } from "./sqlDatabase";
import { sha256Hex } from "./sha256";
import type { BackendFile, HttpRequest, HttpResponseResult } from "./types";

// Real, synchronous cryptographic primitives for lesson 14 (authentication).
// hashPassword uses a real SHA-256 implementation (sha256.ts, verified byte-
// for-byte against Node's own crypto module) — not a toy checksum — but it
// is deliberately disclosed in the lesson as incomplete on its own: real
// password storage also needs a per-user salt and a slow algorithm
// (bcrypt/scrypt/argon2) to resist brute-force attacks, neither of which
// this lesson builds. generateToken uses the browser's real
// crypto.getRandomValues — genuinely unpredictable, not Math.random().
function hashPassword(password: string): string {
  return sha256Hex(password);
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface RunOutcome {
  warning?: string;
  response: HttpResponseResult | null;
  logs: string[];
  error: { message: string; type?: string } | null;
}

// The `db` bridge is backed by a real, shared SQLite database (sqlDatabase.ts,
// sql.js/WASM) — the exact same instance the SQL console tab queries directly.
// `db.getAllUsers`/`db.insertUser` are a small, fixed API surface; nothing
// about their shape changed when the implementation behind them did (lesson
// 9's "stable interface, changing implementation" promise, paid off for real).
// Parameterized queries (`?` placeholders, bound values) are used for the
// insert specifically so a value like `name` is always treated as data, never
// as SQL text — the same injection-prevention lesson 5's security aside
// promised would matter once real SQL arrived.
function makeDbBridge(sqlDb: any) {
  return {
    getAllUsers: {
      __kind: "native",
      name: "db.getAllUsers",
      fn: (_thisVal: unknown, _args: unknown[], interp: any) => {
        const stmt = sqlDb.prepare("SELECT id, name FROM users ORDER BY id");
        const rows: { id: number; name: string }[] = [];
        try { while (stmt.step()) rows.push(stmt.getAsObject() as { id: number; name: string }); }
        finally { stmt.free(); }
        return heapWrap(rows, interp.heap);
      },
    },
    insertUser: {
      __kind: "native",
      name: "db.insertUser",
      fn: (_thisVal: unknown, args: unknown[], interp: any) => {
        const name = args[0] as string;
        sqlDb.run("INSERT INTO users (name) VALUES (?)", [name]);
        const idResult = sqlDb.exec("SELECT last_insert_rowid() AS id");
        const id = idResult[0].values[0][0] as number;
        return heapWrap({ id, name }, interp.heap);
      },
    },
    // The general-purpose primitive lesson 13 introduces: real SQL text,
    // written by the student, with real bound parameters — not a fixed,
    // pre-built convenience method like getAllUsers/insertUser above.
    // Returns every row a SELECT produces; returns an empty array for a
    // statement (INSERT/UPDATE/DELETE) that has no rows to give back.
    query: {
      __kind: "native",
      name: "db.query",
      fn: (_thisVal: unknown, args: unknown[], interp: any) => {
        const sql = args[0] as string;
        const params = args[1] !== undefined ? (heapUnwrap(args[1], interp.heap) as unknown[]) : [];
        const stmt = sqlDb.prepare(sql);
        const rows: Record<string, unknown>[] = [];
        try {
          if (Array.isArray(params) && params.length > 0) stmt.bind(params);
          while (stmt.step()) rows.push(stmt.getAsObject());
        } finally { stmt.free(); }
        return heapWrap(rows, interp.heap);
      },
    },
  };
}

// Splits "/users?limit=1&sort=name" into a clean path ("/users") and a
// pre-parsed query object — the same host-side parsing job a real
// server's networking layer does before framework code ever runs.
// Router pattern-matching (lessons 2-3) only ever sees the clean path.
function parseRequestPath(raw: HttpRequest): HttpRequest & { query: Record<string, string> } {
  const separator = raw.path.indexOf("?");
  const path = separator < 0 ? raw.path : raw.path.slice(0, separator);
  const queryString = separator < 0 ? "" : raw.path.slice(separator + 1);
  const query = Object.fromEntries(new URLSearchParams(queryString));
  return { ...raw, path, query };
}

// The interpreter's run() executes once and returns — there is no way to
// call back into an already-executed environment. So every simulated
// request re-runs the student's ENTIRE project from scratch, registering
// routes/handlers again each time. This is deliberate, not a shortcut:
// modifying the shared engine to support "pause and resume" would be a far
// bigger, riskier change than this project needs right now, and re-running
// fresh per request is honestly closer to how a real serverless/lambda
// cold start behaves than it first appears. Any state that needs to
// survive across requests lives in real host JS outside the interpreter,
// reached through an extraGlobals bridge function — the same mechanism
// `__sendResponse` below already uses.
//
// Requests wait for SQLite initialization and the previous database save.
// Native SQL calls remain synchronous inside the interpreter; the resulting
// snapshot is saved before another request or SQL-console operation starts.
export async function runRequest(files: BackendFile[], request: HttpRequest): Promise<RunOutcome> {
  try {
    return await withDatabase(async (sqlDb): Promise<RunOutcome> => {

      const combinedSource = files.map((f) => f.code).join("\n\n");
      const requestLiteral = JSON.stringify(parseRequestPath(request));
      const fullSource = `${combinedSource}\n\n__sendResponse(handleRequest(${requestLiteral}));\n`;

      let capturedResponse: HttpResponseResult | null = null;

      const outcome = run(fullSource, {
        limits: { maxRuntimeMs: 1500, maxSteps: 30000, maxEvents: 30000,
          maxTraceChars: 4000000, maxOutputLines: 200, maxOutputChars: 20000,
          maxRecursionDepth: 100, maxHeapObjects: 10000, maxHeapProperties: 50000,
          maxSnapshotItems: 100, maxSnapshotChars: 10000 },
        extraGlobals: {
          __sendResponse: (_thisVal: unknown, args: unknown[], interp: any) => {
            capturedResponse = heapUnwrap(args[0], interp.heap) as HttpResponseResult;
            return undefined;
          },
          db: makeDbBridge(sqlDb),
          hashPassword: {
            __kind: "native",
            name: "hashPassword",
            fn: (_thisVal: unknown, args: unknown[]) => hashPassword(args[0] as string),
          },
          generateToken: {
            __kind: "native",
            name: "generateToken",
            fn: () => generateToken(),
          },
        },
      });

      return {
        warning: await persistDatabase(sqlDb),
        response: capturedResponse,
        logs: outcome.output ?? [],
        error: outcome.error ?? null,
      };
    });
  } catch (error) {
    return { response: null, logs: [], error: { type: "Request failed", message: error instanceof Error ? error.message : String(error) } };
  }
}
