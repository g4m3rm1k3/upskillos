import { useState } from "react";
import { withDatabase, persistDatabase, execSql } from "./sqlDatabase";
import type { UiTheme } from "./types";

interface SqlPanelProps {
  ui: UiTheme;
  accentHex: string;
  disabled?: boolean;
}

// A real SQL console, querying the exact same database instance the
// interpreted `db.getAllUsers()`/`db.insertUser()` bridge writes to
// (sqlDatabase.ts holds the one shared instance) — a student can insert a
// user through their own JS code, then run `SELECT * FROM users` here and
// see the identical, real row, with nothing simulated in between.
export default function SqlPanel({ ui, accentHex, disabled }: SqlPanelProps) {
  const [sql, setSql] = useState("SELECT * FROM users;");
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "error"; message: string }
    | { kind: "ok"; results: { columns: string[]; values: unknown[][] }[] }
  >({ kind: "idle" });
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    if (running || disabled) return;
    setRunning(true);
    try {
      const outcome = await withDatabase(async db => {
        const outcome = execSql(db, sql);
        // A batch can write successfully before a later statement fails.
        await persistDatabase(db);
        return outcome;
      });
      if (outcome.ok) {
        setResult({ kind: "ok", results: outcome.results });
      } else {
        setResult({ kind: "error", message: outcome.error });
      }
    } catch (error) {
      setResult({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className={`p-2.5 border-b shrink-0 ${ui.border}`}>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={3}
          placeholder="SELECT * FROM users;"
          className={`w-full p-2 rounded-md border ${ui.border} ${ui.bg0} ${ui.txt1} font-mono text-xs resize-y box-border`}
        />
        <button
          onClick={handleRun}
          disabled={running || disabled}
          className="mt-2 px-4 py-1.5 rounded-md text-white font-semibold text-[13px] disabled:opacity-50"
          style={{ background: accentHex }}
        >
          {running ? "Running…" : "Run SQL"}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3.5 font-mono text-[13px]">
        {result.kind === "idle" && (
          <div className={ui.txt2}>
            This runs directly against the same database your code's `db.getAllUsers()`/`db.insertUser()` calls use — insert a
            user through a POST request, then <code>SELECT * FROM users;</code> here to see the real row.
          </div>
        )}
        {result.kind === "error" && <div style={{ color: "#f87171" }}>{result.message}</div>}
        {result.kind === "ok" && result.results.length === 0 && (
          <div className={ui.txt2}>Query executed — no rows returned.</div>
        )}
        {result.kind === "ok" &&
          result.results.map((table, ti) => (
            <table key={ti} className="w-full border-collapse mb-3">
              <thead>
                <tr>
                  {table.columns.map((col) => (
                    <th key={col} className={`text-left border-b ${ui.border} px-2 py-1 ${ui.txt2}`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.values.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={`border-b ${ui.border} px-2 py-1`}>
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>
    </div>
  );
}
