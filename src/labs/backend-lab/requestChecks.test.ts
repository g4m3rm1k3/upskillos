import { expect, it } from "vitest";
import { checkConfigurationError, evaluateResponseChecks, normalizeChecks } from "./requestChecks";

const response = (body: unknown, status = 200) => ({ response: { status, body }, logs: [], error: null });

it("compares nested JSON without depending on object key order", () => {
  const results = evaluateResponseChecks({ status: "200", body: '{"user":{"name":"Ada","id":1},"roles":["reader"]}' },
    response({ roles: ["reader"], user: { id: 1, name: "Ada" } }));
  expect(results.every(result => result.passed)).toBe(true);
});

it.each([
  ['{"id":1}', { id: "1" }],
  ['[1,2]', [2, 1]],
  ['{"id":1}', { id: 1, extra: true }],
  ['null', {}],
  ['[]', {}],
])("rejects a different JSON value for %s", (body, actual) => {
  expect(evaluateResponseChecks({ status: "", body }, response(actual))[0].passed).toBe(false);
});

it("allows expected HTTP error responses while rejecting execution failures", () => {
  expect(evaluateResponseChecks({ status: "404", body: "" }, response({}, 404))[0].passed).toBe(true);
  expect(evaluateResponseChecks({ status: "200", body: "null" }, { response: null, logs: [], error: { message: "Crash" } }).every(r => !r.passed)).toBe(true);
});

it("validates expectations before a request can mutate data", () => {
  expect(checkConfigurationError({ status: "200x", body: "" })).toContain("whole number");
  expect(checkConfigurationError({ status: "99", body: "" })).toContain("whole number");
  expect(checkConfigurationError({ status: "200", body: "{broken" })).toContain("not been sent");
  expect(checkConfigurationError({ status: "", body: "" })).toBeNull();
  expect(evaluateResponseChecks({ status: "", body: "" }, response(null))).toEqual([]);
  expect(normalizeChecks({ status: 200, body: [] })).toEqual({ status: "", body: "" });
});
