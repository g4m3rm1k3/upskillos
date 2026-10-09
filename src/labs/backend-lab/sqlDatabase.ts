import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { readDatabase, writeDatabase } from "./databaseStorage";

let sqlJsPromise: Promise<any> | null = null;
function getSqlJs(): Promise<any> {
  // Both assets ship with the app; failed initialization can be retried.
  return sqlJsPromise ??= initSqlJs({ locateFile: () => wasmUrl }).catch((error: unknown) => {
    sqlJsPromise = null;
    throw error;
  });
}

let dbPromise: Promise<any> | null = null;
let savedRevision: string | null | undefined;
export function getSharedDatabase(): Promise<any> {
  return dbPromise ??= (async () => {
    const SQL = await getSqlJs();
    // Never silently replace an unreadable saved database.
    const saved = await readDatabase();
    const db = new SQL.Database(saved.bytes);
    try {
      db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)");
      db.run("CREATE TABLE IF NOT EXISTS credentials (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL)");
      db.run("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, username TEXT NOT NULL)");
      savedRevision = saved.revision;
      return db;
    } catch (error) { db.close(); throw error; }
  })().catch(error => { dbPromise = null; throw error; });
}

export const DATABASE_SAVE_EVENT = "backend-lab-database-save";
function snapshot(db: any): Uint8Array {
  // sql.js export closes/reopens SQLite, rolling back an unfinished transaction.
  // Probe without modifying data; leave an existing transaction untouched.
  try { db.run("BEGIN"); }
  catch { throw new Error("Finish the SQL transaction with COMMIT or ROLLBACK before saving or exporting."); }
  db.run("ROLLBACK");
  const foreignKeys = db.exec("PRAGMA foreign_keys")[0].values[0][0];
  const recursiveTriggers = db.exec("PRAGMA recursive_triggers")[0].values[0][0];
  const bytes = db.export();
  // Export reopens the connection; retain the learner's integrity settings.
  db.run(`PRAGMA foreign_keys = ${foreignKeys}; PRAGMA recursive_triggers = ${recursiveTriggers}`);
  return bytes;
}
export async function persistDatabase(db: any): Promise<string | undefined> {
  let warning: string | undefined;
  try { savedRevision = await writeDatabase(snapshot(db), savedRevision ?? null); }
  catch (error) {
    warning = error instanceof Error && (error.name === "DatabaseConflictError" || error.message.startsWith("Finish the SQL"))
      ? error.message
      : "Database changes are only in this session: browser storage could not save them. Export a backup before closing.";
  }
  window.dispatchEvent(new CustomEvent(DATABASE_SAVE_EVENT, { detail: warning ?? "" }));
  return warning;
}

// Requests, SQL and backups share an ordered queue, including storage writes.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}
export function withDatabase<T>(operation: (db: any) => Promise<T>): Promise<T> {
  return enqueue(async () => operation(await getSharedDatabase()));
}

export function exportDatabase(): Promise<number[]> {
  return withDatabase(async db => Array.from(snapshot(db)));
}

export function importDatabase(bytes: number[]): Promise<void> {
  return enqueue(async () => {
    const SQL = await getSqlJs();
    const candidate = new SQL.Database(new Uint8Array(bytes));
    try {
      const check = candidate.exec("PRAGMA integrity_check");
      if (check[0]?.values[0]?.[0] !== "ok") throw new Error("The backup database is damaged.");
      // An import also must not erase changes saved since this tab loaded.
      // Reading the revision independently permits recovery from corrupt bytes.
      const expectedRevision = savedRevision === undefined ? (await readDatabase()).revision : savedRevision;
      savedRevision = await writeDatabase(candidate.export(), expectedRevision);
    } catch (error) { candidate.close(); throw error; }
    const oldDb = await dbPromise?.catch(() => null);
    dbPromise = Promise.resolve(candidate);
    oldDb?.close();
    window.dispatchEvent(new CustomEvent(DATABASE_SAVE_EVENT, { detail: "" }));
  });
}

export function execSql(db: any, sql: string): { ok: true; results: any[] } | { ok: false; error: string } {
  try { return { ok: true, results: db.exec(sql.trim()) }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}
