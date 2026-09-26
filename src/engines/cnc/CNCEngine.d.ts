import type {
  ChannelSnapshot,
  EngineStats,
  MachineDefinition,
  ParsedBlock,
  PathPoint,
  PrerunResult,
  StepResult,
  ToolDefinition,
  ToolProfileResult,
} from "./types";

export const MACHINE_DEFINITIONS: Record<string, MachineDefinition>;
export const TOOL_TEMPLATES: Record<string, Record<string, ToolDefinition>>;

export class GCodeParser {
  constructor(machine: MachineDefinition);
  parse(source: string): Map<string, ParsedBlock[]>;
}

export class CNCEngine {
  constructor(machine: MachineDefinition);
  static prerun(source: string | Record<string, string>, machineId?: string): PrerunResult;
  channels: Array<{ blocks: ParsedBlock[]; [key: string]: unknown }>;
  _maxSteps: number;
  loadPrograms(source: string | Record<string, string>, options?: { buildPath?: boolean }): void;
  buildFullPath(): { pathPoints: PathPoint[]; stats: EngineStats; diagnostics: Array<{ level: string; message: string; line: number | null; channelId: number | null }> };
  setToolTable(table?: Record<string, ToolDefinition>, units?: string): void;
  setWorkOffsets(offsets?: Record<string, Record<string, number>>): void;
  stepChannel(channelId?: number): StepResult;
  stepAll(): ChannelSnapshot[];
  reset(): void;
  getState(): ChannelSnapshot[];
  getPathPoints(): PathPoint[];
  getStats(): EngineStats;
  getDiagnostics(): Array<{ level: string; message: string; line: number | null; channelId: number | null }>;
  isDone(): boolean;
  hasWaiting(): boolean;
}

export function getHolderProfile(holderKey: string): ToolDefinition | null;
export function buildFullToolProfile(tool: ToolDefinition, holder?: ToolDefinition | null): ToolProfileResult;
