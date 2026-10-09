// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from "vitest";

const disk = vi.hoisted(() => ({ bytes: undefined as Uint8Array | undefined, revision: null as string | null, readFails: false, writeFails: false }));
vi.mock("./databaseStorage", () => ({
  readDatabase: async () => {
    if (disk.readFails) throw new Error("Storage unavailable");
    return { bytes: disk.bytes, revision: disk.revision };
  },
  writeDatabase: async (bytes: Uint8Array, expectedRevision: string | null) => {
    if (disk.writeFails) throw new Error("Quota exceeded");
    if (expectedRevision !== disk.revision) throw Object.assign(new Error("Another tab saved a newer database. Export this tab before reloading."), { name: "DatabaseConflictError" });
    disk.bytes = bytes.slice();
    disk.revision = crypto.randomUUID();
    return disk.revision;
  },
}));
// Real SQLite/WASM, supplied from disk instead of a browser asset URL in Node.
vi.mock("sql.js", async () => {
  const { default: init } = await vi.importActual<typeof import("sql.js")>("sql.js");
  const { readFileSync } = await import("node:fs");
  return { default: () => init({ wasmBinary: readFileSync("node_modules/sql.js/dist/sql-wasm.wasm") }) };
});

beforeEach(() => {
  vi.resetModules();
  disk.bytes = undefined;
  disk.revision = null;
  disk.readFails = disk.writeFails = false;
});
const request = { method: "GET", path: "/users", body: "", headers: {} };
const files = (code: string) => [{ id: "server", name: "server.js", code }];

it("persists request writes and SQL console writes across a fresh module session", async () => {
  const { runRequest } = await import("./runRequest");
  const result = await runRequest(files('function handleRequest(r) { return {status: 201, body: db.insertUser("Ada")}; }'), request);
  expect(result.error).toBeNull();
  expect(result.response?.body).toEqual({ id: 1, name: "Ada" });
  let sql = await import("./sqlDatabase");
  await sql.withDatabase(async db => {
    expect(sql.execSql(db, "INSERT INTO users(name) VALUES ('Grace')").ok).toBe(true);
    await sql.persistDatabase(db);
  });
  vi.resetModules();
  sql = await import("./sqlDatabase");
  expect((await sql.getSharedDatabase()).exec("SELECT name FROM users ORDER BY id")[0].values).toEqual([["Ada"], ["Grace"]]);
});

it("retries initialization after a storage failure instead of caching rejection", async () => {
  disk.readFails = true;
  const { runRequest } = await import("./runRequest");
  const code = files('function handleRequest(r) { return {status: 200, body: "ok"}; }');
  expect((await runRequest(code, request)).error?.message).toContain("Storage unavailable");
  disk.readFails = false;
  expect((await runRequest(code, request)).response?.status).toBe(200);
});

it("reports a failed save without presenting a successful insert as a failed request", async () => {
  disk.writeFails = true;
  const { runRequest } = await import("./runRequest");
  const result = await runRequest(files('function handleRequest(r) { return {status: 201, body: db.insertUser("Ada")}; }'), request);
  expect(result.response?.status).toBe(201);
  expect(result.error).toBeNull();
  expect(result.warning).toContain("only in this session");
  const { exportDatabase } = await import("./sqlDatabase");
  expect((await exportDatabase()).length).toBeGreaterThan(100);
});

it("preserves an open SQL transaction until the learner explicitly commits", async () => {
  const sql = await import("./sqlDatabase");
  const db = await sql.getSharedDatabase();
  sql.execSql(db, "BEGIN; INSERT INTO users(name) VALUES ('Ada');");
  expect(await sql.persistDatabase(db)).toContain("COMMIT or ROLLBACK");
  expect(db.exec("SELECT name FROM users")[0].values).toEqual([["Ada"]]);
  expect(sql.execSql(db, "COMMIT").ok).toBe(true);
  expect(await sql.persistDatabase(db)).toBeUndefined();
});

it("backs up and restores the database, rejecting corrupt imports without replacing data", async () => {
  const sql = await import("./sqlDatabase");
  const db = await sql.getSharedDatabase();
  db.run("INSERT INTO users(name) VALUES ('Ada')");
  const backup = await sql.exportDatabase();
  db.run("DELETE FROM users");
  await sql.importDatabase(backup);
  await expect(sql.importDatabase([1, 2, 3])).rejects.toThrow();
  expect((await sql.getSharedDatabase()).exec("SELECT name FROM users")[0].values).toEqual([["Ada"]]);
});

it("parses plus signs, embedded equals signs and malformed escapes without an uncaught error", async () => {
  const { runRequest } = await import("./runRequest");
  const result = await runRequest(files('function handleRequest(r) { return {status: 200, body: r.query}; }'), { ...request, path: "/users?name=Ada+Lovelace&token=a=b&broken=%" });
  expect(result.error).toBeNull();
  expect(result.response?.body).toEqual({ name: "Ada Lovelace", token: "a=b", broken: "%" });
});

it("does not disable foreign-key enforcement when autosaving", async () => {
  const sql = await import("./sqlDatabase");
  const db = await sql.getSharedDatabase();
  db.run("PRAGMA foreign_keys = ON; CREATE TABLE tasks (owner INTEGER REFERENCES users(id));");
  await sql.persistDatabase(db);
  expect(sql.execSql(db, "INSERT INTO tasks VALUES (999)").ok).toBe(false);
});

it("leaves the current database intact when imported data cannot be saved", async () => {
  const sql = await import("./sqlDatabase");
  const db = await sql.getSharedDatabase();
  const emptyBackup = await sql.exportDatabase();
  db.run("INSERT INTO users(name) VALUES ('Keep me')");
  disk.writeFails = true;
  await expect(sql.importDatabase(emptyBackup)).rejects.toThrow("Quota exceeded");
  expect(db.exec("SELECT name FROM users")[0].values).toEqual([["Keep me"]]);
});

it("orders concurrent request writes so the saved database contains both", async () => {
  const { runRequest } = await import("./runRequest");
  const code = files('function handleRequest(r) { return {status: 201, body: db.insertUser(r.body)}; }');
  await Promise.all([runRequest(code, { ...request, body: "Ada" }), runRequest(code, { ...request, body: "Grace" })]);
  vi.resetModules();
  const { getSharedDatabase } = await import("./sqlDatabase");
  expect((await getSharedDatabase()).exec("SELECT name FROM users ORDER BY id")[0].values).toEqual([["Ada"], ["Grace"]]);
});

it("bounds runaway learner code and can execute another request afterwards", async () => {
  const { runRequest } = await import("./runRequest");
  const result = await runRequest(files('function handleRequest(r) { while (true) {} }'), request);
  expect(result.error).not.toBeNull();
  expect((await runRequest(files('function handleRequest(r) { return {status: 200, body: "ok"}; }'), request)).response?.status).toBe(200);
});

it("preserves the newer saved database when another tab tries to save a stale copy", async () => {
  const first = await import("./sqlDatabase");
  const firstDb = await first.getSharedDatabase();
  vi.resetModules();
  const second = await import("./sqlDatabase");
  const secondDb = await second.getSharedDatabase();
  firstDb.run("INSERT INTO users(name) VALUES ('First tab')");
  expect(await first.persistDatabase(firstDb)).toBeUndefined();
  const winningBytes = disk.bytes!.slice();
  secondDb.run("INSERT INTO users(name) VALUES ('Unsaved second tab')");
  expect(await second.persistDatabase(secondDb)).toContain("Another tab");
  expect(disk.bytes).toEqual(winningBytes);
  expect(secondDb.exec("SELECT name FROM users")[0].values).toEqual([["Unsaved second tab"]]);
  expect((await second.exportDatabase()).length).toBeGreaterThan(100);
  // Retrying cannot overwrite the winner, and a failed backup import keeps
  // the losing tab's recoverable, in-memory work intact.
  expect(await second.persistDatabase(secondDb)).toContain("Another tab");
  await expect(second.importDatabase(Array.from(winningBytes))).rejects.toThrow("Another tab");
  expect(secondDb.exec("SELECT name FROM users")[0].values).toEqual([["Unsaved second tab"]]);
  vi.resetModules();
  expect((await (await import("./sqlDatabase")).getSharedDatabase()).exec("SELECT name FROM users")[0].values).toEqual([["First tab"]]);
});
