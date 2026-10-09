// @vitest-environment happy-dom
import { beforeEach, expect, it } from "vitest";
import { backendLabReducer, createInitialState, normalizePersistedData, BACKEND_LAB_STORAGE_KEY } from "./backendLabReducer";
import { LESSONS } from "./lessons";
import { parseBackup } from "./backup";
import { HISTORY_LIMIT } from "./requestHistory";

beforeEach(() => localStorage.clear());

it("restores anonymous checklist progress after lesson switching and reload", () => {
  let state = createInitialState();
  const item = LESSONS[0].checklist[0];
  state = backendLabReducer(state, { type: "TOGGLE_CHECK", lessonId: "01", item });
  state = backendLabReducer(state, { type: "SET_LESSON", id: "02" });
  localStorage.setItem(BACKEND_LAB_STORAGE_KEY, JSON.stringify(state));
  expect(createInitialState().lessonChecks["01"]).toEqual([item]);
  expect(createInitialState().activeLessonId).toBe("02");
});

it("migrates older saves and filters malformed saved requests", () => {
  const files = [{ id: "1", name: "server.js", code: "hello" }];
  localStorage.setItem(BACKEND_LAB_STORAGE_KEY, JSON.stringify({ files }));
  expect(createInitialState().savedRequests).toEqual([]);
  expect(createInitialState().lessonChecks).toEqual({});
  expect(normalizePersistedData({ files, savedRequests: [null, { request: {} }] })?.savedRequests).toEqual([]);
  expect(normalizePersistedData({ files: [null] })).toBeNull();
});

it("rejects unrelated or malformed backup files", () => {
  expect(() => parseBackup('{}')).toThrow("valid Backend Lab backup");
  expect(() => parseBackup(JSON.stringify({ format: "upskillos-backend-lab", version: 1, project: createInitialState(), database: [1] }))).toThrow();
});

it("saves expectations with requests and restores them after reloading", () => {
  let state = createInitialState();
  state = backendLabReducer(state, { type: "SET_CHECK", field: "status", value: "201" });
  state = backendLabReducer(state, { type: "SET_CHECK", field: "body", value: '{"id":1}' });
  state = backendLabReducer(state, { type: "SAVE_REQUEST", name: "Create user" });
  localStorage.setItem(BACKEND_LAB_STORAGE_KEY, JSON.stringify(state));
  state = createInitialState();
  state = backendLabReducer(state, { type: "LOAD_SAVED_REQUEST", id: state.savedRequests[0].id });
  expect(state.checks).toEqual({ status: "201", body: '{"id":1}' });
  state = backendLabReducer(state, { type: "NEW_REQUEST" });
  expect(state.checks).toEqual({ status: "", body: "" });
});

it("bounds history and loads a recorded response without changing its snapshot", () => {
  let state = createInitialState();
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
    state = backendLabReducer(state, { type: "RECORD_REQUEST", run: {
      id: String(i), request: { method: "GET", path: `/users/${i}`, body: "", headers: { Accept: "application/json" } },
      checks: { status: "200", body: "" }, results: [],
      outcome: { response: { status: 200, body: { id: i } }, logs: [], error: null }, elapsedMs: 5, completedAt: i,
    } });
  }
  expect(state.history).toHaveLength(HISTORY_LIMIT);
  expect(state.history[0].id).toBe(String(HISTORY_LIMIT + 4));
  state = backendLabReducer(state, { type: "LOAD_HISTORY", id: "5" });
  expect(state.lastOutcome?.response?.body).toEqual({ id: 5 });
  state = backendLabReducer(state, { type: "SET_REQUEST_FIELD", field: "path", value: "/changed" });
  state = backendLabReducer(state, { type: "SET_HEADER_ROW", index: 0, field: "value", value: "text/plain" });
  expect(state.history[state.history.length - 1]?.request.path).toBe("/users/5");
  expect(state.history[state.history.length - 1]?.request.headers.Accept).toBe("application/json");
  state = backendLabReducer(state, { type: "CLEAR_HISTORY" });
  expect(state.history).toEqual([]);
  expect(state.request.path).toBe("/changed");
});
