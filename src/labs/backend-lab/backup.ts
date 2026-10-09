import { normalizePersistedData, type PersistedBackendLabData } from "./backendLabReducer";

export interface LabBackup {
  format: "upskillos-backend-lab";
  version: 1;
  project: PersistedBackendLabData;
  database: number[];
}

export function parseBackup(text: string): LabBackup {
  const data = JSON.parse(text);
  const project = normalizePersistedData(data?.project);
  if (data?.format !== "upskillos-backend-lab" || data.version !== 1 || !project ||
    !Array.isArray(data.database) || data.database.length < 100 ||
    !data.database.every((byte: unknown) => Number.isInteger(byte) && Number(byte) >= 0 && Number(byte) <= 255) ||
    String.fromCharCode(...data.database.slice(0, 16)) !== "SQLite format 3\0") {
    throw new Error("Choose a valid Backend Lab backup. Your current project has not been changed.");
  }
  return { format: data.format, version: 1, project, database: data.database };
}
