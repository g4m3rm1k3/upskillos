import type { HttpRequest, ResponseChecks } from "./types";
import type { RunOutcome } from "./runRequest";
import type { CheckResult } from "./requestChecks";

export const HISTORY_LIMIT = 20;
export interface RequestRun {
  id: string;
  request: HttpRequest;
  checks: ResponseChecks;
  results: CheckResult[];
  outcome: RunOutcome;
  elapsedMs: number;
  completedAt: number;
}
