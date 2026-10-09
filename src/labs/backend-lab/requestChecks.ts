import type { ResponseChecks } from "./types";
import type { RunOutcome } from "./runRequest";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export function normalizeChecks(value: unknown): ResponseChecks {
  const checks = value as Partial<ResponseChecks> | undefined;
  return {
    status: typeof checks?.status === "string" ? checks.status : "",
    body: typeof checks?.body === "string" ? checks.body : "",
  };
}

// Compare JSON values: object key order is irrelevant; array order and types matter.
function sameJson(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;
  if (!actual || !expected || typeof actual !== "object" || typeof expected !== "object") return false;
  if (Array.isArray(actual) !== Array.isArray(expected)) return false;
  const left = actual as Record<string, unknown>;
  const right = expected as Record<string, unknown>;
  const keys = Object.keys(right);
  return Object.keys(left).length === keys.length && keys.every(key =>
    Object.prototype.hasOwnProperty.call(left, key) && sameJson(left[key], right[key]));
}

export function checkConfigurationError(checks: ResponseChecks): string | null {
  const status = checks.status.trim();
  if (status && (!/^[1-5]\d{2}$/.test(status))) return "Expected status must be a whole number from 100 to 599, or blank.";
  if (checks.body.trim()) {
    try { JSON.parse(checks.body); }
    catch { return "Expected body must be valid JSON, or blank. The request has not been sent."; }
  }
  return null;
}

export function evaluateResponseChecks(checks: ResponseChecks, outcome: RunOutcome): CheckResult[] {
  const results: CheckResult[] = [];
  const configError = checkConfigurationError(checks);
  if (configError) return [{ name: "Check configuration", passed: false, detail: configError }];
  const received = !outcome.error && outcome.response != null;
  if (checks.status.trim()) {
    const expected = Number(checks.status);
    const actual = received ? outcome.response!.status : null;
    results.push({ name: "Status", passed: actual === expected,
      detail: actual === expected ? `Received ${expected}.` : `Expected ${expected}; received ${actual ?? "no successful response"}.` });
  }
  if (checks.body.trim()) {
    const passed = received && sameJson(outcome.response!.body, JSON.parse(checks.body));
    results.push({ name: "JSON body", passed,
      detail: passed ? "Response matches the expected JSON." : received ? "Response differs from the expected JSON. Object key order is ignored; array order and value types must match." : "No successful response to compare." });
  }
  return results;
}
