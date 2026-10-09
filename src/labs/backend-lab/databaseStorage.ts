import { openDB } from "idb";

// Account-free persistence, separate from optional cloud sync.
async function openStorage() {
  return openDB("oc-backend-lab", 1, {
    upgrade(db) { db.createObjectStore("database"); },
  });
}

export interface DatabaseSnapshot {
  bytes: Uint8Array | undefined;
  revision: string | null;
}

export class DatabaseConflictError extends Error {
  constructor() {
    super("Another tab saved a newer database. This tab's changes have not replaced it. Export a backup of this tab before reloading to load the newer database.");
    this.name = "DatabaseConflictError";
  }
}

export async function readDatabase(): Promise<DatabaseSnapshot> {
  const storage = await openStorage();
  try {
    const tx = storage.transaction("database", "readonly");
    const [bytes, revision] = await Promise.all([tx.store.get("main"), tx.store.get("revision")]);
    await tx.done;
    return { bytes, revision: revision ?? null };
  }
  finally { storage.close(); }
}

export async function writeDatabase(bytes: Uint8Array, expectedRevision: string | null): Promise<string> {
  const storage = await openStorage();
  try {
    // IndexedDB serializes read/write transactions across tabs. Comparing and
    // writing within one transaction prevents two stale copies both winning.
    const tx = storage.transaction("database", "readwrite");
    const currentRevision = (await tx.store.get("revision")) ?? null;
    if (currentRevision !== expectedRevision) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new DatabaseConflictError();
    }
    const revision = crypto.randomUUID();
    try {
      await tx.store.put(bytes, "main");
      await tx.store.put(revision, "revision");
      await tx.done;
      return revision;
    } catch (error) {
      // Also consume the transaction rejection after a quota/request failure.
      await tx.done.catch(() => {});
      throw error;
    }
  }
  finally { storage.close(); }
}
