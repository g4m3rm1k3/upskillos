// ─── CNC Engine Type Definitions ─────────────────────────────────────────────

// ─── Machine Definition ───────────────────────────────────────────────────────

export interface ModalGroupDef {
  group: number;
  default: string;
  codes: string[];
}

export interface MachineSyntax {
  programStart?: string[];
  programEnd?: string[];
  blockSkip?: string;
  lineComment?: string;
  // null is valid (Siemens 840D sets blockComment: null to disable)
  blockComment?: [string, string] | null;
  seqNumber?: RegExp;
  varPrefix?: string;
  localVar?: string;
  labelPrefix?: string;
  labelDef?: RegExp;
  namedVarDef?: RegExp;
  // Fanuc: { code, param, lRepeat }; Siemens: { keyword, orDirectName }; Okuma: { keyword, param, lRepeat }
  subCall?: { code?: string; keyword?: string; param?: string; lRepeat?: string; orDirectName?: boolean };
  subReturn?: string;
  subEnd?: string;
  macroCall?: string;
  channelTag?: RegExp;
  // Siemens structured control keywords
  gotoFwd?: string;
  gotoBwd?: string;
  gotoKeyword?: string;
  ifKeyword?: string;
  whileKeyword?: string;
  endWhile?: string;
  loopKeyword?: string;
  endLoop?: string;
  repeatKeyword?: string;
  untilKeyword?: string;
  // Catch-all for dialect-specific extensions
  [key: string]: unknown;
}

export interface MachineAxes {
  linear: string[];
  rotary: string[];
  spindle?: string;
  subSpindleAxes?: string[];
  [key: string]: unknown;
}

export interface ChannelDef {
  id: number;
  label: string;
  tag?: string;
}

export interface MCodes {
  programStop?: string[];
  optionalStop?: string[];
  programEnd?: string[];
  spindleCW?: string[];
  spindleCCW?: string[];
  spindleStop?: string[];
  toolChange?: string[];
  coolantFlood?: string[];
  coolantMist?: string[];
  coolantOff?: string[];
  subCall?: string[];
  subReturn?: string[];
  [key: string]: string[] | undefined;
}

export interface ToolChangeDef {
  syntax: string;
  lengthOffset?: string;
  cancel?: string;
  diameterMode?: boolean;
  cutting?: string;
  [key: string]: unknown;
}

export interface MachineDefinition {
  id: string;
  label: string;
  vendor: string;
  class: 'mill' | 'lathe' | 'millturn' | 'grinder' | string;
  dialect: 'fanuc' | 'siemens' | 'okuma' | 'haas' | 'mazak' | 'heidenhain' | string;
  axes: MachineAxes;
  channels: ChannelDef[];
  // Optional — sparse multi-channel presets inherit from ChannelState defaults
  syntax?: MachineSyntax;
  modals?: Record<string, ModalGroupDef>;
  mCodes?: MCodes;
  waitCodes?: Record<string, unknown>;
  toolChange?: ToolChangeDef;
  specialG?: Record<string, string>;
  macroVars?: {
    system?: Record<string, string>;
    // ch typed as any — engine passes ChannelState which is an internal class
    systemVarNames?: Record<string, string | ((ch: any) => unknown)>;
  };
  features?: Record<string, boolean>;
  rVarNames?: Record<string, string>;
  [key: string]: unknown;
}

// ─── Runtime State ────────────────────────────────────────────────────────────

export interface Position {
  X: number;
  Y: number;
  Z: number;
  A: number;
  B: number;
  C: number;
}

export interface MachinePosition {
  X: number;
  Y: number;
  Z: number;
}

export interface CoolantState {
  flood: boolean;
  mist: boolean;
  through: boolean;
  air: boolean;
}

export interface CallFrame {
  blocks: ParsedBlock[];
  pointer: number;
  returnPtr: number;
  loopCount: number;
}

export interface WaitPoint {
  type: string;
  syncId: string | null;
}

// ─── Parser Types ─────────────────────────────────────────────────────────────

export type WordValue = number | number[] | string;

export interface ParsedWords {
  [letter: string]: WordValue | undefined;
  _toolNum?: number;
  _toolOffset?: number;
}

export interface WaitCode {
  code: string;
  def: unknown;
  syncId?: string | null;
  raw?: string;
}

export interface ParsedBlock {
  type?: 'block' | 'cmt';
  raw: string;
  clean?: string;
  cmt?: string;
  skip: boolean;
  seqN?: number | null;
  lineIndex: number;
  channelId?: number | null;
  words?: ParsedWords;
  keyword?: string | null;
  waitCode?: WaitCode | null;
  progId?: string;
  label?: string;
  _ptr?: number;
}

// ─── Path & Stats ─────────────────────────────────────────────────────────────

export interface PathPoint {
  x: number;
  y: number;
  z: number;
  m: string;
  feed: number;
  channelId: number;
  bi: number;
  motionMode?: string;
  arc?: boolean;
}

export interface EngineStats {
  rapid: number;
  cut: number;
  arc: number;
  tc: number;
  dist: number;
  time: number;
  blocks: number;
  units?: 'mm' | 'inch' | string;
}

// ─── Channel Snapshot (getState output) ──────────────────────────────────────

export interface ChannelSnapshot {
  id: number;
  label: string;
  pos: Position;
  machinePos: MachinePosition;
  feed: number;
  rpm: number;
  dir: string;
  liveDir?: string;
  liveRPM?: number;
  coolant: CoolantState;
  activeT: number;
  activeH: number;
  motionMode: string;
  posMode: string;
  plane: string;
  units: string;
  cssMode: boolean;
  cssSpeed: number;
  activeWCS: string;
  offsets: Record<string, Position>;
  home: Position;
  waiting: WaitPoint | null;
  done: boolean;
  error: string | null;
  message: string;
  vars: Record<string | number, number>;
  rVars: Record<string | number, number>;
  callStackDepth: number;
  pointer: number;
  modals?: Record<string, string>;
}

export interface StepResult {
  done: boolean;
  error?: string | null;
  waiting?: WaitPoint | null;
  state?: ChannelSnapshot;
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  cls: string;
  type: string;
  subtype?: string;
  dia: number;
  cr?: number;
  lc?: number;
  lt?: number;
  shank?: number;
  fl?: number;
  mat?: string;
  profile?: string;
  desc?: string;
  pointAngle?: number;
  tlo?: number;
  iAngle?: number;
  hdia?: number;
  hlen?: number;
  gdia?: number;
  glen?: number;
  [key: string]: unknown;
}

export interface ToolHolder {
  hdia: number;
  hlen: number;
  gdia: number;
  glen: number;
  desc?: string;
}

export interface ToolProfilePoint {
  z: number;
  r: number;
  seg?: string;
}

export interface ToolProfileResult {
  pts: ToolProfilePoint[];
  type?: string;
  cr?: number;
  profile?: string;
  insertType?: string;
  iAngle?: number;
}

// ─── Pre-run result ───────────────────────────────────────────────────────────

export interface PrerunResult {
  pathPoints: PathPoint[];
  stats: EngineStats;
}
