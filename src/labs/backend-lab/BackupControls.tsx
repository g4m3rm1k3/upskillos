import { useEffect, useRef, useState } from "react";
import type { PersistedBackendLabData } from "./backendLabReducer";
import { exportDatabase, importDatabase } from "./sqlDatabase";
import { parseBackup, type LabBackup } from "./backup";

export default function BackupControls({ project, onRestore, disabled, onBusyChange }: {
  project: PersistedBackendLabData;
  onRestore: (data: PersistedBackendLabData) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  const exportBackup = async () => {
    setBusy(true);
    setMessage("");
    try {
      const backup: LabBackup = { format: "upskillos-backend-lab", version: 1, project, database: await exportDatabase() };
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "backend-lab-backup.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Backup downloaded. It includes your code, requests, progress and database.");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  const restore = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("This backup exceeds the 50 MB import limit.");
      const backup = parseBackup(await file.text());
      if (!window.confirm("Replace this lab's code, saved requests, progress and database with the backup? Export your current work first if you want to keep it.")) return;
      await importDatabase(backup.database);
      onRestore(backup.project);
      setMessage("Backup restored.");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    <button className="border rounded px-2 py-1 disabled:opacity-50" disabled={busy || disabled} onClick={exportBackup}>Export backup</button>
    <button className="border rounded px-2 py-1 disabled:opacity-50" disabled={busy || disabled} onClick={() => input.current?.click()}>Import backup</button>
    <input ref={input} type="file" accept=".json,application/json" aria-label="Import Backend Lab backup" className="hidden" onChange={e => restore(e.target.files?.[0])} />
    <span role="status">{busy ? "Working…" : message}</span>
  </div>;
}
