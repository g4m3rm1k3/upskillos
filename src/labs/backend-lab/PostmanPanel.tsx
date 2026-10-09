import type { HttpRequest, SavedRequest, StatusColors, UiTheme, PostmanTab, ResponseChecks } from "./types";
import type { RequestRun } from "./requestHistory";
import { HISTORY_LIMIT } from "./requestHistory";
import { checkConfigurationError } from "./requestChecks";
import type { RunOutcome } from "./runRequest";
import type { HeaderRow } from "./backendLabReducer";
import SqlPanel from "./SqlPanel";

interface PostmanPanelProps {
  request: HttpRequest;
  headerRows: HeaderRow[];
  outcome: RunOutcome | null;
  activeTab: PostmanTab;
  onFieldChange: (field: keyof HttpRequest, value: string) => void;
  onAddHeaderRow: () => void;
  onSetHeaderRow: (index: number, field: "key" | "value", value: string) => void;
  onRemoveHeaderRow: (index: number) => void;
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
  checks: ResponseChecks;
  onCheckChange: (field: keyof ResponseChecks, value: string) => void;
  history: RequestRun[];
  lastRun: RequestRun | null;
  onLoadHistory: (id: string) => void;
  onClearHistory: () => void;
  onTabChange: (tab: PostmanTab) => void;
  ui: UiTheme;
  accentHex: string;
  status: StatusColors;
  savedRequests: SavedRequest[];
  editingSavedRequestId: string | null;
  onSaveRequest: () => void;
  onLoadSavedRequest: (id: string) => void;
  onDeleteSavedRequest: (id: string) => void;
  onNewRequest: () => void;
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export default function PostmanPanel({
  request,
  headerRows,
  outcome,
  activeTab,
  onFieldChange,
  onAddHeaderRow,
  onSetHeaderRow,
  onRemoveHeaderRow,
  onSend,
  sending,
  disabled,
  checks,
  onCheckChange,
  history,
  lastRun,
  onLoadHistory,
  onClearHistory,
  onTabChange,
  ui,
  accentHex,
  status,
  savedRequests,
  editingSavedRequestId,
  onSaveRequest,
  onLoadSavedRequest,
  onDeleteSavedRequest,
  onNewRequest,
}: PostmanPanelProps) {
  const statusColor = (code: number) => (code < 300 ? status.green : code < 500 ? status.amber : status.red);
  const statusBg = (code: number) => (code < 300 ? status.greenBg : code < 500 ? status.amberBg : status.redBg);
  const editingName = savedRequests.find((r) => r.id === editingSavedRequestId)?.name ?? null;

  return (
    <div className={`flex flex-col h-full min-w-0 ${ui.bg0} ${ui.txt1}`}>
      <div className={`flex shrink-0 items-center justify-between px-2.5 pt-2 ${ui.bg1}`}>
        <span className={`text-[11px] ${ui.txt2}`}>
          {editingName ? (
            <>
              Editing <strong className={ui.txt1}>{editingName}</strong>
            </>
          ) : (
            "Unsaved request"
          )}
        </span>
          <button disabled={sending || disabled} onClick={onNewRequest} className={`text-[11px] ${ui.txt2} ${ui.hoverTx} disabled:opacity-50`}>
            + New request
          </button>
      </div>

      <div className={`flex shrink-0 flex-wrap gap-2 p-2.5 border-b ${ui.border} ${ui.bg1}`}>
        <select
          value={request.method}
          onChange={(e) => onFieldChange("method", e.target.value)}
          className={`px-2 py-1.5 rounded-md border ${ui.border} ${ui.bg0} ${ui.txt1} font-mono text-[13px]`}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          value={request.path}
          onChange={(e) => onFieldChange("path", e.target.value)}
          placeholder="/users"
          aria-label="Request path"
          className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-md border ${ui.border} ${ui.bg0} ${ui.txt1} font-mono text-[13px]`}
        />
        <button
          onClick={onSaveRequest}
          className={`px-3 py-1.5 rounded-md border ${ui.btnBorder} ${ui.txt1} font-semibold text-[13px] ${ui.hoverBg}`}
          title={editingSavedRequestId ? "Update saved request" : "Save this request"}
        >
          Save
        </button>
        <button
          onClick={onSend}
          disabled={sending || disabled}
          className="px-4 py-1.5 rounded-md text-white font-semibold text-[13px] disabled:opacity-50"
          style={{ background: accentHex }}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>

      {(activeTab === "response" || activeTab === "logs") && <><div className={`p-2.5 border-b ${ui.border}`}>
        <div className="flex items-center justify-between mb-1">
          <label className={`text-[11px] ${ui.txt2}`}>Headers (optional)</label>
          <button onClick={onAddHeaderRow} className={`text-[11px] ${ui.txt2} ${ui.hoverTx}`}>
            + Add Header
          </button>
        </div>
        {headerRows.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {headerRows.map((row, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  value={row.key}
                  onChange={(e) => onSetHeaderRow(i, "key", e.target.value)}
                  placeholder="Authorization"
                  className={`flex-1 min-w-0 px-2 py-1 rounded border ${ui.border} ${ui.bg0} ${ui.txt1} font-mono text-xs`}
                />
                <input
                  value={row.value}
                  onChange={(e) => onSetHeaderRow(i, "value", e.target.value)}
                  placeholder="secret123"
                  className={`flex-1 min-w-0 px-2 py-1 rounded border ${ui.border} ${ui.bg0} ${ui.txt1} font-mono text-xs`}
                />
                <button onClick={() => onRemoveHeaderRow(i)} className={`${ui.txt2} ${ui.hoverTx}`} title="Remove">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`p-2.5 border-b ${ui.border}`}>
        <label className={`text-[11px] block mb-1 ${ui.txt2}`}>Body (JSON, optional)</label>
        <textarea
          value={request.body}
          onChange={(e) => onFieldChange("body", e.target.value)}
          rows={3}
          placeholder='{ "name": "Mike" }'
          className={`w-full p-2 rounded-md border ${ui.border} ${ui.bg0} ${ui.txt1} font-mono text-xs resize-y box-border`}
        />
      </div>

      </>}
      <div className={`flex shrink-0 overflow-x-auto border-b ${ui.border}`}>
        {(["response", "logs", "saved", "sql", "history", "checks"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide border-b-2 transition-colors ${
              activeTab === tab ? ui.primary : `${ui.txt2} ${ui.hoverTx}`
            }`}
            style={{ borderBottomColor: activeTab === tab ? accentHex : "transparent" }}
          >
            {tab}
            {tab === "saved" && savedRequests.length > 0 ? ` (${savedRequests.length})` : ""}
          </button>
        ))}
      </div>

      {activeTab === "sql" ? (
        <SqlPanel ui={ui} accentHex={accentHex} disabled={disabled} />
      ) : (
      <div className="flex-1 overflow-auto p-3.5 font-mono text-[13px]">
        {activeTab === "checks" && <div className="space-y-3">
          <p className={ui.txt2}>Check each response when you click Send. Leave either expectation blank to skip it. Save the request to keep its checks.</p>
          <label className="block">Expected status
            <input aria-label="Expected status" inputMode="numeric" value={checks.status} onChange={e => onCheckChange("status", e.target.value)} placeholder="200" className={`block w-full mt-1 p-2 rounded border ${ui.border} ${ui.bg0}`} />
          </label>
          <label className="block">Expected JSON body
            <textarea aria-label="Expected JSON body" value={checks.body} onChange={e => onCheckChange("body", e.target.value)} rows={5} placeholder={'{"name":"Ada"}'} className={`block w-full mt-1 p-2 rounded border ${ui.border} ${ui.bg0}`} />
          </label>
          <p className={ui.txt2}>The entire JSON body must match. Object key order is ignored; array order and value types matter. These checks test a simulated request, not a network connection.</p>
          {checkConfigurationError(checks) && <p role="alert" style={{ color: status.amber }}>{checkConfigurationError(checks)}</p>}
        </div>}

        {activeTab === "history" && <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className={ui.txt2}>Latest {HISTORY_LIMIT} runs in this session. Loading a run shows its recorded response. Send reruns it against your current code and database.</p>
            <button className="shrink-0 underline disabled:opacity-50" disabled={sending || disabled || !history.length} onClick={onClearHistory}>Clear history</button>
          </div>
          {!history.length && <p>No requests yet.</p>}
          {history.map(run => <button key={run.id} disabled={sending || disabled} onClick={() => onLoadHistory(run.id)} className={`block w-full text-left p-2 rounded border ${ui.border} ${ui.hoverBg} disabled:opacity-50`}>
            <strong className="block break-all">{run.request.method} {run.request.path}</strong>
            <span className={ui.txt2}>{run.outcome.error ? "Error" : run.outcome.response?.status ?? "No response"} · {run.elapsedMs} ms · {new Date(run.completedAt).toLocaleTimeString()}</span>
            {run.results.length > 0 && <span className="block">{run.results.filter(result => result.passed).length}/{run.results.length} checks passed</span>}
          </button>)}
        </div>}
        {activeTab === "saved" && (
          <>
            {savedRequests.length === 0 ? (
              <div className={ui.txt2}>
                No saved requests yet — click <strong className={ui.txt1}>Save</strong> above to keep one.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {savedRequests.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md border ${
                      r.id === editingSavedRequestId ? ui.primaryBg : ui.bg1
                    } ${ui.border}`}
                  >
                    <button disabled={sending || disabled} onClick={() => onLoadSavedRequest(r.id)} className="text-left flex-1 min-w-0 disabled:opacity-50">
                      <div className={`font-semibold ${ui.txt1}`}>{r.name}</div>
                      <div className={`text-[11px] ${ui.txt2}`}>
                        {r.request.method} {r.request.path}
                      </div>
                    </button>
                    <button
                      onClick={() => onDeleteSavedRequest(r.id)}
                      className={`ml-2 ${ui.txt2} ${ui.hoverTx}`}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {(activeTab === "response" || activeTab === "logs") && !outcome && <div className={ui.txt2}>Click Send to try your request.</div>}

        {outcome && activeTab === "response" && (
          <>
            {lastRun && <div className={`mb-3 text-xs ${ui.txt2}`}>
              <div className="break-all">Recorded response: {lastRun.request.method} {lastRun.request.path}</div>
              <div title="Includes simulator execution and local database saving; not network latency.">{lastRun.elapsedMs} ms including local save</div>
              {lastRun.results.length > 0 && <ul aria-label="Response check results" className="mt-2 space-y-1">
                {lastRun.results.map(result => <li key={result.name} style={{ color: result.passed ? status.green : status.red }}>
                  <strong>{result.passed ? "PASS" : "FAIL"} {result.name}</strong> — {result.detail}
                </li>)}
              </ul>}
            </div>}
            {outcome.warning && <div role="status" className="mb-3" style={{ color: status.amber }}>{outcome.warning}</div>}
            {outcome.error ? (
              <div style={{ color: status.red }}>
                <div className="font-bold mb-1.5">{outcome.error.type ?? "Error"}</div>
                <div>{outcome.error.message}</div>
              </div>
            ) : outcome.response ? (
              <>
                <div className="mb-2.5">
                  <span
                    className="px-2 py-0.5 rounded font-bold"
                    style={{
                      background: statusBg(outcome.response.status),
                      color: statusColor(outcome.response.status),
                      border: `1px solid ${statusColor(outcome.response.status)}`,
                    }}
                  >
                    {outcome.response.status}
                  </span>
                </div>
                <pre className="m-0 whitespace-pre-wrap">{JSON.stringify(outcome.response.body, null, 2)}</pre>
                {outcome.response.headers && <details className="mt-3"><summary>Response headers</summary><pre className="whitespace-pre-wrap">{JSON.stringify(outcome.response.headers, null, 2)}</pre></details>}
              </>
            ) : (
              <div className={ui.txt2}>
                Your code ran, but never sent a response back — make sure <code>handleRequest</code> returns a value.
              </div>
            )}
          </>
        )}

        {outcome && activeTab === "logs" && (
          <>
            {outcome.logs.length === 0 ? (
              <div className={ui.txt2}>No console output.</div>
            ) : (
              outcome.logs.map((line, i) => <div key={i}>{line}</div>)
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}
