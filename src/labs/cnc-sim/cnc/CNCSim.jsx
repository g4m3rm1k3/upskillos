import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CNCEngine, MACHINE_DEFINITIONS, TOOL_TEMPLATES } from "../../../engines/cnc/CNCEngine.js";
import CNCBackplot from "./CNCBackplot.jsx";
import {
  applyCoordinateSystemToOffsets,
  coordinateSystemsToBackplotFrames,
  createDefaultCoordinateSystems,
  makeCoordinateSystem,
  normalizeCoordinateSystems,
  syncCoordinateSystemsFromOffsets,
} from "../../../engines/cnc/core/coordinateSystems.js";
import { useCncTheme } from "./theme/useCncTheme.js";

function channelStateToMs(ch) {
  const base = initMS();
  if (!ch) return base;
  return {
    ...base,
    pos: ch.pos || base.pos,
    mpos: ch.machinePos || base.mpos,
    feed: ch.feed ?? base.feed,
    rpm: ch.rpm ?? base.rpm,
    dir: ch.dir ?? base.dir,
    coolant: ch.coolant?.flood || false,
    activeT: ch.activeT ?? base.activeT,
    activeH: ch.activeH ?? base.activeH,
    motion: ch.motionMode ?? base.motion,
    posMode: ch.posMode ?? base.posMode,
    plane: ch.plane ?? base.plane,
    units: ch.units ?? base.units,
    wcs: ch.activeWCS ?? base.wcs,
    offsets: ch.offsets || base.offsets,
    vars:
      ch.vars && typeof ch.vars.entries === "function"
        ? Object.fromEntries(ch.vars.entries())
        : ch.vars || {},
    done: ch.done ?? base.done,
    error: ch.error ?? base.error,
    home: ch.home || base.home,
    ptr: ch.pointer ?? base.ptr,
    liveDir: ch.liveDir,
    liveRPM: ch.liveRPM,
    cssMode: ch.cssMode,
    cssSpeed: ch.cssSpeed,
    waiting: ch.waiting,
  };
}

function formatEngineDiagnostics(diagnostics = []) {
  return diagnostics.map((issue) => {
    const location = issue.line ? ` line ${issue.line}` : "";
    const channel = issue.channelId != null ? ` CH${issue.channelId + 1}` : "";
    return `${String(issue.level || "error").toUpperCase()}:${channel}${location} ${issue.message}`;
  });
}

function engineDefToMachCfg(def) {
  const isLathe =
    def.class === "lathe" || def.class === "millturn" || def.class === "swiss";
  const isMill = def.class === "mill" || def.class === "millturn";
  return {
    class: def.class,
    label: def.label,
    isLathe,
    isMill,
    axes: [...(def.axes?.linear || []), ...(def.axes?.rotary || [])],
    rotary: def.axes?.rotary || [],
    liveTools: def.mCodes?.liveToolCW != null,
    subSpindle: !!def.axes?.subSpindleAxes,
    turret2: (def.channels?.length || 1) > 1,
    channels: def.channels || [{ id: 0, label: "Main" }],
    waitCodes: def.waitCodes || {},
    dialect: def.dialect,
    bedType: "slant",
    turret: "disc",
    maxSpindleRPM: def.maxSpindleRPM || 3000,
    spindleKW: def.spindleKW || 15,
  };
}

function formatControlLabel(def) {
  const vendor = def?.vendor || "Custom";
  const dialect = (def?.dialect || "fanuc").toUpperCase();
  return `${vendor} ${dialect}`;
}

function getControlBehavior(def) {
  const toolSyntax = def?.toolChange?.syntax || "T";
  const feedMode =
    def?.modals?.feed?.default || (def?.class === "lathe" ? "G99" : "G94");
  const absMode = def?.modals?.absInc?.default || "G90";
  const plane =
    def?.modals?.plane?.default || (def?.class === "lathe" ? "G18" : "G17");
  const units = def?.modals?.units?.default || "G21";
  const waitCodes = Object.keys(def?.waitCodes || {});
  return {
    toolSyntax,
    feedMode,
    absMode,
    plane,
    units,
    waitCodes,
  };
}

const CHANNEL_COLORS = ["#63b8ff", "#46d89f", "#f0b44c", "#b89cff"];

function makeFileId(prefix = "pf") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function inferProgramId(content = "", fileName = "") {
  const oMatch = String(content).match(/^\s*O(\d+)/im);
  if (oMatch) return `O${oMatch[1]}`;
  const labelMatch = String(content).match(/^\s*([A-Z][A-Z0-9_]+):\s*$/im);
  if (labelMatch) return labelMatch[1].toUpperCase();
  const fileStem = fileName.replace(/\.[^.]+$/, "").trim();
  return fileStem ? fileStem.toUpperCase().replace(/[^A-Z0-9_]/g, "_") : null;
}

function bucketLabel(file) {
  if (file.bucket === "channel") return `CH${(file.channel ?? 0) + 1}`;
  if (file.bucket === "sub") return "SUB";
  if (file.bucket === "macro") return "MACRO";
  return "MAIN";
}

function createProjectFile({
  name = "program.nc",
  content = "",
  bucket = "main",
  channel = null,
  locked = false,
} = {}) {
  return {
    id: makeFileId(),
    name,
    content,
    bucket,
    channel,
    locked,
    programId: inferProgramId(content, name),
  };
}

function splitTaggedChannelProgram(code = "", channelCount = 1) {
  const lines = String(code || "").split("\n");
  const byChannel = new Map();
  let sawTagged = false;
  for (const raw of lines) {
    const m = raw.match(/^\s*\$(\d+)\s*(.*)$/);
    if (!m) continue;
    const ci = Math.max(0, parseInt(m[1], 10) - 1);
    if (ci >= channelCount) continue;
    sawTagged = true;
    if (!byChannel.has(ci)) byChannel.set(ci, []);
    byChannel.get(ci).push(m[2] || "");
  }
  if (!sawTagged) return null;
  return byChannel;
}

function exampleToProject(
  example,
  bucket = "main",
  channel = null,
  machDef = null,
) {
  if (bucket === "main" && (machDef?.channels?.length || 1) > 1) {
    const split = splitTaggedChannelProgram(
      example?.code || "",
      machDef.channels.length,
    );
    if (split && split.size > 0) {
      const idStem = example?.id || "PROGRAM";
      return [...split.entries()].map(([ci, chLines]) =>
        createProjectFile({
          name: `${idStem}_CH${ci + 1}.nc`,
          content: chLines.join("\n").trim(),
          bucket: "channel",
          channel: ci,
          locked: false,
        }),
      );
    }
  }
  return [
    createProjectFile({
      name: `${example.id || "PROGRAM"}.nc`,
      content: example.code || "",
      bucket,
      channel,
      locked: false,
    }),
  ];
}

function buildProjectSources(files) {
  const sources = {};
  files.forEach((file, idx) => {
    if (!file?.content?.trim()) return;
    if (file.bucket === "channel") {
      sources[`CH${(file.channel ?? 0) + 1}`] = file.content;
      return;
    }
    if (file.bucket === "main") {
      const key =
        idx === 0 || !sources.MAIN
          ? "MAIN"
          : `${file.programId || file.name || `MAIN_${idx}`}`;
      sources[key] = file.content;
      return;
    }
    const key =
      file.programId ||
      inferProgramId(file.content, file.name) ||
      file.name ||
      `FILE_${idx}`;
    sources[key.toUpperCase()] = file.content;
  });
  return Object.keys(sources).length ? sources : { MAIN: "" };
}

function validateProjectFiles(files, machDef) {
  const issues = [];
  const mains = files.filter((f) => f.bucket === "main" && f.content.trim());
  const subs = files.filter(
    (f) => (f.bucket === "sub" || f.bucket === "macro") && f.content.trim(),
  );
  const channels = files.filter(
    (f) => f.bucket === "channel" && f.content.trim(),
  );
  const ids = new Map();

  if (mains.length === 0 && channels.length === 0) {
    issues.push({
      level: "error",
      text: "No main program or channel program loaded.",
    });
  }
  if (mains.length > 1) {
    issues.push({
      level: "warn",
      text: "Multiple MAIN files present. Only one shared main entry is guaranteed to execute as the primary program.",
    });
  }
  if (
    (machDef.channels?.length || 1) > 1 &&
    channels.length === 0 &&
    mains.length <= 1
  ) {
    issues.push({
      level: "warn",
      text: "Multi-channel machine has no explicit CH1/CH2/CH3 files. Shared code may run on every channel.",
    });
  }
  if ((machDef.channels?.length || 1) > 1) {
    for (let i = 0; i < machDef.channels.length; i++) {
      if (!channels.some((f) => f.channel === i)) {
        issues.push({
          level: "warn",
          text: `Channel ${i + 1} has no assigned program file.`,
        });
      } else if (channels.filter((f) => f.channel === i).length > 1) {
        issues.push({
          level: "warn",
          text: `Channel ${i + 1} has multiple assigned files. Later files may override earlier ones.`,
        });
      }
    }
  }

  [...mains, ...subs, ...channels].forEach((file) => {
    const pid = file.programId || inferProgramId(file.content, file.name);
    if ((file.bucket === "sub" || file.bucket === "macro") && !pid) {
      issues.push({
        level: "warn",
        text: `${file.name} has no detectable O-number or label for subprogram lookup.`,
      });
    }
    if (pid) {
      const prev = ids.get(pid);
      if (prev)
        issues.push({
          level: "error",
          text: `Duplicate program identifier ${pid} in ${prev} and ${file.name}.`,
        });
      else ids.set(pid, file.name);
    }
  });

  const projectText = files.map((f) => f.content).join("\n");
  const m98Refs = [...projectText.matchAll(/\bM98\s+P(\d+)/gi)].map(
    (m) => `O${m[1]}`,
  );
  const callRefs = [...projectText.matchAll(/\bCALL\s+([A-Z0-9_]+)/gi)].map(
    (m) => m[1].toUpperCase(),
  );
  [...new Set([...m98Refs, ...callRefs])].forEach((ref) => {
    if (!ids.has(ref))
      issues.push({
        level: "warn",
        text: `Referenced subprogram ${ref} is not present in the current project.`,
      });
  });

  return issues;
}

function computeChannelDiagnostics(ch, chBlocks) {
  const offsets = ch?.offsets?.[ch?.activeWCS] || {
    X: 0,
    Y: 0,
    Z: 0,
    A: 0,
    B: 0,
    C: 0,
  };
  const absolute = {};
  Object.keys(ch?.pos || {}).forEach((ax) => {
    absolute[ax] = (ch?.pos?.[ax] ?? 0) + (offsets?.[ax] ?? 0);
  });
  const next = chBlocks?.[ch?.pointer] || null;
  const dtg = {};
  Object.keys(ch?.pos || {}).forEach((ax) => {
    const raw = next?.words?.[ax];
    dtg[ax] = typeof raw === "number" ? raw - (ch?.pos?.[ax] ?? 0) : null;
  });
  return { absolute, dtg };
}

// ─── PALETTE ──────────────────────────────────────────────────────────────────


let C = {};

// ─── MACHINE CONFIG BUILDER PRESETS ──────────────────────────────────────────
const BED_TYPES = {
  flat: { label: "Flat Bed", icon: "▬", desc: "Standard flat bed lathe" },
  slant: {
    label: "Slant Bed",
    icon: "◤",
    desc: "45° / 60° slant bed — improved chip evacuation",
  },
  slant30: {
    label: "30° Slant",
    icon: "◤",
    desc: "30° slant bed — gang tooling common",
  },
  vertical: {
    label: "Vertical",
    icon: "▮",
    desc: "Vertical turning center (VTC/VTL)",
  },
  inverted: {
    label: "Inverted",
    icon: "▾",
    desc: "Inverted vertical spindle — gravity chip fall",
  },
};

const TURRET_TYPES = {
  disc: { label: "Disc Turret", cap: 12, desc: "Standard VDI disc turret" },
  drum: {
    label: "Drum Turret",
    cap: 16,
    desc: "BMT drum turret, high rigidity",
  },
  gang: {
    label: "Gang Tool",
    cap: 8,
    desc: "Gang-style tooling (Swiss/flat bed)",
  },
  ats: { label: "ATC (Mill)", cap: 30, desc: "Automatic tool changer — mill" },
  none: { label: "None", cap: 0, desc: "No turret / manual" },
};

// Build a machine config from options
const buildMachCfg = (opts) => {
  const isLathe =
    opts.class === "lathe" ||
    opts.class === "millturn" ||
    opts.class === "swiss";
  const isMill = opts.class === "mill" || opts.class === "millturn";
  const axes = [...(isLathe ? ["X", "Z"] : ["X", "Y", "Z"])];
  if (opts.yAxis) axes.push("Y");
  if (opts.bAxis) axes.push("B");
  if (opts.cAxis) axes.push("C");
  const rotary = [];
  if (opts.cAxis) rotary.push("C");
  if (opts.bAxis) rotary.push("B");
  return { ...opts, axes, rotary, isLathe, isMill };
};

// Default machine presets
const MACHINE_PRESETS = {
  vmc3: buildMachCfg({
    class: "mill",
    label: "VMC 3-Axis",
    bedType: "flat",
    turret: "ats",
    yAxis: false,
    bAxis: false,
    cAxis: false,
    liveTools: false,
    subSpindle: false,
    turret2: false,
    maxRPM: 12000,
    maxSpindleRPM: 0,
    spindleKW: 22,
  }),
  vmc5: buildMachCfg({
    class: "mill",
    label: "VMC 5-Axis",
    bedType: "flat",
    turret: "ats",
    yAxis: false,
    bAxis: true,
    cAxis: true,
    liveTools: false,
    subSpindle: false,
    turret2: false,
    maxRPM: 12000,
    maxSpindleRPM: 0,
    spindleKW: 22,
  }),
  lathe2: buildMachCfg({
    class: "lathe",
    label: "Lathe 2-Axis",
    bedType: "slant",
    turret: "disc",
    yAxis: false,
    bAxis: false,
    cAxis: false,
    liveTools: false,
    subSpindle: false,
    turret2: false,
    maxRPM: 3000,
    maxSpindleRPM: 3000,
    spindleKW: 15,
  }),
  latheY: buildMachCfg({
    class: "lathe",
    label: "Lathe Y-Axis",
    bedType: "slant",
    turret: "drum",
    yAxis: true,
    bAxis: false,
    cAxis: false,
    liveTools: true,
    subSpindle: false,
    turret2: false,
    maxRPM: 6000,
    maxSpindleRPM: 6000,
    spindleKW: 18,
  }),
  latheSub: buildMachCfg({
    class: "lathe",
    label: "Lathe Sub-Sp",
    bedType: "slant",
    turret: "disc",
    yAxis: false,
    bAxis: false,
    cAxis: false,
    liveTools: true,
    subSpindle: true,
    turret2: true,
    maxRPM: 4000,
    maxSpindleRPM: 4000,
    spindleKW: 15,
  }),
  millturn: buildMachCfg({
    class: "millturn",
    label: "Mill-Turn",
    bedType: "slant",
    turret: "disc",
    yAxis: true,
    bAxis: true,
    cAxis: true,
    liveTools: true,
    subSpindle: false,
    turret2: false,
    maxRPM: 8000,
    maxSpindleRPM: 5000,
    spindleKW: 30,
  }),
  swiss: buildMachCfg({
    class: "swiss",
    label: "Swiss Turn",
    bedType: "flat",
    turret: "gang",
    yAxis: false,
    bAxis: false,
    cAxis: true,
    liveTools: true,
    subSpindle: true,
    turret2: false,
    maxRPM: 12000,
    maxSpindleRPM: 8000,
    spindleKW: 7,
  }),
  hmc: buildMachCfg({
    class: "mill",
    label: "HMC 4-Axis",
    bedType: "flat",
    turret: "ats",
    yAxis: false,
    bAxis: true,
    cAxis: false,
    liveTools: false,
    subSpindle: false,
    turret2: false,
    maxRPM: 12000,
    maxSpindleRPM: 0,
    spindleKW: 22,
  }),
};

// Tool classes
const MILL_TOOLS = [
  "End Mill",
  "Relief Neck End Mill",
  "Ball Mill",
  "Bull Nose",
  "Face Mill",
  "Drill",
  "Center Drill",
  "Spot Drill",
  "Reamer",
  "Tap",
  "Chamfer",
  "T-Slot",
  "Probe",
];
const LATHE_TOOLS = [
  "OD Turning",
  "ID Boring",
  "Facing",
  "Grooving",
  "Parting",
  "Threading",
  "OD Profiling",
  "Knurling",
];
const LIVE_TOOLS = ["Live End Mill", "Live Drill", "Live Tap", "Live Reamer"];

const TOOL_SCHEMA_VERSION = 2;

const inferUnits = (value, fallback = "mm") => {
  const s = String(value || "")
    .trim()
    .toLowerCase();
  if (!s) return fallback;
  if (s.includes("in") || s.includes("inch") || s === "imperial") return "inch";
  return "mm";
};

const toMm = (value, units = "mm") => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return units === "inch" ? n * 25.4 : n;
};

const pickNumber = (...values) => {
  for (const v of values) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const inferToolClass = (raw = {}, fallback = "mill") => {
  const txt =
    `${raw.cls || ""} ${raw.class || ""} ${raw.type || ""} ${raw.toolType || ""} ${raw.category || ""}`.toLowerCase();
  if (txt.includes("live")) return "live";
  if (
    txt.includes("lathe") ||
    txt.includes("turn") ||
    txt.includes("boring") ||
    txt.includes("groov") ||
    txt.includes("part")
  )
    return "lathe";
  if (
    txt.includes("mill") ||
    txt.includes("drill") ||
    txt.includes("ream") ||
    txt.includes("tap")
  )
    return "mill";
  return fallback;
};

const normalizeToolDefinition = (
  raw = {},
  toolNo = null,
  fallbackClass = "mill",
) => {
  const units = inferUnits(raw.units ?? raw.unit ?? raw.uom, "mm");
  const geometryUnits = raw.geometryUnits === "mm" || Number(raw.schema) >= TOOL_SCHEMA_VERSION
    ? "mm"
    : units;
  const geom = raw.geometry || {};
  const holder = raw.holder || {};
  const offsets = raw.offsets || {};
  const cls = inferToolClass(raw, fallbackClass);

  const dia = toMm(
    pickNumber(
      raw.dia,
      raw.diameter,
      geom.dia,
      geom.diameter,
      raw.toolDiameter,
      raw.cuttingDiameter,
      raw.cutterDiameter,
    ),
    geometryUnits,
  );
  const cr = toMm(
    pickNumber(
      raw.cr,
      raw.cornerRadius,
      geom.cr,
      geom.cornerRadius,
      raw.noseRadius,
      raw.tipRadius,
    ),
    geometryUnits,
  );
  const tlo = toMm(
    pickNumber(
      raw.tlo,
      raw.lengthOffset,
      offsets.length,
      offsets.h,
      raw.hOffset,
      raw.gaugeLength,
      raw.gaugeLen,
    ),
    geometryUnits,
  );
  const lc = toMm(
    pickNumber(
      raw.lc,
      raw.fluteLength,
      geom.lc,
      geom.fluteLength,
      raw.cutLength,
    ),
    geometryUnits,
  );
  const lt = toMm(
    pickNumber(
      raw.lt,
      raw.overallLength,
      geom.lt,
      geom.overallLength,
      raw.totalLength,
    ),
    geometryUnits,
  );
  const shank = toMm(
    pickNumber(raw.shank, raw.shankDiameter, geom.shank, geom.shankDiameter),
    geometryUnits,
  );
  const hdia = toMm(
    pickNumber(raw.hdia, holder.dia, holder.diameter, raw.holderDiameter),
    geometryUnits,
  );
  const hlen = toMm(
    pickNumber(raw.hlen, holder.length, holder.len, raw.holderLength),
    geometryUnits,
  );
  const wearR = toMm(
    pickNumber(
      raw.wearR,
      raw.radiusWear,
      offsets.radiusWear,
      offsets.d,
      raw.dWear,
    ),
    geometryUnits,
  );
  const wearL = toMm(
    pickNumber(raw.wearL, raw.lengthWear, offsets.lengthWear, offsets.hWear),
    geometryUnits,
  );

  return {
    schema: TOOL_SCHEMA_VERSION,
    n:
      Number(toolNo) ||
      Number(raw.n) ||
      Number(raw.number) ||
      Number(raw.toolNumber) ||
      0,
    cls,
    type:
      raw.type ||
      raw.toolType ||
      (cls === "lathe"
        ? "OD Turning"
        : cls === "live"
          ? "Live End Mill"
          : "End Mill"),
    desc:
      raw.desc || raw.description || raw.name || `Tool ${toolNo || ""}`.trim(),
    units,
    geometryUnits: "mm",
    dia,
    cr,
    tlo: tlo || lt,
    lc,
    lt,
    shank,
    fl: Number(raw.fl ?? raw.flutes ?? 1) || 1,
    mat: raw.mat || raw.material || "Carbide",
    hdia,
    hlen,
    neckDia: toMm(pickNumber(raw.neckDia, geom.neckDia), geometryUnits),
    neckLen: toMm(pickNumber(raw.neckLen, geom.neckLen), geometryUnits),
    wearR,
    wearL,
    iAngle: Number(raw.iAngle ?? raw.insertAngle ?? 80) || 80,
    relief: Number(raw.relief ?? raw.reliefAngle ?? 5) || 5,
    source: raw.source || raw.vendor || "manual",
    sourceId: raw.sourceId || raw.id || raw.guid || null,
  };
};

const normalizeToolTable = (table = {}, fallbackClass = "mill") => {
  const out = {};
  if (!table || typeof table !== "object") return out;
  for (const [k, raw] of Object.entries(table)) {
    if (!raw || typeof raw !== "object") continue;
    const n =
      Number(k) ||
      Number(raw.n) ||
      Number(raw.number) ||
      Number(raw.toolNumber);
    if (!Number.isFinite(n) || n <= 0) continue;
    out[n] = normalizeToolDefinition(raw, n, fallbackClass);
  }
  return out;
};

const normalizeImportedToolPayload = (payload, fallbackClass = "mill") => {
  if (!payload || typeof payload !== "object") return {};
  const toolsPayload =
    payload.tools ?? payload.items ?? payload.data ?? payload;
  const out = {};
  if (Array.isArray(toolsPayload)) {
    toolsPayload.forEach((raw, idx) => {
      if (!raw || typeof raw !== "object") return;
      const n =
        Number(raw.n) ||
        Number(raw.number) ||
        Number(raw.toolNumber) ||
        idx + 1;
      out[n] = normalizeToolDefinition(raw, n, fallbackClass);
    });
    return out;
  }
  if (toolsPayload && typeof toolsPayload === "object") {
    return normalizeToolTable(toolsPayload, fallbackClass);
  }
  return {};
};

// ─── INITIAL STATE ─────────────────────────────────────────────────────────
const initMS = () => ({
  pos: { X: 0, Y: 0, Z: 0, B: 0, C: 0 },
  mpos: { X: 0, Y: 0, Z: 0 },
  feed: 0,
  rpm: 0,
  dir: "",
  coolant: false,
  activeT: 1,
  activeH: 1,
  motion: "G00",
  posMode: "G90",
  plane: "G17",
  units: "mm",
  wcs: "G54",
  cycle: "G80",
  done: false,
  error: false,
  msg: "",
  ptr: 0,
  offsets: {
    G54: { X: 0, Y: 0, Z: 0, B: 0, C: 0 },
    G55: { X: 100, Y: 0, Z: 0, B: 0, C: 0 },
    G56: { X: 200, Y: 0, Z: 0, B: 0, C: 0 },
    G57: { X: 0, Y: 100, Z: 0, B: 0, C: 0 },
  },
  vars: {},
  home: { X: 0, Y: 0, Z: 0, B: 0, C: 0 },
});

// Build default tool table from TOOL_TEMPLATES
const initTools = (machineClass = "mill") => {
  const t = {};
  let n = 1;
  if (machineClass !== "lathe") {
    // Mill tools: pick representative set
    const millKeys = ["end_mill_4fl", "drill_8"];
    for (const k of millKeys) {
      const tmpl = TOOL_TEMPLATES.mill[k];
      if (tmpl) t[n++] = { ...tmpl, tlo: tmpl.lt || 75, hdia: 32, hlen: 50 };
    }
  }
  if (machineClass === "lathe") {
    // Lathe tools
    const latheKeys = ["od_cnmg_80", "facing_wnmg", "grooving_3mm"];
    for (const k of latheKeys) {
      const tmpl = TOOL_TEMPLATES.lathe[k];
      if (tmpl) t[n++] = { ...tmpl, hdia: 16, hlen: 80 };
    }
  }
  // Live tool
  const liveKeys = ["live_end_mill_8"];
  for (const k of liveKeys) {
    const tmpl = TOOL_TEMPLATES.live?.[k];
    if (tmpl) t[n++] = { ...tmpl, tlo: tmpl.lt || 60, hdia: 25, hlen: 40 };
  }
  // Fallback: if templates didn't resolve, use safe defaults
  if (Object.keys(t).length === 0) {
    return {
      1: {
        cls: "mill",
        type: "End Mill",
        desc: "10mm 4-fl Carbide",
        dia: 10,
        cr: 0,
        tlo: 75,
        lc: 22,
        lt: 75,
        shank: 10,
        fl: 4,
        mat: "Carbide",
        hdia: 32,
        hlen: 50,
      },
      2: {
        cls: "mill",
        type: "Drill",
        desc: "6mm HSS Drill",
        dia: 6,
        cr: 0,
        tlo: 80,
        lc: 40,
        lt: 80,
        shank: 6,
        fl: 2,
        mat: "HSS",
        hdia: 32,
        hlen: 50,
      },
      3: {
        cls: "lathe",
        type: "OD Turning",
        desc: "CNMG80 Insert",
        dia: 0,
        cr: 0.8,
        tlo: 30,
        lc: 0,
        lt: 30,
        shank: 16,
        fl: 1,
        mat: "Carbide",
        hdia: 16,
        hlen: 80,
        iAngle: 80,
        relief: 5,
      },
      4: {
        cls: "lathe",
        type: "Facing",
        desc: "WNMG Facing",
        dia: 0,
        cr: 0.4,
        tlo: 25,
        lc: 0,
        lt: 25,
        shank: 16,
        fl: 1,
        mat: "Carbide",
        hdia: 16,
        hlen: 80,
        iAngle: 35,
        relief: 7,
      },
      5: {
        cls: "lathe",
        type: "Grooving",
        desc: "3mm Groove/Part",
        dia: 3,
        cr: 0.2,
        tlo: 20,
        lc: 0,
        lt: 20,
        shank: 16,
        fl: 1,
        mat: "Carbide",
        hdia: 16,
        hlen: 80,
        iAngle: 0,
        relief: 7,
      },
      6: {
        cls: "live",
        type: "Live End Mill",
        desc: "8mm Live EM",
        dia: 8,
        cr: 0,
        tlo: 60,
        lc: 18,
        lt: 60,
        shank: 8,
        fl: 4,
        mat: "Carbide",
        hdia: 25,
        hlen: 40,
      },
    };
  }
  return normalizeToolTable(t, machineClass);
};

// ─── GEOM → G-CODE ─────────────────────────────────────────────────────────
function geomToGCode(
  geoms,
  machCfg,
  toolDia = 10,
  depth = 2,
  feed = 200,
  rpm = 1500,
) {
  if (!geoms.length) return "";
  const lathing = machCfg.isLathe;
  const lines = [
    `(GENERATED ${new Date().toLocaleDateString()})`,
    lathing ? "G21 G90 G18 G40" : "G21 G90 G17 G40 G49 G80",
    "T1 M06",
    "G43 H1",
    `S${rpm} M03`,
    "M08",
    "",
  ];
  let bn = 10;
  const N = () => `N${(bn += 10)}`;
  geoms.forEach((g) => {
    if (lathing) {
      if (g.type === "line" && g.pts?.length >= 2) {
        const [p0, p1] = g.pts;
        lines.push(`${N()} G00 X${(p0.x * 2).toFixed(3)} Z${p0.y.toFixed(3)}`);
        lines.push(
          `${N()} G01 X${(p1.x * 2).toFixed(3)} Z${p1.y.toFixed(3)} F${feed}`,
        );
      } else if (g.type === "arc") {
        const sx = g.cx + g.r * Math.cos(g.a0),
          sy = g.cy + g.r * Math.sin(g.a0);
        const ex = g.cx + g.r * Math.cos(g.a1),
          ey = g.cy + g.r * Math.sin(g.a1);
        const I = g.cx - sx,
          K = g.cy - sy;
        const cmd = g.a1 > g.a0 ? "G02" : "G03";
        lines.push(`${N()} G00 X${(sx * 2).toFixed(3)} Z${sy.toFixed(3)}`);
        lines.push(
          `${N()} ${cmd} X${(ex * 2).toFixed(3)} Z${ey.toFixed(3)} I${I.toFixed(3)} K${K.toFixed(3)} F${feed}`,
        );
      } else if (g.type === "circle") {
        lines.push(`${N()} G00 X${(g.r * 2).toFixed(3)} Z2.`);
        lines.push(`${N()} G01 X0. Z0. F${feed} (FACING PASS)`);
        lines.push(`${N()} G00 Z2.`);
      }
    } else {
      lines.push(`${N()} G00 Z5.`);
      if (g.type === "rect") {
        lines.push(`${N()} G00 X${g.x.toFixed(3)} Y${g.y.toFixed(3)}`);
        lines.push(
          `${N()} G01 Z${(-depth).toFixed(3)} F${Math.round(feed * 0.3)}`,
        );
        lines.push(`${N()} G01 X${(g.x + g.w).toFixed(3)} F${feed}`);
        lines.push(`${N()} G01 Y${(g.y + g.h).toFixed(3)}`);
        lines.push(`${N()} G01 X${g.x.toFixed(3)}`);
        lines.push(`${N()} G01 Y${g.y.toFixed(3)}`);
        lines.push(`${N()} G00 Z5.`);
      } else if (g.type === "circle") {
        const r = g.r - toolDia / 2;
        if (r > 0) {
          lines.push(
            `${N()} G00 X${(g.cx + r).toFixed(3)} Y${g.cy.toFixed(3)}`,
          );
          lines.push(
            `${N()} G01 Z${(-depth).toFixed(3)} F${Math.round(feed * 0.3)}`,
          );
          lines.push(`${N()} G02 I${(-r).toFixed(3)} J0. F${feed}`);
          lines.push(`${N()} G00 Z5.`);
        }
      } else if (g.type === "line" && g.pts?.length >= 2) {
        lines.push(
          `${N()} G00 X${g.pts[0].x.toFixed(3)} Y${g.pts[0].y.toFixed(3)}`,
        );
        lines.push(
          `${N()} G01 Z${(-depth).toFixed(3)} F${Math.round(feed * 0.3)}`,
        );
        for (let i = 1; i < g.pts.length; i++)
          lines.push(
            `${N()} G01 X${g.pts[i].x.toFixed(3)} Y${g.pts[i].y.toFixed(3)} F${feed}`,
          );
        if (g.closed && g.pts.length > 2)
          lines.push(
            `${N()} G01 X${g.pts[0].x.toFixed(3)} Y${g.pts[0].y.toFixed(3)}`,
          );
        lines.push(`${N()} G00 Z5.`);
      } else if (g.type === "arc") {
        const sx = g.cx + g.r * Math.cos(g.a0),
          sy = g.cy + g.r * Math.sin(g.a0);
        const ex = g.cx + g.r * Math.cos(g.a1),
          ey = g.cy + g.r * Math.sin(g.a1);
        lines.push(`${N()} G00 X${sx.toFixed(3)} Y${sy.toFixed(3)}`);
        lines.push(
          `${N()} G01 Z${(-depth).toFixed(3)} F${Math.round(feed * 0.3)}`,
        );
        lines.push(
          `${N()} G02 X${ex.toFixed(3)} Y${ey.toFixed(3)} I${(g.cx - sx).toFixed(3)} J${(g.cy - sy).toFixed(3)} F${feed}`,
        );
        lines.push(`${N()} G00 Z5.`);
      }
    }
  });
  lines.push("", "M09", "M05", "M30");
  return lines.join("\n");
}

// ─── PROGRAM LIBRARY ────────────────────────────────────────────────────────
const PROG_LIB = {
  mill: [
    {
      id: "O0001",
      name: "Square Pocket",
      desc: "G01 linear, G43 TLO, 3-axis",
      code: `O0001 (SQUARE POCKET)
G21 G90 G17 G40 G49 G80
T1 M06
G43 H1
S1500 M03
M08
G00 X0 Y0 Z5.
G01 Z-2. F100
G01 X50. F200
G01 Y50.
G01 X0.
G01 Y0.
G00 Z50.
M09 M05 M30`,
    },
    {
      id: "O0002",
      name: "Bolt Circle — WHILE",
      desc: "#vars WHILE DO SIN COS, 8 holes Ø80",
      code: `O0002 (BOLT CIRCLE)
G21 G90 G17 G40 G49 G80
T2 M06 G43 H2
S2000 M03 M08
#100 = 0
#101 = 8
#102 = 40.
WHILE [#100 LT #101] DO1
  N100 #103 = #100 * 360. / #101
  #104 = #102 * COS[#103]
  #105 = #102 * SIN[#103]
  G00 X#104 Y#105
  G81 Z-10. R3. F80
  #100 = #100 + 1
END1
G80
G00 Z50.
M05 M30`,
    },
    {
      id: "O0003",
      name: "Circular Pocket",
      desc: "G02 spiral arc pocket",
      code: `O0003 (CIRCULAR POCKET)
G21 G90 G17
T1 M06 G43 H1
S1800 M03 M08
G00 X0 Y0 Z5.
G01 Z-3. F80
G01 X15. F150
G02 I-15. J0. F200
G01 X25.
G02 I-25. J0. F200
G00 Z50.
M09 M05 M30`,
    },
    {
      id: "O0004",
      name: "Subroutine Demo",
      desc: "M98/M99 drill sub at 4 corners",
      code: `O0004 (SUBROUTINE DEMO)
G21 G90
T2 M06 G43 H2
S2000 M03
G00 X10. Y10.
M98 P9001
G00 X60. Y10.
M98 P9001
G00 X60. Y60.
M98 P9001
G00 X10. Y60.
M98 P9001
G00 Z50. M05 M30
N9001 (DRILL SUB)
G00 Z5.
G01 Z-10. F60
G00 Z5.
M99`,
    },
    {
      id: "O0005",
      name: "5-Axis Tilted Wall",
      desc: "B-axis tilt 30°, side-wall milling pass",
      code: `O0005 (5-AXIS TILTED WALL)
(--- TOOL 1: 10mm END MILL ---)
G21 G90 G17 G40 G49
T1 M06
G43 H1
S3000 M03
M08
(--- RAPID TO HOME CLEARANCE ---)
G28 G91 Z0.
G90
(--- TILT B-AXIS TO 30 DEG ---)
G00 B30.
G00 X-30. Y0.
G00 Z10.
(--- PLUNGE AND SIDE-WALL PASS ---)
G01 Z-5. F100
G01 X-30. Y-40. F200
G01 X30. Y-40.
G01 X30. Y0.
G00 Z10.
(--- SECOND DEPTH PASS ---)
G01 Z-12. F100
G01 X-30. F200
G01 Y40.
G01 X30.
G00 Z10.
(--- RETURN B TO 0, GO HOME ---)
G00 B0.
G28 G91 Z0.
G90
M09 M05 M30`,
    },
  ],
  lathe: [
    {
      id: "O1001",
      name: "OD Turning",
      desc: "Roughing + finish, G96 CSS, facing",
      code: `O1001 (OD TURNING)
G21 G90 G18 G40
T0303 (OD TURNING INSERT)
G96 S200 M03
G50 S3000
M08
G00 X85. Z2.
N10 G01 X80. Z0. F0.3 (FACE)
N20 G01 Z-100. F0.2 (ROUGH OD)
G01 X85.
G00 X85. Z2.
N30 G01 X76. Z0. F0.1 (FINISH FACE)
G01 Z-100. F0.15
G01 X85.
G00 X100. Z50.
M09 M05 M30`,
    },
    {
      id: "O1002",
      name: "Taper + Shoulder",
      desc: "Face, OD taper, shoulder, undercut",
      code: `O1002 (TAPER AND SHOULDER)
G21 G90 G18 G40
T0404 (FACING INSERT)
G96 S180 M03
G50 S4000
M08
G00 X85. Z0.5
N10 G01 X-1. F0.2 (FACE TO CENTER)
G00 X85. Z2.
N20 G01 X0. Z0. F0.3
G01 X40. Z-30. F0.15 (TAPER)
G01 Z-60. F0.15 (SHOULDER)
G01 X85.
G00 Z50.
M09 M05 M30`,
    },
    {
      id: "O1003",
      name: "OD Groove + Part-Off",
      desc: "Multiple grooves then parting",
      code: `O1003 (GROOVE AND PART)
G21 G90 G18 G40
T0505 (3mm GROOVING)
G97 S800 M03
M08
G00 X82. Z-50.
N10 G01 X60. F0.05
G04 P500
G01 X82. F0.1
G00 Z-55.
N20 G01 X60. F0.05
G04 P500
G01 X82. F0.1
G00 X82. Z-90.
N30 G01 X-1. F0.05 (PART OFF)
G00 X100. Z100.
M09 M05 M30`,
    },
    {
      id: "O1004",
      name: "Threading G76",
      desc: "M40×1.5 two-pass threading cycle",
      code: `O1004 (THREADING M40x1.5)
G21 G90 G18 G40
T0606 (THREADING TOOL)
G97 S600 M03
M08
G00 X45. Z5.
N10 G76 P010060 Q0.1 R0.05
G76 X38.05 Z-40. P0.974 Q0.3 F1.5
G00 X100. Z100.
M09 M05 M30`,
    },
    {
      id: "O1005",
      name: "Live Tool Cross-Drill",
      desc: "C-axis index + live tool drilling",
      code: `O1005 (LIVE TOOL CROSS DRILL)
G21 G90 G18 G40
T0303 G97 S800 M03 (OD ROUGH)
M08
G00 X85. Z2.
G01 Z-60. F0.2
G01 X85. G00 Z50.
M05
(LIVE TOOL SECTION)
T0606 (LIVE DRILL 8mm)
G97 S2500 M13 (LIVE TOOL CW + COOLANT)
G00 Z-30. X85.
M19 (SPINDLE ORIENT)
C0.
G01 X50. F60. (RADIAL DRILL)
G00 X85.
C180.
G01 X50. F60.
G00 X85.
C90.
G01 X50. F60.
G00 X100. Z100.
M05 M09 M30`,
    },
  ],
  millturn: [
    {
      id: "O2001",
      name: "Mill-Turn Combo",
      desc: "OD turn + B-axis mill feature",
      code: `O2001 (MILL-TURN)
G21 G90 G18 G40
T0303 G96 S200 M03 M08
G00 X85. Z2.
G01 Z-80. F0.2
G01 X85. G00 Z50. M05
(B-AXIS MILL FEATURE)
G90 G17
B0. (B TO 0)
T0606 (LIVE EM)
G97 S3000 M13
G00 X0 Y0 Z-20.
G01 Z-25. F80
G01 X30. F200
G01 Y30.
G01 X0. Y0.
G00 Z50.
M05 M09 M30`,
    },
  ],

  fanuc_lathe_multich: [
    {
      id: "O3001",
      name: "Twin Turret Sync",
      desc: "Two tagged channels with sync waits",
      code: `O3001 (2-CHANNEL SYNC DEMO)
$1 T0101
$1 G21 G90 G18
$1 G97 S1800 M03
$1 G00 X40. Z2.
$1 G01 Z-25. F0.2
$1 M200 P1
$1 G01 X28. F0.15
$1 G00 X60. Z60.
$1 M30
$2 T0202
$2 G21 G90 G18
$2 G97 S1500 M03
$2 G00 X60. Z2.
$2 G01 X42. Z-10. F0.18
$2 M200 P1
$2 G01 Z-35. F0.12
$2 G00 X80. Z60.
$2 M30`,
    },
  ],
  fanuc_lathe_3turret: [
    {
      id: "O3101",
      name: "3 Turret Global Sync",
      desc: "Three channels meeting at a common sync point",
      code: `O3101 (3-TURRET SYNC DEMO)
$1 T0101
$1 G21 G90 G18
$1 G97 S1600 M03
$1 G00 X45. Z2.
$1 G01 Z-18. F0.2
$1 M300 P7
$1 G00 X70. Z70.
$1 M30
$2 T0202
$2 G21 G90 G18
$2 G97 S1400 M03
$2 G00 X55. Z0.
$2 G01 X35. Z-12. F0.18
$2 M300 P7
$2 G00 X80. Z70.
$2 M30
$3 T0303
$3 G21 G90 G18
$3 G97 S1200 M03
$3 G00 X30. Z10.
$3 G01 Z-30. F0.16
$3 M300 P7
$3 G00 X65. Z80.
$3 M30`,
    },
  ],

  // ── Siemens 840D programs ──────────────────────────────────────────────────
  siemens_mill: [
    {
      id: "P1",
      name: "Square Pocket",
      desc: "Siemens 840D — G01 linear",
      code: `;SQUARE POCKET - Siemens 840D
G71 G90 G17 G40 G49
T1 D1 M6
S1500 M3
M8
G0 X0 Y0 Z5.
G1 Z-2. F100
G1 X50. F200
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
M9 M5 M30`,
    },
    {
      id: "P2",
      name: "Bolt Circle — R-vars",
      desc: "Siemens R-vars WHILE loop, 8 holes Ø80",
      code: `;BOLT CIRCLE - Siemens 840D
G71 G90 G17 G40
T2 D1 M6
S2000 M3 M8
R100=0
R101=8
R102=40.
WHILE R100<R101
  R103=R100*360./R101
  R104=R102*COS(R103)
  R105=R102*SIN(R103)
  G0 X=R104 Y=R105
  G81 Z=-10. DP=-10. RTP=3. F80
  R100=R100+1
ENDWHILE
G80
G0 Z50.
M5 M30`,
    },
  ],
  siemens_lathe: [
    {
      id: "P10",
      name: "OD Turning",
      desc: "Siemens 840D — G96 CSS, roughing",
      code: `;OD TURNING - Siemens 840D
G71 G90 G18 G40
T1 D1
G96 S200 M3
M8
G0 X85. Z2.
G1 X80. Z0. F0.3
G1 Z-100. F0.2
G1 X85.
G0 X100. Z50.
M9 M5 M30`,
    },
  ],
  siemens_840d_sync: [
    {
      id: "P20",
      name: "2 Channel Sync",
      desc: "Two Siemens channels with buffer wait",
      code: `CHAN1:
G71 G90 G17
T1 D1 M6
S2400 M3
G0 X0 Y0 Z10.
G1 Z-6. F120
WBUF
G1 X40. F260
G0 Z30.
M30
CHAN2:
G71 G90 G17
T2 D1 M6
S1800 M3
G0 X10 Y40 Z10.
G1 Z-4. F110
WBUF
G1 Y0. F220
G0 Z25.
M30`,
    },
  ],

  // ── Okuma OSP programs (VC variables) ─────────────────────────────────────
  okuma_mill: [
    {
      id: "O0001",
      name: "Square Pocket",
      desc: "Okuma OSP — standard G-code",
      code: `O0001 (SQUARE POCKET - OKUMA)
G21 G90 G17 G40 G49 G80
T1 M6
G43 H1
S1500 M3
M8
G0 X0 Y0 Z5.
G1 Z-2. F100
G1 X50. F200
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
M9 M5 M30`,
    },
    {
      id: "O0002",
      name: "Bolt Circle — VC vars",
      desc: "Okuma VC variable loop, 8 holes Ø80",
      code: `O0002 (BOLT CIRCLE - OKUMA OSP)
G21 G90 G17 G40 G49 G80
T2 M6 G43 H2
S2000 M3 M8
VC100=0
VC101=8
VC102=40.
WHILE [VC100 LT VC101] DO1
  VC103=VC100*360./VC101
  VC104=VC102*COS[VC103]
  VC105=VC102*SIN[VC103]
  G0 X[VC104] Y[VC105]
  G81 Z-10. R3. F80
  VC100=VC100+1
END1
G80
G0 Z50.
M5 M30`,
    },
  ],
  okuma_lathe: [
    {
      id: "O1001",
      name: "OD Turning",
      desc: "Okuma OSP — G96 CSS turning",
      code: `O1001 (OD TURNING - OKUMA)
G21 G90 G18 G40
T0303
G96 S200 M3
G50 S3000
M8
G0 X85. Z2.
G1 X80. Z0. F0.3
G1 Z-100. F0.2
G1 X85.
G0 X100. Z50.
M9 M5 M30`,
    },
  ],
  okuma_multitask: [
    {
      id: "O1201",
      name: "Dual Channel Wait",
      desc: "Two Okuma channels with wait M-codes",
      code: `$1 O1201
$1 G21 G90 G18
$1 T0101
$1 G97 S1600 M03
$1 G00 X48. Z2.
$1 G01 Z-20. F0.2
$1 M200 P4
$1 G01 X32. F0.15
$1 G00 X80. Z80.
$1 M30
$2 O1201
$2 G21 G90 G18
$2 T0202
$2 G97 S1500 M03
$2 G00 X70. Z0.
$2 G01 X44. Z-12. F0.18
$2 M200 P4
$2 G01 Z-38. F0.12
$2 G00 X90. Z80.
$2 M30`,
    },
  ],

  // ── HAAS programs (Fanuc-compatible, slight differences) ──────────────────
  haas_mill: [
    {
      id: "O0001",
      name: "Square Pocket",
      desc: "HAAS Fanuc-compat macro B",
      code: `O0001 (SQUARE POCKET - HAAS)
G21 G90 G17 G40 G49 G80
T1 M6
G43 H1
S1500 M3
M8
G0 X0. Y0. Z5.
G1 Z-2. F100.
G1 X50. F200.
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
M9 M5 M30`,
    },
    {
      id: "O0002",
      name: "Bolt Circle — Macro B",
      desc: "HAAS #vars WHILE/DO/END, 8 holes",
      code: `O0002 (BOLT CIRCLE - HAAS)
G21 G90 G17 G40 G49 G80
T2 M6 G43 H2
S2000 M3 M8
#100 = 0.
#101 = 8.
#102 = 40.
WHILE [#100 LT #101] DO1
#103 = #100 * 360. / #101
#104 = #102 * COS[#103]
#105 = #102 * SIN[#103]
G0 X#104 Y#105
G81 Z-10. R3. F80.
#100 = #100 + 1.
END1
G80
G0 Z50.
M9 M5 M30`,
    },
    {
      id: "O9000",
      name: "4-Part Tombstone (B-Axis)",
      desc: "G54-G57 corners, B0 top + B-90 side, macro sub",
      code: `O9000 (4-PART TOMBSTONE - B-AXIS 2-FACE DRILL)
(---------------------------------------------------)
( HAAS UMC / FANUC 5-AXIS                          )
( 4 PARTS AT CORNERS OF TABLE - G54 THRU G57       )
( FACE 1 : B0.   C0.  TOP FACE   - DRILL X0 Y0     )
( FACE 2 : B-90. C0.  SIDE FACE  - DRILL X0 Y0     )
(---------------------------------------------------)
( PART LAYOUT (set WCS offsets to match):           )
(   G54  X+80  Y+80  Z0   front-right corner        )
(   G55  X-80  Y+80  Z0   front-left  corner        )
(   G56  X-80  Y-80  Z0   rear-left   corner        )
(   G57  X+80  Y-80  Z0   rear-right  corner        )
(---------------------------------------------------)
( SUBROUTINE O9100 : drills one hole per WCS        )
(   A-argument = WCS number  54/55/56/57            )
(---------------------------------------------------)
G21 G90 G40 G49 G80
(--- TOOL 1: 12mm CARBIDE DRILL ---)
T1 M6
G43 H1
S2200 M3
M8
(=== SET WORK OFFSETS VIA G10 (edit as needed) ===)
G10 L2 P1 X80. Y80. Z0.
G10 L2 P2 X-80. Y80. Z0.
G10 L2 P3 X-80. Y-80. Z0.
G10 L2 P4 X80. Y-80. Z0.
(=== FACE 1 : B0 TOP FACE ===)
G00 B0. C0.
G91 G28 Z0.
G90
G65 P9100 A54.
G65 P9100 A55.
G65 P9100 A56.
G65 P9100 A57.
(=== FACE 2 : B-90 SIDE FACE ===)
G00 B-90. C0.
G91 G28 Z0.
G90
G65 P9100 A54.
G65 P9100 A55.
G65 P9100 A56.
G65 P9100 A57.
(=== RETURN HOME ===)
G00 B0. C0.
G91 G28 Z0.
G90
M9 M5
M30
O9100 (DRILL SUB - #1 = WCS CODE 54/55/56/57)
(Select work offset from A-argument)
IF [#1 EQ 54] G54
IF [#1 EQ 55] G55
IF [#1 EQ 56] G56
IF [#1 EQ 57] G57
G00 X0. Y0.
G00 Z5.
G81 X0. Y0. Z-20. R3. F120.
G80
G00 Z50.
M99`,
    },
  ],
};

// ── Helper: pick the right program set for the active machine definition ─────
function getProgLib(machDef) {
  if (!machDef) return PROG_LIB.mill;
  if (machDef.id && PROG_LIB[machDef.id]) return PROG_LIB[machDef.id];
  const dialect = machDef.dialect || "fanuc";
  const cls = machDef.class || "mill";
  const isLathe = cls === "lathe" || cls === "millturn" || cls === "swiss";

  // Check dialect-specific library first
  const dialectKey = `${dialect}_${isLathe ? "lathe" : "mill"}`;
  if (PROG_LIB[dialectKey]) return PROG_LIB[dialectKey];

  // Fanuc/generic fallback by machine class
  if (cls === "millturn") return PROG_LIB.millturn;
  if (isLathe) return PROG_LIB.lathe;
  return PROG_LIB.mill;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const getCSS = () => `
.sim *{box-sizing:border-box;margin:0;padding:0}
.sim{font-family:'Inter',sans-serif;font-size:12px;background:${C.bg};color:${C.txt};display:grid;grid-template-rows:42px 1fr;height:100vh;width:100vw;overflow:hidden}
.topbar{background:${C.grad};border-bottom:1px solid ${C.gradBorder};color:${C.brandTxt};display:flex;align-items:center;padding:0;z-index:20;overflow:hidden}
.brand{color:inherit;font-weight:700;font-size:13px;padding:0 14px;border-right:1px solid ${C.gradBorder};height:100%;display:flex;align-items:center;gap:8px;white-space:nowrap;letter-spacing:.5px}
.tseg{display:flex;align-items:center;gap:5px;padding:0 10px;border-right:1px solid ${C.gradBorder};height:100%;white-space:nowrap}
.tlbl{font-size:9px;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase}
.tval{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600}
.bdg{border-radius:3px;padding:2px 7px;font-size:9px;font-weight:700;border:1px solid}
.bdg-bl{background:${C.blueBg};color:${C.blue2};border-color:${C.blue}30}
.bdg-gr{background:${C.greenBg};color:${C.green2};border-color:${C.green}30}
.bdg-am{background:${C.amberBg};color:${C.amber2};border-color:${C.amber}30}
.bdg-rd{background:${C.redBg};color:${C.red2};border-color:${C.red}30}
.bdg-mt{background:${C.p2};color:${C.txt3};border-color:${C.bd}}
.run-dot{width:9px;height:9px;border-radius:50%;background:${C.txt3};flex-shrink:0;transition:.3s}
.run-dot.run{background:${C.green};box-shadow:0 0 0 3px ${C.green}25;animation:blink .9s infinite}
.run-dot.done{background:${C.amber}}
.run-dot.err{background:${C.red}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.main{display:grid;grid-template-columns:260px minmax(320px,1fr) 6px 420px;overflow:hidden;height:100%}
.panel{background:${C.p1};border-right:1px solid ${C.bd};display:flex;flex-direction:column;overflow:hidden}
.panel-r{border-right:none;border-left:1px solid ${C.bd}}
.splitter{background:${C.bg};border-left:1px solid ${C.bd};border-right:1px solid ${C.bd};cursor:col-resize}
.splitter:hover{background:${C.p3}}
.tabrow{display:flex;background:${C.bg};border-bottom:1px solid ${C.bd};flex-shrink:0}
.tab{flex:1;padding:6px 2px;text-align:center;font-size:9px;font-weight:700;letter-spacing:.5px;color:${C.txt3};cursor:pointer;border-bottom:2px solid transparent;text-transform:uppercase}
.tab.on{color:${C.blue};border-bottom-color:${C.blue};background:${C.blueBg}}
.pscroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:10px}
.pscroll::-webkit-scrollbar{width:4px}
.pscroll::-webkit-scrollbar-thumb{background:${C.bd2};border-radius:2px}
.sec{font-size:9px;font-weight:700;letter-spacing:2px;color:${C.txt3};text-transform:uppercase;margin:10px 0 6px;padding-bottom:4px;border-bottom:1px solid ${C.bd}}
.sec:first-child{margin-top:0}
.div{height:1px;background:${C.bd};margin:9px 0}
.dro{display:flex;align-items:center;background:${C.bg};border:1px solid ${C.bd};border-radius:4px;padding:5px 8px;margin-bottom:3px;gap:8px}
.dro-ax{font-family:monospace;font-size:12px;font-weight:700;width:14px;flex-shrink:0}
.dro-num{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:700;flex:1;text-align:right;letter-spacing:-.5px}
.dro-unit{font-size:9px;color:${C.txt3};min-width:20px}
.mini{display:flex;justify-content:space-between;align-items:center;padding:3px 7px;background:${C.bg};border:1px solid ${C.bd};border-radius:3px;margin-bottom:2px}
.mini-l{font-size:9px;color:${C.txt3};font-family:monospace}
.mini-v{font-family:'JetBrains Mono',monospace;font-size:10px;color:${C.txt2}}
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px}
.sbox{background:${C.bg};border:1px solid ${C.bd};border-radius:4px;padding:5px 7px}
.sbox-l{font-size:8px;color:${C.txt3};font-weight:700;letter-spacing:1px;text-transform:uppercase}
.sbox-v{font-size:13px;font-weight:700;margin-top:2px;font-family:monospace}
input,select,textarea{background:${C.p2};border:1px solid ${C.bd};color:${C.txt};border-radius:3px;padding:4px 7px;font-family:inherit;font-size:11px;width:100%;outline:none;transition:.15s}
input:focus,select:focus,textarea:focus{border-color:${C.blue};background:${C.p3}}
select option{background:${C.p2}}
.lbl{font-size:9px;font-weight:600;color:${C.txt3};text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.field{margin-bottom:5px}
.frow{display:flex;gap:5px}
.frow>.field{flex:1;min-width:0}
.btn{background:${C.p3};border:1px solid ${C.bd2};color:${C.txt};border-radius:3px;padding:5px 10px;font-family:inherit;font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap}
.btn:hover{border-color:${C.blue};color:${C.blue2}}
.btn-bl{background:${C.blueBg};color:${C.blue2};border-color:${C.blue}30}
.btn-gr{background:${C.greenBg};color:${C.green2};border-color:${C.green}30}
.btn-am{background:${C.amberBg};color:${C.amber2};border-color:${C.amber}30}
.btn-rd{background:${C.redBg};color:${C.red2};border-color:${C.red}30}
.btn.full{width:100%;text-align:center}
.btn.lg{padding:7px 14px;font-size:12px;font-weight:600}
.btnrow{display:flex;gap:4px}
.mccard{background:${C.bg};border:1px solid ${C.bd};border-radius:4px;padding:7px 5px;cursor:pointer;text-align:center;transition:.15s}
.mccard:hover{border-color:${C.bd2}}
.mccard.on{border-color:${C.blue};background:${C.blueBg}}
.mccard-n{font-size:9px;font-weight:700;margin-top:3px}
.mccard-s{font-size:8px;color:${C.txt3};margin-top:1px}
.tcard{background:${C.bg};border:1px solid ${C.bd};border-radius:4px;padding:7px 9px;margin-bottom:4px;cursor:pointer;transition:.15s}
.tcard:hover{border-color:${C.bd2}}
.tcard.on{border-color:${C.amber};background:${C.amberBg}}
.tcard-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
.tcard-name{font-size:10px;font-weight:600}
.tcard-meta{font-size:9px;color:${C.txt3};font-family:monospace;line-height:1.6}
.wcs-item{display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:${C.bg};border:1px solid ${C.bd};border-radius:3px;margin-bottom:3px;cursor:pointer}
.wcs-item.on{border-color:${C.blue};background:${C.blueBg}}
.mvar{display:flex;justify-content:space-between;padding:3px 6px;border-bottom:1px solid ${C.bd}}
.mvar-k{font-size:9px;color:${C.teal};font-family:monospace}
.mvar-v{font-size:9px;color:${C.purple};font-family:monospace}
.alarm-i{background:${C.redBg};border:1px solid ${C.red}25;border-radius:3px;padding:4px 7px;color:${C.red2};font-size:9px;margin-bottom:3px}
#vpWrap{position:relative;background:${C.vpBg};overflow:hidden;flex:1}
#vpCvs{display:block}
.vp-hud{position:absolute;top:10px;left:10px;background:${C.p1}E6;border:1px solid ${C.bd};border-radius:4px;padding:7px 11px;font-size:10px;line-height:1.9;pointer-events:none;z-index:5;color:${C.txt}}
.vp-hud span{font-family:'JetBrains Mono',monospace;font-weight:600}
.coord-input-bar{position:absolute;bottom:0;left:0;right:0;background:${C.p1}FA;border-top:1px solid ${C.blue};padding:6px 10px;display:flex;gap:6px;align-items:center;z-index:10}
.snap-indicator{position:absolute;pointer-events:none;z-index:8}
.vp-legend{position:absolute;bottom:10px;left:10px;display:flex;gap:5px;pointer-events:none;z-index:5}
.leg{font-size:9px;padding:2px 7px;border-radius:2px;border:1px solid}
.vp-toolbar{position:absolute;top:10px;right:10px;display:flex;gap:4px;z-index:5}
.vp-btn{background:${C.p1}E6;border:1px solid ${C.bd};color:${C.txt3};border-radius:3px;padding:4px 9px;font-size:9px;font-weight:600;cursor:pointer;font-family:inherit}
.vp-btn:hover{border-color:${C.blue};color:${C.blue}}
.vp-btn.on{border-color:${C.green};color:${C.green};background:${C.greenBg}}
.ctrlbar{background:${C.p1};border-bottom:1px solid ${C.bd};padding:5px 10px;display:flex;align-items:center;gap:5px;flex-shrink:0;overflow-x:auto}
.ctrl-div{width:1px;height:22px;background:${C.bd};margin:0 2px;flex-shrink:0}
.trace-area{display:flex;flex-direction:column;flex:1;min-height:220px}
.trace-hdr{font-size:9px;font-weight:700;letter-spacing:1px;color:${C.txt3};padding:4px 10px;border-bottom:1px solid ${C.bd};flex-shrink:0;display:flex;gap:8px;align-items:center;text-transform:uppercase}
.trace-lines{flex:1;overflow-y:auto;padding:2px 8px}
.trace-lines::-webkit-scrollbar{width:3px}
.trace-lines::-webkit-scrollbar-thumb{background:${C.bd2}}
.tline{padding:1px 4px;display:flex;gap:8px;font-size:9px;font-family:monospace;line-height:1.6;border-radius:2px;cursor:pointer}
.tline:hover{background:${C.p3}}
.tline.cur{background:${C.greenBg};color:${C.green2}}
.tline.cmt{color:${C.txt3};font-style:italic}
.tline.rpl{border-left:2px solid ${C.rapid}}
.tline.fpl{border-left:2px solid ${C.feed}}
.tline.apl{border-left:2px solid ${C.arc}}
.tline-n{color:${C.bd2};min-width:30px;text-align:right;user-select:none;flex-shrink:0}
.tline-nn{color:${C.blue2};min-width:30px;text-align:right;flex-shrink:0;font-weight:700}
#ceditor{flex:1;resize:none;background:${C.codeBg};color:${C.green};font-family:'JetBrains Mono',monospace;font-size:11px;border:none;outline:none;line-height:1.7;padding:8px;width:100%}
.progbar{height:2px;background:${C.bd};border-radius:1px;overflow:hidden}
.progfill{height:100%;background:${C.blue};border-radius:1px;transition:.3s}
.draw-tb{display:flex;gap:3px;padding:5px 8px;border-bottom:1px solid ${C.bd};background:${C.bg};flex-shrink:0;flex-wrap:wrap;align-items:center}
.dbtn{background:${C.p3};border:1px solid ${C.bd};color:${C.txt3};border-radius:3px;padding:3px 7px;font-size:9px;font-weight:700;cursor:pointer}
.dbtn.on{border-color:${C.blue};color:${C.blue};background:${C.blueBg}}
.geom-item{display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:${C.bg};border:1px solid ${C.bd};border-radius:3px;margin-bottom:3px;cursor:pointer;font-size:9px}
.geom-item.on{border-color:${C.blue};background:${C.blueBg}}
.stock-cvs{width:100%;height:76px;background:${C.bg};border:1px solid ${C.bd};border-radius:4px;display:block;margin-bottom:6px}
.tool-cvs{width:100%;height:110px;background:${C.bg};border:1px solid ${C.bd};border-radius:4px;display:block;margin-bottom:6px}
.filedrop{border:1px dashed ${C.bd2};border-radius:4px;padding:12px;text-align:center;color:${C.txt3};font-size:9px;cursor:pointer}
.filedrop:hover{border-color:${C.blue};color:${C.blue2}}
input[type=range]{-webkit-appearance:none;height:3px;background:${C.bd};border-radius:2px;padding:0;border:none}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:${C.blue};cursor:pointer}
.mcfg-row{display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${C.bd}}
.mcfg-lbl{font-size:10px;color:${C.txt2}}
.toggle{display:flex;align-items:center;gap:6px}
.toggle input[type=checkbox]{width:auto;accent-color:${C.blue}}
`;

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function CNCSimPro({ importedGCode = null } = {}) {
  const isDarkFn = useCallback(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
    [],
  );
  const [dark, setDark] = useState(isDarkFn);

  useEffect(() => {
    const ob = new MutationObserver(() => setDark(isDarkFn()));
    ob.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => ob.disconnect();
  }, [isDarkFn]);

  const themeC = useCncTheme();
    Object.assign(C, themeC);

  const CSS = useMemo(() => getCSS(), [dark]);

  const [machDefId, setMachDefId] = useState("fanuc_mill");
  const [mach, setMach] = useState(
    engineDefToMachCfg(MACHINE_DEFINITIONS["fanuc_mill"]),
  );
  const [customMach, setCustomMach] = useState(
    engineDefToMachCfg(MACHINE_DEFINITIONS["fanuc_mill"]),
  );
  const [showMachBuilder, setShowMachBuilder] = useState(false);

  const activeToolClass = mach.isLathe ? "lathe" : "mill";

  const [ms, setMs] = useState(initMS);
  const [coordinateSystems, setCoordinateSystems] = useState(() =>
    createDefaultCoordinateSystems(initMS().offsets),
  );
  const [activeCoordinateSystemId, setActiveCoordinateSystemId] =
    useState("wcs_G54");
  const [toolLibraries, setToolLibraries] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("cnc_tool_libraries_v1") || "null",
      );
      if (saved && typeof saved === "object" && saved.mill && saved.lathe) {
        return {
          mill: normalizeToolTable(saved.mill, "mill"),
          lathe: normalizeToolTable(saved.lathe, "lathe"),
        };
      }
    } catch {
      // ignore corrupt local storage payloads
    }
    return { mill: initTools("mill"), lathe: initTools("lathe") };
  });
  const [tools, setTools] = useState(
    () => toolLibraries[activeToolClass] || initTools(activeToolClass),
  );

  useEffect(() => {
    setTools((prevTools) => {
      const nextTools = normalizeToolTable(
        toolLibraries[activeToolClass] || initTools(activeToolClass),
        activeToolClass,
      );
      if (JSON.stringify(prevTools) === JSON.stringify(nextTools)) {
        return prevTools;
      }
      return nextTools;
    });
  }, [activeToolClass, toolLibraries]);

  useEffect(() => {
    setToolLibraries((prev) => {
      const nextTools = normalizeToolTable(tools, activeToolClass);
      if (
        prev?.[activeToolClass] === tools ||
        JSON.stringify(prev?.[activeToolClass]) === JSON.stringify(nextTools)
      ) {
        return prev;
      }
      return {
        ...prev,
        [activeToolClass]: nextTools,
      };
    });
  }, [tools, activeToolClass]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "cnc_tool_libraries_v1",
        JSON.stringify(toolLibraries),
      );
    } catch {
      // ignore storage failures
    }
  }, [toolLibraries]);
  const [stock, setStock] = useState({
    shape: "rect",
    width: 100,
    height: 80,
    depth: 40,
    x: 0,
    y: 0,
    z: 0,
  });
  const [fixtures, setFixtures] = useState([]);
  const [stockSTLBuffer, setStockSTLBuffer] = useState(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState(null);
  const [transformMode, setTransformMode] = useState("translate");
  const [snapGrid, setSnapGrid] = useState(0);
  const [facePickMode, setFacePickMode] = useState(false);
  const [code, setCode] = useState(
    () => getProgLib(MACHINE_DEFINITIONS["fanuc_mill"])[0].code,
  );
  const [projectFiles, setProjectFiles] = useState(() =>
    exampleToProject(getProgLib(MACHINE_DEFINITIONS["fanuc_mill"])[0]),
  );
  const [activeFileId, setActiveFileId] = useState(null);
  const [validationIssues, setValidationIssues] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [channelBlocks, setChannelBlocks] = useState([[]]);
  const [channelStates, setChannelStates] = useState([]);
  const [activeChannel, setActiveChannel] = useState(0);
  const [pathPts, setPathPts] = useState([]);
  const [pStats, setPStats] = useState({
    blocks: 0,
    rapid: 0,
    cut: 0,
    arc: 0,
    tc: 0,
    time: 0,
    dist: 0,
    units: "mm",
  });
  const [curPt, setCurPt] = useState(0);
  const [pointer, setPointer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sbk, setSbk] = useState(false);
  const [speedMode, setSpeedMode] = useState("max");
  const [custSpeed, setCustSpeed] = useState(500);
  const [feedOvr, setFeedOvr] = useState(100);
  const [rpmOvr, setRpmOvr] = useState(100);
  const [jogAxis, setJogAxis] = useState("X");
  const [jogStep, setJogStep] = useState(0.001);
  const [layers, setLayers] = useState({
    stock: true,
    grid: true,
    tool: true,
    removal: true,
  });
  const [vpView, setVpView] = useState("iso");
  const [geoms, setGeoms] = useState([]);
  const [drawTool, setDrawTool] = useState("select");
  const [drawPts, setDrawPts] = useState([]);
  const [drawActive, setDrawActive] = useState(false);
  const [selGeom, setSelGeom] = useState(null);
  const [snapMode, setSnapMode] = useState({ grid: true, points: true });
  const [snapIndicator, setSnapIndicator] = useState(null);
  const [coordInput, setCoordInput] = useState({
    visible: false,
    x: "0",
    y: "0",
    z: "0",
  });
  const [geomDepth, setGeomDepth] = useState(2);
  const [geomFeed, setGeomFeed] = useState(200);
  const [matRemoval, setMatRemoval] = useState([]); // array of {z, xRadius} profiles
  const [leftTab, setLeftTab] = useState("dro");
  const [rightTab, setRightTab] = useState("tools");
  const [toolUnits, setToolUnits] = useState("mm");
  const [stockUnits, setStockUnits] = useState("mm");
  const [toolPathStep, setToolPathStep] = useState(0);
  const [alarms, setAlarms] = useState([]);
  const [opMsgs, setOpMsgs] = useState([]);
  const [savedProgs, setSavedProgs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("csv4") || "[]");
    } catch {
      return [];
    }
  });
  const [editTool, setEditTool] = useState({
    schema: TOOL_SCHEMA_VERSION,
    n: 7,
    cls: "lathe",
    type: "OD Turning",
    desc: "",
    units: "mm",
    dia: 0,
    cr: 0.8,
    tlo: 30,
    lc: 0,
    lt: 30,
    shank: 16,
    fl: 1,
    mat: "Carbide",
    hdia: 16,
    hlen: 80,
    neckDia: 8,
    neckLen: 12,
    wearR: 0,
    wearL: 0,
    iAngle: 80,
    relief: 5,
  });
  const [arcPts, setArcPts] = useState([]); // for 3-point arc
  const [rightPanelWidth, setRightPanelWidth] = useState(460);

  const machDef =
    MACHINE_DEFINITIONS[machDefId] || MACHINE_DEFINITIONS["fanuc_mill"];
  const controlBehavior = useMemo(() => getControlBehavior(machDef), [machDef]);
  const currentProjectFile = useMemo(
    () =>
      projectFiles.find((f) => f.id === activeFileId) ||
      projectFiles[0] ||
      null,
    [projectFiles, activeFileId],
  );

  const vpRef = useRef(null);
  const cvsRef = useRef(null);
  const camRef = useRef({ px: 0, py: 0, zoom: 1, az: -0.65, el: 0.48 });
  const ptrRef = useRef(0);
  const blksRef = useRef([]);
  const pathRef = useRef([]);
  const msRef = useRef(ms);
  const activeChannelRef = useRef(activeChannel);
  const playRef = useRef(null);
  const editorReloadRef = useRef(null);
  const toolPathAnimRef = useRef(null);
  const engineRef = useRef(null);
  const backplotWorkerRef = useRef(null);
  const backplotRequestRef = useRef(0);
  const backplotAlarmsRef = useRef([]);
  const doneRef = useRef(false);
  const playingRef = useRef(false);
  const dragRef = useRef({ on: false, btn: 0, lx: 0, ly: 0 });
  const remRef = useRef([]); // material removal profile
  const projectFilesRef = useRef(projectFiles);

  // keep refs in sync
  useEffect(() => {
    msRef.current = ms;
  }, [ms]);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);
  useEffect(() => {
    blksRef.current = blocks;
  }, [blocks]);
  useEffect(() => {
    pathRef.current = pathPts;
  }, [pathPts]);
  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    projectFilesRef.current = projectFiles;
  }, [projectFiles]);
  useEffect(() => {
    if (typeof Worker === "undefined") return undefined;
    const worker = new Worker(new URL("./cncEngine.worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (!data || data.requestId !== backplotRequestRef.current) return;
      if (data.error) {
        const next = [`ERROR: Backplot worker failed: ${data.error}`];
        backplotAlarmsRef.current = next;
        setAlarms(next);
        return;
      }
      const nextPath = Array.isArray(data.pathPoints) ? data.pathPoints : [];
      const nextAlarms = formatEngineDiagnostics(data.diagnostics);
      pathRef.current = nextPath;
      backplotAlarmsRef.current = nextAlarms;
      setPathPts(nextPath);
      setPStats(data.stats || { blocks: 0, rapid: 0, cut: 0, arc: 0, tc: 0, time: 0, dist: 0, units: "mm" });
      setAlarms(nextAlarms);
    };
    worker.onerror = (event) => {
      const next = [`ERROR: Backplot worker failed: ${event.message || "unknown error"}`];
      backplotAlarmsRef.current = next;
      setAlarms(next);
    };
    backplotWorkerRef.current = worker;
    return () => {
      worker.terminate();
      backplotWorkerRef.current = null;
    };
  }, []);
  useEffect(() => {
    setCoordinateSystems((prev) => {
      const next = syncCoordinateSystemsFromOffsets(prev, ms.offsets);
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, [ms.offsets]);
  useEffect(() => {
    if (!projectFiles.length) return;
    if (!activeFileId || !projectFiles.some((f) => f.id === activeFileId)) {
      setActiveFileId(projectFiles[0].id);
    }
  }, [projectFiles, activeFileId]);
  useEffect(() => {
    if (currentProjectFile && code !== currentProjectFile.content) {
      setCode(currentProjectFile.content);
    }
  }, [currentProjectFile, code]);

  const loadProjectFiles = useCallback(
    (files, { activeId = null, switchTo = null } = {}) => {
      const nextFiles = files.map((file) => ({
        ...file,
        programId: inferProgramId(file.content, file.name),
      }));
      setProjectFiles(nextFiles);
      setValidationIssues(validateProjectFiles(nextFiles, machDef));
      if (nextFiles.length) {
        const nextActive =
          activeId && nextFiles.some((f) => f.id === activeId)
            ? activeId
            : nextFiles[0].id;
        setActiveFileId(nextActive);
        setCode(
          nextFiles.find((f) => f.id === nextActive)?.content ||
            nextFiles[0].content ||
            "",
        );
      } else {
        setActiveFileId(null);
        setCode("");
      }
      if (switchTo) setRightTab(switchTo);
    },
    [machDef],
  );

  const replaceCurrentFileContent = useCallback(
    (nextContent) => {
      setCode(nextContent);
      setProjectFiles((prev) =>
        prev.map((file) =>
          file.id === activeFileId
            ? {
                ...file,
                content: nextContent,
                programId: inferProgramId(nextContent, file.name),
              }
            : file,
        ),
      );
    },
    [activeFileId],
  );

  const compileProjectSources = useCallback((overrideFiles = null) => {
    const files = overrideFiles || projectFilesRef.current;
    return buildProjectSources(files);
  }, []);

  // ─── CAD import bridge ────────────────────────────────────────
  const lastImportedGCodeRef = useRef(null);
  useEffect(() => {
    if (!importedGCode || importedGCode === lastImportedGCodeRef.current) return;
    lastImportedGCodeRef.current = importedGCode;
    loadProjectFiles([
      createProjectFile({ name: "CAD Export.nc", content: importedGCode, bucket: "main", channel: null }),
    ]);
  }, [importedGCode, loadProjectFiles]);

  // ─── Reload code / project ────────────────────────────────────
  // Keep tools in a ref so `reload` doesn't list `tools` as a dep.
  // If it did, every tool edit would recreate `reload`, re-fire the
  // machDefId effect (which also depends on `reload`), and reset stock.
  const toolsRef = useRef(tools);
  toolsRef.current = tools;
  const toolUnitsRef = useRef(toolUnits);
  toolUnitsRef.current = toolUnits;
  const reload = useCallback(
    (src, options = {}) => {
      const s = src ?? compileProjectSources();
      const defId = options.machDefId || machDefId;
      const def =
        MACHINE_DEFINITIONS[defId] || MACHINE_DEFINITIONS["fanuc_mill"];

      setValidationIssues(validateProjectFiles(projectFilesRef.current, def));
      const engine = new CNCEngine(def);
      engine.setToolTable(toolsRef.current, toolUnitsRef.current);
      const workOffsets = options.offsets || msRef.current.offsets;
      engine.setWorkOffsets(workOffsets);
      const processingAlarms = [];
      const worker = backplotWorkerRef.current;
      try {
        engine.loadPrograms(s, { buildPath: !worker });
      } catch (err) {
        console.error("Engine processing error:", err);
        processingAlarms.push(`ERROR: Parse/trace failure: ${err.message}`);
      }
      const engineAlarms = formatEngineDiagnostics(engine.getDiagnostics());
      backplotAlarmsRef.current = engineAlarms;
      setAlarms([...processingAlarms, ...engineAlarms]);
      engineRef.current = engine;

      const pts = engine.getPathPoints();
      const stats = engine.getStats();
      const state = engine.getState(); // array, one per channel
      const nextActive = Math.min(
        activeChannelRef.current,
        Math.max(0, state.length - 1),
      );

      pathRef.current = pts;
      setPathPts(pts);
      setPStats(stats);
      if (worker) {
        const requestId = ++backplotRequestRef.current;
        worker.postMessage({
          requestId,
          machineId: defId,
          sources: s,
          toolTable: toolsRef.current,
          toolUnits: toolUnitsRef.current,
          offsets: workOffsets,
        });
      }
      setChannelStates(state);
      setChannelBlocks(engine.channels.map((ch) => ch.blocks || []));
      setBlocks(engine.channels[nextActive]?.blocks || []);
      setCurPt(0);
      setToolPathStep(0);
      setPointer(0);
      ptrRef.current = 0;
      setActiveChannel(nextActive);
      setMs(channelStateToMs(state[nextActive] || state[0] || initMS()));
      setOpMsgs([]);
      doneRef.current = false;
      playingRef.current = false;
      setIsPlaying(false);
      clearTimeout(playRef.current);
      cancelAnimationFrame(playRef.current);
      remRef.current = [];
      setMatRemoval([]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [machDefId, compileProjectSources],
  );

  // Trigger initial parse on mount
  useEffect(() => {
    reload(compileProjectSources(projectFiles));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload(compileProjectSources(projectFilesRef.current));
  }, [tools, toolUnits, reload, compileProjectSources]);

  useEffect(() => () => {
    clearTimeout(playRef.current);
    cancelAnimationFrame(playRef.current);
    clearTimeout(editorReloadRef.current);
  }, []);

  // ─── When preset changes, apply machine config + reset stock ───
  useEffect(() => {
    const def = MACHINE_DEFINITIONS[machDefId];
    if (!def) return;
    const m = engineDefToMachCfg(def);
    setMach(m);
    setCustomMach({ ...m });
    setActiveChannel(0);
    if (m.isLathe) {
      setStock({ shape: "cyl", diameter: 80, length: 150, x: 0, y: 0, z: 0 });
    } else {
      setStock({
        shape: "rect",
        width: 100,
        height: 80,
        depth: 40,
        x: 0,
        y: 0,
        z: 0,
      });
    }
    const initialState = initMS();
    setMs(initialState);
    msRef.current = initialState;
    setCoordinateSystems(createDefaultCoordinateSystems(initialState.offsets));
    setActiveCoordinateSystemId("wcs_G54");
    const lib = getProgLib(def);
    if (lib?.length) {
      const nextFiles = exampleToProject(lib[0], "main", null, def);
      loadProjectFiles(nextFiles);
      setTimeout(() => reload(buildProjectSources(nextFiles), { machDefId, offsets: initialState.offsets }), 0);
    }
  }, [machDefId, reload, loadProjectFiles]);

  // ─── Step ──────────────────────────────────────────────────────
  const step = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || engine.isDone()) {
      doneRef.current = true;
      setIsPlaying(false);
      return;
    }

    const result = engine.stepAll();
    setAlarms([...new Set([
      ...backplotAlarmsRef.current,
      ...formatEngineDiagnostics(engine.getDiagnostics()),
    ])]);
    const focused =
      result[Math.min(activeChannel, Math.max(0, result.length - 1))] ||
      result[0];
    setChannelStates(result);
    setChannelBlocks(engine.channels.map((ch) => ch.blocks || []));

    ptrRef.current = focused.pointer;
    setPointer(focused.pointer);
    setCurPt(focused.pointer);

    setMs(channelStateToMs(focused));

    if (
      mach.isLathe &&
      (focused.motionMode === "G01" ||
        focused.motionMode === "G02" ||
        focused.motionMode === "G03")
    ) {
      const xr = Math.abs(focused.pos.X) / 2;
      const z = focused.pos.Z;
      remRef.current = [...remRef.current, { z, xr }];
      setMatRemoval([...remRef.current]);
    }

    doneRef.current = engine.isDone();
    if (doneRef.current) setIsPlaying(false);
  }, [mach.isLathe, activeChannel]);

  // ─── Auto-run ──────────────────────────────────────────────────
  const autoRun = useCallback(() => {
    if (!playingRef.current || doneRef.current) {
      setIsPlaying(false);
      return;
    }
    const engine = engineRef.current;
    if (!engine || engine.isDone()) {
      setIsPlaying(false);
      doneRef.current = true;
      return;
    }
    if (speedMode === "max") {
      for (
        let i = 0;
        i < 30 && !doneRef.current;
        i++
      )
        step();
      if (!doneRef.current && playingRef.current)
        playRef.current = requestAnimationFrame(autoRun);
      else setIsPlaying(false);
    } else {
      step();
      if (doneRef.current || !playingRef.current) {
        setIsPlaying(false);
        return;
      }
      if (sbk) {
        setIsPlaying(false);
        return;
      }
      const f = msRef.current.feed || 200,
        fovr = feedOvr / 100;
      const mul = speedMode === "rt" ? 1 : custSpeed / 100;
      const delay = Math.max(
        1,
        Math.min(2000, 2 / (((f * fovr) / 60 / 1000) * mul)),
      );
      playRef.current = setTimeout(autoRun, delay);
    }
  }, [speedMode, feedOvr, custSpeed, sbk, step]);

  const toggleCycle = useCallback(() => {
    if (doneRef.current) {
      reload();
      return;
    }
    const n = !playingRef.current;
    playingRef.current = n;
    setIsPlaying(n);
    if (n) autoRun();
    else {
      clearTimeout(playRef.current);
      cancelAnimationFrame(playRef.current);
    }
  }, [autoRun, reload]);

  const resetProg = useCallback(() => {
    clearTimeout(playRef.current);
    cancelAnimationFrame(playRef.current);
    playingRef.current = false;
    setIsPlaying(false);
    reload();
  }, [reload]);

  const handleFixtureTransform = useCallback((id, { pos, rot, scl }) => {
    setFixtures((p) =>
      p.map((f) =>
        f.id === id ? { ...f, position: pos, rotation: rot, scale: scl } : f,
      ),
    );
  }, []);

  const updateCoordinateSystem = useCallback((id, patch) => {
    const current = coordinateSystems.find((frame) => frame.id === id);
    if (!current) return;
    const updatedFrame = makeCoordinateSystem({
      ...current,
      ...patch,
      origin: { ...current.origin, ...(patch.origin || {}) },
      rotation: { ...current.rotation, ...(patch.rotation || {}) },
    });
    setCoordinateSystems((prev) => prev.map((frame) => frame.id === id ? updatedFrame : frame));
    if (updatedFrame.id.startsWith("wcs_")) {
      const nextOffsets = applyCoordinateSystemToOffsets(msRef.current.offsets, updatedFrame);
      msRef.current = { ...msRef.current, offsets: nextOffsets };
      setMs(msRef.current);
      reload(undefined, { offsets: nextOffsets });
    }
  }, [coordinateSystems, reload]);

  const addCoordinateSystem = useCallback(() => {
    const nextIndex =
      coordinateSystems.filter((frame) => frame.type === "user").length + 1;
    const frame = makeCoordinateSystem({
      name: `CS${nextIndex}`,
      type: "user",
      parentId: "setup",
      origin: { X: stock.x || 0, Y: stock.y || 0, Z: stock.z || 0 },
    });
    setCoordinateSystems((prev) => [...prev, frame]);
    setActiveCoordinateSystemId(frame.id);
  }, [coordinateSystems, stock.x, stock.y, stock.z]);

  useEffect(() => {
    const next = channelStates[activeChannel];
    setBlocks(channelBlocks[activeChannel] || []);
    if (!next) return;
    ptrRef.current = next.pointer;
    setPointer(next.pointer);
    setCurPt(next.pointer);
    setMs(channelStateToMs(next));
  }, [activeChannel, channelStates, channelBlocks]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.resizeRight) return;
      const next = Math.max(320, Math.min(900, window.innerWidth - e.clientX));
      setRightPanelWidth(next);
    };
    const onUp = () => {
      if (dragRef.current.resizeRight) dragRef.current.resizeRight = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ─── VIEWPORT RENDERING ───────────────────────────────────────
  const draw = useCallback(() => {
    const cvs = cvsRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width,
      H = cvs.height;
    ctx.fillStyle = C.vpBg;
    ctx.fillRect(0, 0, W, H);

    const cam = camRef.current;
    const isLathe = mach.isLathe;

    if (isLathe) {
      // ─── LATHE 2D ZX VIEW ───────────────────────────────────
      const sc = (cam.zoom * Math.min(W, H)) / 300;
      // Camera: pan.x maps to Z offset, pan.y maps to X offset
      const originX = W / 2 + cam.px; // screen X for Z=0
      const originY = H * 0.5 + cam.py; // screen Y for X=0 (centreline)

      const toS = (z, xr) => ({
        // xr = radius (positive = above CL)
        sx: originX + z * sc,
        sy: originY - xr * sc,
      });

      // Grid
      if (layers.grid) {
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 0.5;
        const zMin = Math.floor(-originX / sc / 25) * 25;
        const zMax = Math.ceil((W - originX) / sc / 25) * 25;
        const xMin = Math.floor(-originY / sc / 25) * 25;
        const xMax = Math.ceil((H - originY) / sc / 25) * 25;
        for (let z = zMin; z <= zMax; z += 25) {
          const s = toS(z, 0);
          ctx.beginPath();
          ctx.moveTo(s.sx, -originY);
          ctx.lineTo(s.sx, H + originY);
          ctx.stroke();
        }
        for (let x = xMin; x <= xMax; x += 25) {
          const sy = originY - x * sc;
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(W, sy);
          ctx.stroke();
        }
        // Bold Z=0 line
        ctx.strokeStyle = C.axBd;
        ctx.lineWidth = 1;
        const z0 = toS(0, 0);
        ctx.beginPath();
        ctx.moveTo(z0.sx, -H);
        ctx.lineTo(z0.sx, 2 * H);
        ctx.stroke();
        // Centreline
        ctx.strokeStyle = C.axGrid;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(W, originY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Stock profile (cylindrical = rectangle above CL, mirrored below)
      if (layers.stock) {
        const R = (stock.diameter || 80) / 2;
        const L = stock.length || 150;
        const sz = stock.z || 0,
          sx2 = stock.x || 0;
        const tl = toS(sz, sx2 + R),
          tr = toS(sz + L, sx2 + R);
        const bl = toS(sz, sx2),
          br = toS(sz + L, sx2);
        // Top half (solid stock)
        ctx.fillStyle = C.stockS1;
        ctx.strokeStyle = C.stockBd;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bl.sx, bl.sy);
        ctx.lineTo(br.sx, br.sy);
        ctx.lineTo(tr.sx, tr.sy);
        ctx.lineTo(tl.sx, tl.sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Mirror (bottom half)
        const tlm = toS(sz, -(sx2 + R)),
          trm = toS(sz + L, -(sx2 + R));
        const blm = toS(sz, -sx2),
          brm = toS(sz + L, -sx2);
        ctx.fillStyle = C.stockS2;
        ctx.beginPath();
        ctx.moveTo(blm.sx, blm.sy);
        ctx.lineTo(brm.sx, brm.sy);
        ctx.lineTo(trm.sx, trm.sy);
        ctx.lineTo(tlm.sx, tlm.sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // End faces
        ctx.strokeStyle = C.stockTop;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tl.sx, tl.sy);
        ctx.lineTo(bl.sx, bl.sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tr.sx, tr.sy);
        ctx.lineTo(br.sx, br.sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tlm.sx, tlm.sy);
        ctx.lineTo(blm.sx, blm.sy);
        ctx.stroke();
        // Stock label
        ctx.fillStyle = C.blue;
        ctx.font = "bold 9px system-ui";
        ctx.fillText(
          `Ø${stock.diameter || 80} × ${stock.length || 150}mm`,
          tl.sx + 4,
          tl.sy - 4,
        );
      }

      // Material removal overlay
      if (layers.removal && matRemoval.length > 0) {
        // Build removal profile: for each Z position, track minimum radius machined
        const profile = new Map();
        matRemoval.forEach(({ z, xr }) => {
          const zk = Math.round(z * 10) / 10;
          if (!profile.has(zk) || xr < profile.get(zk)) profile.set(zk, xr);
        });
        if (profile.size > 0) {
          const zs = [...profile.keys()].sort((a, b) => a - b);
          // Shade removed material
          ctx.fillStyle = C.cutOverlay;
          ctx.strokeStyle = C.cutBorder;
          ctx.lineWidth = 1;
          // Draw removed area (between machined radius and original surface)
          const R = (stock.diameter || 80) / 2;
          ctx.beginPath();
          zs.forEach((z, i) => {
            const xr = profile.get(z);
            const p = toS(z, xr);
            if (i === 0) ctx.moveTo(p.sx, p.sy);
            else ctx.lineTo(p.sx, p.sy);
          });
          // Close along original surface
          const lastZ = zs[zs.length - 1],
            firstZ = zs[0];
          const se = toS(lastZ, R),
            sf = toS(firstZ, R);
          ctx.lineTo(se.sx, se.sy);
          ctx.lineTo(sf.sx, sf.sy);
          ctx.closePath();
          ctx.fill();
          // Draw machined profile line
          ctx.strokeStyle = C.rapid;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          zs.forEach((z, i) => {
            const p = toS(z, profile.get(z));
            i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy);
          });
          ctx.stroke();
          // Mirror
          ctx.strokeStyle = "rgba(255,110,46,0.3)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          zs.forEach((z, i) => {
            const p = toS(z, -profile.get(z));
            i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy);
          });
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Axes arrows
      const O = toS(0, 0);
      [
        ["Z", 60, 0, C.red],
        ["X", 0, 40, C.green],
      ].forEach(([l, dz, dx, col]) => {
        const P = toS(dz, dx);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(O.sx, O.sy);
        ctx.lineTo(P.sx, P.sy);
        ctx.stroke();
        const ang = Math.atan2(P.sy - O.sy, P.sx - O.sx);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(P.sx, P.sy);
        ctx.lineTo(
          P.sx - 8 * Math.cos(ang - 0.4),
          P.sy - 8 * Math.sin(ang - 0.4),
        );
        ctx.lineTo(
          P.sx - 8 * Math.cos(ang + 0.4),
          P.sy - 8 * Math.sin(ang + 0.4),
        );
        ctx.closePath();
        ctx.fill();
        ctx.font = "bold 10px system-ui";
        ctx.fillText(l, P.sx + 4, P.sy - 3);
      });
      // Origin cross
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(O.sx, O.sy, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Toolpath
      if (pathRef.current.length > 1) {
        let prev = pathRef.current[0];
        for (let i = 1; i < pathRef.current.length; i++) {
          const p = pathRef.current[i];
          if (p.channelId !== prev.channelId) {
            prev = p;
            continue;
          }
          const xrA = Math.abs(prev.y) / 2,
            xrB = Math.abs(p.y || 0) / 2; // lathe X is diameter → radius
          const pa = toS(prev.z, xrA),
            pb = toS(p.z || 0, xrB);
          const channelColor =
            CHANNEL_COLORS[p.channelId % CHANNEL_COLORS.length] || C.blue;
          ctx.strokeStyle =
            p.m === "G00"
              ? C.rapid + "55"
              : p.m === "G02" || p.m === "G03"
                ? C.arc + "80"
                : `${channelColor}99`;
          ctx.lineWidth = p.m === "G00" ? 0.8 : 1.5;
          ctx.setLineDash(p.m === "G00" ? [4, 3] : []);
          ctx.beginPath();
          ctx.moveTo(pa.sx, pa.sy);
          ctx.lineTo(pb.sx, pb.sy);
          ctx.stroke();
          // Mirror
          const pam = toS(prev.z, -xrA),
            pbm = toS(p.z || 0, -xrB);
          ctx.strokeStyle =
            p.m === "G00" ? C.rapid + "25" : `${channelColor}55`;
          ctx.beginPath();
          ctx.moveTo(pam.sx, pam.sy);
          ctx.lineTo(pbm.sx, pbm.sy);
          ctx.stroke();
          prev = p;
        }
        ctx.setLineDash([]);
        // Executed
        if (curPt > 0) {
          const hi =
            CHANNEL_COLORS[activeChannel % CHANNEL_COLORS.length] || C.blue2;
          ctx.strokeStyle = hi;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = hi;
          ctx.shadowBlur = 3;
          ctx.beginPath();
          const drawnPath = pathRef.current.filter(
            (p) => p.channelId === activeChannel && p.bi < curPt,
          );
          drawnPath.forEach((p, i) => {
            const xr = Math.abs(p.y || 0) / 2;
            const { sx, sy } = toS(p.z || 0, xr);
            i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
          });
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Geometry
      geoms.forEach((g, gi) => {
        const sel = gi === selGeom;
        ctx.strokeStyle = sel ? C.blue : "#4a9eff90";
        ctx.lineWidth = sel ? 2 : 1.2;
        ctx.fillStyle = sel ? "#58a6ff15" : "transparent";
        if (g.type === "line" && g.pts?.length >= 2) {
          const a = toS(g.pts[0].x, g.pts[0].y),
            b = toS(g.pts[1].x, g.pts[1].y);
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        } else if (g.type === "arc") {
          const c = toS(g.cx, g.cy);
          const sp = toS(
            g.cx + g.r * Math.cos(g.a0),
            g.cy + g.r * Math.sin(g.a0),
          );
          const r2d = Math.sqrt((sp.sx - c.sx) ** 2 + (sp.sy - c.sy) ** 2);
          ctx.beginPath();
          ctx.arc(c.sx, c.sy, r2d, g.a0, g.a1, g.ccw);
          ctx.stroke();
        } else if (g.type === "circle") {
          const c = toS(g.cx, g.cy),
            ep = toS(g.cx + g.r, g.cy);
          const r2d = Math.sqrt((ep.sx - c.sx) ** 2 + (ep.sy - c.sy) ** 2);
          ctx.beginPath();
          ctx.arc(c.sx, c.sy, r2d, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fill();
        }
      });

      // Tool
      if (layers.tool) {
        const t = tools[msRef.current.activeT];
        if (t) {
          const tp = toS(
            msRef.current.pos.Z,
            Math.abs(msRef.current.pos.X) / 2,
          );
          ctx.strokeStyle = C.amber;
          ctx.fillStyle = C.amber + "30";
          ctx.lineWidth = 2;
          if (t.type === "OD Turning" || t.type === "OD Profiling") {
            const isz = 8 * cam.zoom;
            ctx.beginPath();
            ctx.moveTo(tp.sx, tp.sy);
            ctx.lineTo(tp.sx + isz, tp.sy - isz);
            ctx.lineTo(tp.sx + isz * 2, tp.sy - isz);
            ctx.lineTo(tp.sx + isz * 2, tp.sy + isz * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = C.amber + "60";
            ctx.lineWidth = 1;
            ctx.strokeRect(
              tp.sx + isz * 2,
              tp.sy - isz,
              (t.hlen || 80) * sc,
              isz * 1.5,
            );
          } else if (t.type === "Grooving" || t.type === "Parting") {
            const w = Math.max(3, t.dia || 3) * sc * 0.5;
            ctx.fillRect(tp.sx - w / 2, tp.sy - 12, w, 12);
            ctx.strokeRect(tp.sx - w / 2, tp.sy - 12, w, 12);
            ctx.strokeStyle = C.amber + "60";
            ctx.strokeRect(tp.sx - 8, tp.sy - 40, 16, 28);
          } else if (t.type === "Facing") {
            ctx.beginPath();
            ctx.moveTo(tp.sx, tp.sy);
            ctx.lineTo(tp.sx + 12, tp.sy - 8);
            ctx.lineTo(tp.sx + 12, tp.sy - 20);
            ctx.lineTo(tp.sx, tp.sy - 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (t.type === "ID Boring") {
            ctx.beginPath();
            ctx.moveTo(tp.sx, tp.sy);
            ctx.lineTo(tp.sx - 10, tp.sy - 8);
            ctx.lineTo(tp.sx - 10, tp.sy - 20);
            ctx.lineTo(tp.sx, tp.sy - 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else if (t.type?.startsWith("Live")) {
            const r = Math.max(3, (t.dia / 2) * sc * 0.5);
            ctx.beginPath();
            ctx.arc(tp.sx, tp.sy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fill();
            ctx.fillStyle = C.amber;
            ctx.font = "7px system-ui";
            ctx.fillText("LT", tp.sx - 5, tp.sy + 3);
          } else {
            ctx.beginPath();
            ctx.arc(tp.sx, tp.sy, 6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // Current position crosshair
      if (drawTool !== "select" && snapIndicator) {
        const sp = toS(snapIndicator.wx, snapIndicator.wy);
        ctx.strokeStyle = C.blue;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(sp.sx - 12, sp.sy);
        ctx.lineTo(sp.sx + 12, sp.sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sp.sx, sp.sy - 12);
        ctx.lineTo(sp.sx, sp.sy + 12);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C.blue;
        ctx.font = "9px monospace";
        ctx.fillText(
          `Z${snapIndicator.wx.toFixed(2)} X${(snapIndicator.wy * 2).toFixed(2)}`,
          sp.sx + 10,
          sp.sy - 5,
        );
      }

      // In-progress draw
      if (drawActive && drawPts.length > 0) {
        ctx.strokeStyle = C.blue;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        drawPts.forEach((p, i) => {
          const s = toS(p.x, p.y);
          i === 0 ? ctx.moveTo(s.sx, s.sy) : ctx.lineTo(s.sx, s.sy);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        drawPts.forEach((p) => {
          const s = toS(p.x, p.y);
          ctx.strokeStyle = C.blue;
          ctx.fillStyle = C.blue + "40";
          ctx.beginPath();
          ctx.arc(s.sx, s.sy, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
    } else {
      // ─── MILL 3D ISO VIEW ────────────────────────────────────
      const proj = (x, y, z) => {
        const { az, el, zoom: zk, px, py } = cam;
        const rx = x * Math.cos(az) - y * Math.sin(az);
        const ry = x * Math.sin(az) + y * Math.cos(az);
        const rz = ry * Math.sin(el) + z * Math.cos(el);
        const sc2 = (zk * Math.min(W, H)) / 280;
        return { sx: W / 2 + (rx + px) * sc2, sy: H / 2 - (rz + py) * sc2 };
      };

      // Grid
      if (layers.grid) {
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 0.5;
        for (let i = -300; i <= 300; i += 25) {
          const a = proj(i, -300, 0),
            b = proj(i, 300, 0);
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
          const c = proj(-300, i, 0),
            d = proj(300, i, 0);
          ctx.beginPath();
          ctx.moveTo(c.sx, c.sy);
          ctx.lineTo(d.sx, d.sy);
          ctx.stroke();
        }
      }

      // Stock
      if (layers.stock) {
        const sw = stock.width || 100,
          sh = stock.height || 80,
          sd = stock.depth || 40;
        const ox = stock.x || 0,
          oy = stock.y || 0,
          oz = stock.z || 0;
        const co = [
          [ox, oy, oz],
          [ox + sw, oy, oz],
          [ox + sw, oy + sh, oz],
          [ox, oy + sh, oz],
          [ox, oy, oz + sd],
          [ox + sw, oy, oz + sd],
          [ox + sw, oy + sh, oz + sd],
          [ox, oy + sh, oz + sd],
        ];
        const faces = [
          [0, 1, 5, 4, C.stockTop],
          [1, 2, 6, 5, C.stockS1],
          [3, 2, 6, 7, C.stockS1],
          [4, 5, 6, 7, C.stockS2],
          [0, 1, 2, 3, C.stockFront],
        ];
        faces.forEach(([a, b, c, d, f]) => {
          const ps = [a, b, c, d].map((i) => proj(...co[i]));
          ctx.fillStyle = f;
          ctx.strokeStyle = C.stockBd;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(ps[0].sx, ps[0].sy);
          ps.slice(1).forEach((p) => ctx.lineTo(p.sx, p.sy));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
        fixtures.forEach((fx) => {
          // Support both new position array and legacy x/y/z fields
          const [fx_x, fx_y, fx_z] = fx.position ?? [
            fx.x ?? 0,
            fx.y ?? 0,
            fx.z ?? 0,
          ];
          const fc = [
            [fx_x, fx_y, fx_z],
            [fx_x + fx.w, fx_y, fx_z],
            [fx_x + fx.w, fx_y + fx.h, fx_z],
            [fx_x, fx_y + fx.h, fx_z],
            [fx_x, fx_y, fx_z + fx.d],
            [fx_x + fx.w, fx_y, fx_z + fx.d],
            [fx_x + fx.w, fx_y + fx.h, fx_z + fx.d],
            [fx_x, fx_y + fx.h, fx_z + fx.d],
          ];
          [
            [0, 1, 5, 4, C.fixTop],
            [4, 5, 6, 7, C.fixSide],
          ].forEach(([a, b, c, d, f]) => {
            const ps = [a, b, c, d].map((i) => proj(...fc[i]));
            ctx.fillStyle = f;
            ctx.strokeStyle = C.fixBd;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(ps[0].sx, ps[0].sy);
            ps.slice(1).forEach((p) => ctx.lineTo(p.sx, p.sy));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          });
        });
      }

      // Axes
      const O = proj(0, 0, 0);
      [
        ["X", 70, 0, 0, C.red],
        ["Y", 0, 70, 0, C.green],
        ["Z", 0, 0, 70, C.blue],
      ].forEach(([l, x, y, z, col]) => {
        const P = proj(x, y, z);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(O.sx, O.sy);
        ctx.lineTo(P.sx, P.sy);
        ctx.stroke();
        const ang = Math.atan2(P.sy - O.sy, P.sx - O.sx);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(P.sx, P.sy);
        ctx.lineTo(
          P.sx - 8 * Math.cos(ang - 0.4),
          P.sy - 8 * Math.sin(ang - 0.4),
        );
        ctx.lineTo(
          P.sx - 8 * Math.cos(ang + 0.4),
          P.sy - 8 * Math.sin(ang + 0.4),
        );
        ctx.closePath();
        ctx.fill();
        ctx.font = "bold 10px system-ui";
        ctx.fillText(l, P.sx + 4, P.sy - 3);
      });
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(O.sx, O.sy, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Toolpath
      if (pathRef.current.length > 1) {
        const pts = pathRef.current;
        let prev = pts[0];

        // ── Pass 1: draw all path lines ────────────────────────────────────
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i];
          if (p.channelId !== prev.channelId) {
            prev = p;
            continue;
          }
          const pa = proj(prev.x, prev.y, prev.z),
            pb = proj(p.x, p.y, p.z);
          const channelColor =
            CHANNEL_COLORS[p.channelId % CHANNEL_COLORS.length] || C.feed;

          // Classify: retract = G00 where Z increases and XY doesn't change
          const isRetract =
            p.m === "G00" &&
            p.z > prev.z &&
            Math.abs(p.x - prev.x) < 0.001 &&
            Math.abs(p.y - prev.y) < 0.001;
          // XY rapid (positioning move), no Z component
          const isXYRapid = p.m === "G00" && !isRetract;

          if (isRetract) {
            ctx.strokeStyle = C.amber + "99";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
          } else if (isXYRapid) {
            ctx.strokeStyle = C.rapid + "50";
            ctx.lineWidth = 0.8;
            ctx.setLineDash([4, 3]);
          } else if (p.m === "G02" || p.m === "G03") {
            ctx.strokeStyle = C.arc + "90";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);
          } else {
            // G01 feed
            ctx.strokeStyle = `${channelColor}cc`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);
          }
          ctx.beginPath();
          ctx.moveTo(pa.sx, pa.sy);
          ctx.lineTo(pb.sx, pb.sy);
          ctx.stroke();
          prev = p;
        }
        ctx.setLineDash([]);

        // ── Pass 2: endpoint dots at drill / plunge positions ──────────────
        prev = pts[0];
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i];
          // Drill endpoint: G01 moving downward in Z (plunge)
          if (p.m === "G01" && p.z < prev.z - 0.01) {
            const { sx, sy } = proj(p.x, p.y, p.z);
            ctx.fillStyle = C.feed;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          // Retract start: G00 moving up from a plunge point
          if (
            p.m === "G00" &&
            p.z > prev.z + 0.01 &&
            Math.abs(p.x - prev.x) < 0.001 &&
            Math.abs(p.y - prev.y) < 0.001
          ) {
            const { sx, sy } = proj(prev.x, prev.y, prev.z);
            ctx.strokeStyle = C.amber;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.stroke();
          }
          prev = p;
        }

        // ── Pass 3: step-through highlight ────────────────────────────────
        if (curPt > 0) {
          const hi =
            CHANNEL_COLORS[activeChannel % CHANNEL_COLORS.length] || C.blue2;
          ctx.strokeStyle = hi;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = hi;
          ctx.shadowBlur = 3;
          ctx.beginPath();
          const drawnPath = pathRef.current.filter(
            (p) => p.channelId === activeChannel && p.bi < curPt,
          );
          drawnPath.forEach((p, i) => {
            const { sx, sy } = proj(p.x, p.y, p.z);
            i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
          });
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Geometry in XY plane
      geoms.forEach((g, gi) => {
        const sel = gi === selGeom;
        ctx.strokeStyle = sel ? C.blue : "#4a9eff90";
        ctx.lineWidth = sel ? 2 : 1.2;
        ctx.fillStyle = sel ? "#58a6ff15" : "transparent";
        if (g.type === "line" && g.pts?.length >= 2) {
          const a = proj(g.pts[0].x, g.pts[0].y, 0),
            b = proj(g.pts[1].x, g.pts[1].y, 0);
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
          g.pts.slice(2).forEach((pt, i) => {
            const np = proj(pt.x, pt.y, 0);
            ctx.lineTo(np.sx, np.sy);
          });
          ctx.stroke();
        } else if (g.type === "rect") {
          const ps = [
            proj(g.x, g.y, 0),
            proj(g.x + g.w, g.y, 0),
            proj(g.x + g.w, g.y + g.h, 0),
            proj(g.x, g.y + g.h, 0),
          ];
          ctx.beginPath();
          ctx.moveTo(ps[0].sx, ps[0].sy);
          ps.slice(1).forEach((p) => ctx.lineTo(p.sx, p.sy));
          ctx.closePath();
          ctx.stroke();
          ctx.fill();
        } else if (g.type === "circle") {
          const c = proj(g.cx, g.cy, 0),
            e = proj(g.cx + g.r, g.cy, 0);
          const r2 = Math.sqrt((e.sx - c.sx) ** 2 + (e.sy - c.sy) ** 2);
          ctx.beginPath();
          ctx.arc(c.sx, c.sy, r2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fill();
        } else if (g.type === "arc") {
          const c = proj(g.cx, g.cy, 0),
            sp = proj(
              g.cx + g.r * Math.cos(g.a0),
              g.cy + g.r * Math.sin(g.a0),
              0,
            );
          const r2 = Math.sqrt((sp.sx - c.sx) ** 2 + (sp.sy - c.sy) ** 2);
          ctx.beginPath();
          ctx.arc(c.sx, c.sy, r2, g.a0, g.a1, g.ccw);
          ctx.stroke();
        }
      });

      // Mill tool
      if (layers.tool) {
        const t = tools[msRef.current.activeT];
        if (t && t.cls !== "lathe") {
          const tp = proj(
            msRef.current.pos.X,
            msRef.current.pos.Y,
            msRef.current.pos.Z,
          );
          const sc2 = (cam.zoom * Math.min(W, H)) / 280;
          const r = Math.max(2, (t.dia / 2) * sc2);
          ctx.strokeStyle = C.amber;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(tp.sx, tp.sy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = C.amber + "15";
          ctx.fill();
          const sr = Math.max(1, (t.shank / 2) * sc2);
          const ft = proj(
            msRef.current.pos.X,
            msRef.current.pos.Y,
            msRef.current.pos.Z + (t.lc || 22),
          );
          ctx.strokeStyle = C.amber + "60";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tp.sx - r, tp.sy);
          ctx.lineTo(ft.sx - sr, ft.sy);
          ctx.moveTo(tp.sx + r, tp.sy);
          ctx.lineTo(ft.sx + sr, ft.sy);
          ctx.stroke();
          if (t.type?.startsWith("Live")) {
            ctx.fillStyle = C.teal;
            ctx.font = "7px system-ui";
            ctx.fillText("LT", tp.sx - 5, tp.sy + 3);
          }
        }
      }

      // Draw geometry in progress
      if (drawActive && drawPts.length > 0) {
        ctx.strokeStyle = C.blue;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        drawPts.forEach((p, i) => {
          const s = proj(p.x, p.y, 0);
          i === 0 ? ctx.moveTo(s.sx, s.sy) : ctx.lineTo(s.sx, s.sy);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        drawPts.forEach((p) => {
          const s = proj(p.x, p.y, 0);
          ctx.strokeStyle = C.blue;
          ctx.fillStyle = C.blue + "40";
          ctx.beginPath();
          ctx.arc(s.sx, s.sy, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
      // Snap crosshair
      if (drawTool !== "select" && snapIndicator) {
        const sp = proj(snapIndicator.wx, snapIndicator.wy, 0);
        ctx.strokeStyle = C.blue;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(sp.sx - 14, sp.sy);
        ctx.lineTo(sp.sx + 14, sp.sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sp.sx, sp.sy - 14);
        ctx.lineTo(sp.sx, sp.sy + 14);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C.blue;
        ctx.font = "9px monospace";
        ctx.fillText(
          `X${snapIndicator.wx.toFixed(2)} Y${snapIndicator.wy.toFixed(2)}`,
          sp.sx + 10,
          sp.sy - 5,
        );
      }
    }
  }, [
    mach,
    layers,
    stock,
    fixtures,
    geoms,
    drawPts,
    drawActive,
    drawTool,
    selGeom,
    snapIndicator,
    matRemoval,
    curPt,
    tools,
  ]);

  // ─── Resize observer ───────────────────────────────────────────
  useEffect(() => {
    if (vpView === "iso") return;
    const cvs = cvsRef.current,
      vp = vpRef.current;
    if (!cvs || !vp) return;
    const ro = new ResizeObserver(() => {
      cvs.width = vp.clientWidth;
      cvs.height = vp.clientHeight;
      draw();
    });
    ro.observe(vp);
    cvs.width = vp.clientWidth;
    cvs.height = vp.clientHeight;
    draw();
    return () => ro.disconnect();
  }, [draw, vpView]);

  useEffect(() => {
    if (vpView === "iso") return;
    draw();
  }, [
    draw,
    ms,
    curPt,
    geoms,
    drawPts,
    drawActive,
    layers,
    stock,
    matRemoval,
    vpView,
  ]);

  // ─── Screen → World coord conversion ──────────────────────────
  const s2w = useCallback(
    (sx, sy) => {
      const cvs = cvsRef.current;
      if (!cvs) return { x: 0, y: 0 };
      const cam = camRef.current,
        W = cvs.width,
        H = cvs.height;
      if (mach.isLathe) {
        const sc = (cam.zoom * Math.min(W, H)) / 300;
        const z = (sx - (W / 2 + cam.px)) / sc;
        const xr = -(sy - (H * 0.5 + cam.py)) / sc;
        return { x: z, y: xr }; // x=Z coord, y=X radius
      } else {
        const sc2 = (cam.zoom * Math.min(W, H)) / 280;
        const az = cam.az,
          el = cam.el;
        const rx = (sx - W / 2) / sc2 - cam.px;
        const ry = -(sy - H / 2) / sc2 - cam.py;
        const wx = rx * Math.cos(az) + ry * Math.sin(az);
        const wy = -rx * Math.sin(az) + ry * Math.cos(az);
        return { x: wx, y: wy };
      }
    },
    [mach.isLathe],
  );

  // ─── Snap logic ────────────────────────────────────────────────
  const snapWorld = useCallback(
    (wx, wy) => {
      let sx = wx,
        sy = wy;
      if (snapMode.grid) {
        const gs = 10; // 10mm grid snap
        sx = Math.round(sx / gs) * gs;
        sy = Math.round(sy / gs) * gs;
      }
      if (snapMode.points) {
        // Snap to existing geometry points
        let bestD = 15,
          bestX = sx,
          bestY = sy; // 15px threshold
        const cvs = cvsRef.current;
        if (!cvs) return { x: sx, y: sy };
        const cam = camRef.current,
          W = cvs.width,
          H = cvs.height;
        const sc = mach.isLathe
          ? (cam.zoom * Math.min(W, H)) / 300
          : (cam.zoom * Math.min(W, H)) / 280;
        const threshWorld = 15 / sc;
        geoms.forEach((g) => {
          const check = (gx, gy) => {
            const d = Math.sqrt((wx - gx) ** 2 + (wy - gy) ** 2);
            if (d < bestD) {
              bestD = d;
              bestX = gx;
              bestY = gy;
            }
          };
          if (g.pts) g.pts.forEach((p) => check(p.x, p.y));
          if (g.cx != null) {
            check(g.cx, g.cy);
            check(g.cx + g.r, g.cy);
            check(g.cx - g.r, g.cy);
          }
          if (g.x != null) {
            check(g.x, g.y);
            check(g.x + g.w, g.y);
            check(g.x, g.y + g.h);
            check(g.x + g.w, g.y + g.h);
          }
        });
        // Also snap to draw points
        drawPts.forEach((p) => {
          const d = Math.sqrt((wx - p.x) ** 2 + (wy - p.y) ** 2);
          if (d < 15 / sc) {
            bestX = p.x;
            bestY = p.y;
          }
        });
        if (bestX !== sx || bestY !== sy) {
          sx = bestX;
          sy = bestY;
        }
      }
      return { x: sx, y: sy };
    },
    [snapMode, geoms, drawPts, mach.isLathe],
  );

  // ─── Canvas events ─────────────────────────────────────────────
  const onMouseMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (d.on) {
        const dx = e.clientX - d.lx,
          dy = e.clientY - d.ly;
        if (d.btn === 1) {
          if (mach.isLathe) {
            camRef.current.px += dx;
            camRef.current.py += dy;
          } else {
            camRef.current.az -= dx * 0.007;
            camRef.current.el = Math.max(
              -1.5,
              Math.min(1.5, camRef.current.el + dy * 0.007),
            );
          }
        } else if (d.btn === 2 || d.btn === 4) {
          const W = cvsRef.current?.width || 800,
            H = cvsRef.current?.height || 600;
          const sc = mach.isLathe
            ? (camRef.current.zoom * Math.min(W, H)) / 300
            : (camRef.current.zoom * Math.min(W, H)) / 280;
          camRef.current.px += dx / sc;
          camRef.current.py -= dy / sc;
        }
        dragRef.current.lx = e.clientX;
        dragRef.current.ly = e.clientY;
        draw();
      }
      if (drawTool !== "select") {
        const rect = cvsRef.current?.getBoundingClientRect();
        if (!rect) return;
        const raw = s2w(e.clientX - rect.left, e.clientY - rect.top);
        const snapped = snapWorld(raw.x, raw.y);
        setSnapIndicator({
          wx: snapped.x,
          wy: snapped.y,
          sx: e.clientX - rect.left,
          sy: e.clientY - rect.top,
        });
      }
    },
    [mach.isLathe, drawTool, s2w, snapWorld, draw],
  );

  const onMouseDown = useCallback(
    (e) => {
      if (drawTool === "select") {
        dragRef.current = {
          on: true,
          btn: e.buttons,
          lx: e.clientX,
          ly: e.clientY,
        };
        return;
      }
      e.preventDefault();
      const rect = cvsRef.current?.getBoundingClientRect();
      if (!rect) return;
      const raw = s2w(e.clientX - rect.left, e.clientY - rect.top);
      const pt = snapWorld(raw.x, raw.y);

      if (drawTool === "line") {
        if (!drawActive) {
          setDrawPts([pt]);
          setDrawActive(true);
        } else {
          setGeoms((g) => [...g, { type: "line", pts: [drawPts[0], pt] }]);
          setDrawPts([]);
          setDrawActive(false);
        }
      } else if (drawTool === "rect") {
        if (!drawActive) {
          setDrawPts([pt]);
          setDrawActive(true);
        } else {
          const p0 = drawPts[0];
          setGeoms((g) => [
            ...g,
            {
              type: "rect",
              x: Math.min(p0.x, pt.x),
              y: Math.min(p0.y, pt.y),
              w: Math.abs(pt.x - p0.x),
              h: Math.abs(pt.y - p0.y),
            },
          ]);
          setDrawPts([]);
          setDrawActive(false);
        }
      } else if (drawTool === "circle") {
        if (!drawActive) {
          setDrawPts([pt]);
          setDrawActive(true);
        } else {
          const p0 = drawPts[0],
            r = Math.sqrt((pt.x - p0.x) ** 2 + (pt.y - p0.y) ** 2);
          setGeoms((g) => [...g, { type: "circle", cx: p0.x, cy: p0.y, r }]);
          setDrawPts([]);
          setDrawActive(false);
        }
      } else if (drawTool === "arc") {
        // 3-point arc: center→start angle, center→end angle via 3 screen clicks
        const np = [...drawPts, pt];
        if (np.length === 1) {
          setDrawPts(np);
          setDrawActive(true);
        } else if (np.length === 2) {
          setDrawPts(np);
        } else if (np.length === 3) {
          // 3 points → find circumcircle
          const [p1, p2, p3] = np;
          const ax2 = p1.x,
            ay2 = p1.y,
            bx = p2.x,
            by = p2.y,
            cx2 = p3.x,
            cy2 = p3.y;
          const D =
            2 * (ax2 * (by - cy2) + bx * (cy2 - ay2) + cx2 * (ay2 - by));
          if (Math.abs(D) < 0.001) {
            setDrawPts([]);
            setDrawActive(false);
            return;
          }
          const ux =
            ((ax2 ** 2 + ay2 ** 2) * (by - cy2) +
              (bx ** 2 + by ** 2) * (cy2 - ay2) +
              (cx2 ** 2 + cy2 ** 2) * (ay2 - by)) /
            D;
          const uy =
            ((ax2 ** 2 + ay2 ** 2) * (cx2 - bx) +
              (bx ** 2 + by ** 2) * (ax2 - cx2) +
              (cx2 ** 2 + cy2 ** 2) * (bx - ax2)) /
            D;
          const r = Math.sqrt((ax2 - ux) ** 2 + (ay2 - uy) ** 2);
          const a0 = Math.atan2(ay2 - uy, ax2 - ux);
          const a1 = Math.atan2(cy2 - uy, cx2 - ux);
          // Determine CW or CCW from middle point
          const amid = Math.atan2(by - uy, bx - ux);
          let ccw = false;
          let da = amid - a0;
          if (da < 0) da += Math.PI * 2;
          let da1 = a1 - a0;
          if (da1 < 0) da1 += Math.PI * 2;
          ccw = da < da1;
          setGeoms((g) => [
            ...g,
            { type: "arc", cx: ux, cy: uy, r, a0, a1, ccw },
          ]);
          setDrawPts([]);
          setDrawActive(false);
        } else {
          setDrawPts(np);
        }
      } else if (drawTool === "contour") {
        const np = [...drawPts, pt];
        setDrawPts(np);
        setDrawActive(true);
      }
    },
    [drawTool, drawActive, drawPts, s2w, snapWorld],
  );

  const onMouseUp = useCallback(() => {
    dragRef.current.on = false;
  }, []);
  const onWheel = useCallback(
    (e) => {
      e.preventDefault();
      camRef.current.zoom = Math.max(
        0.05,
        Math.min(20, camRef.current.zoom * (e.deltaY > 0 ? 0.88 : 1.14)),
      );
      draw();
    },
    [draw],
  );

  const onContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      if (drawTool === "contour" && drawActive && drawPts.length > 1) {
        setGeoms((g) => [
          ...g,
          { type: "line", pts: [...drawPts], closed: true },
        ]);
      }
      setDrawPts([]);
      setDrawActive(false);
    },
    [drawTool, drawActive, drawPts],
  );

  const setVPView = useCallback(
    (v) => {
      setVpView(v);
      camRef.current.px = 0;
      camRef.current.py = 0;
      camRef.current.zoom = 1;
      if (v === "top") {
        camRef.current.az = 0;
        camRef.current.el = Math.PI / 2 - 0.01;
      } else if (v === "front") {
        camRef.current.az = 0;
        camRef.current.el = 0;
      } else if (v === "side") {
        camRef.current.az = Math.PI / 2;
        camRef.current.el = 0;
      } else if (v === "lathe") {
        camRef.current.az = 0;
        camRef.current.el = 0;
      } else {
        camRef.current.az = -0.65;
        camRef.current.el = 0.48;
      }
      draw();
    },
    [draw],
  );

  // ─── Tool profile canvas ───────────────────────────────────────
  const toolCvsRef = useRef(null);
  useEffect(() => {
    const cvs = toolCvsRef.current;
    if (!cvs) return;
    cvs.width = cvs.parentElement?.clientWidth || 240;
    cvs.height = 110;
    const ctx = cvs.getContext("2d");
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    const t = editTool,
      W = cvs.width,
      H = cvs.height;
    const isLatheTool =
      [
        "OD Turning",
        "ID Boring",
        "Facing",
        "Grooving",
        "Parting",
        "Threading",
        "OD Profiling",
        "Knurling",
      ].includes(t.type) || t.cls === "lathe";
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = C.amber + "20";
    const cx = W / 2,
      bot = H - 10;
    if (isLatheTool) {
      if (t.type === "OD Turning" || t.type === "OD Profiling") {
        const s = 22;
        ctx.beginPath();
        ctx.moveTo(cx, bot);
        ctx.lineTo(cx + s, bot - s);
        ctx.lineTo(cx, bot - s * 1.8);
        ctx.lineTo(cx - s, bot - s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = C.amber + "50";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, bot - s * 1.8, 50, 28);
        ctx.fillStyle = C.amber;
        ctx.font = "8px system-ui";
        ctx.fillText(`CNMG ${t.iAngle || 80}° CR${t.cr}`, 4, 12);
      } else if (t.type === "Grooving" || t.type === "Parting") {
        const w = Math.max(12, (t.dia || 3) * 2.5);
        ctx.fillRect(cx - w / 2, bot - 16, w, 16);
        ctx.strokeRect(cx - w / 2, bot - 16, w, 16);
        ctx.strokeStyle = C.amber + "50";
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 10, bot - 44, 20, 30);
        ctx.fillStyle = C.amber;
        ctx.font = "8px system-ui";
        ctx.fillText(`Width ${t.dia || 3}mm`, 4, 12);
      } else if (t.type === "Threading") {
        ctx.beginPath();
        ctx.moveTo(cx - 10, bot);
        ctx.lineTo(cx, bot - 18);
        ctx.lineTo(cx + 10, bot);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (t.type === "Facing") {
        ctx.beginPath();
        ctx.moveTo(cx - 5, bot);
        ctx.lineTo(cx + 18, bot - 10);
        ctx.lineTo(cx + 18, bot - 26);
        ctx.lineTo(cx - 5, bot - 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (t.type === "ID Boring") {
        ctx.beginPath();
        ctx.moveTo(cx + 5, bot);
        ctx.lineTo(cx - 18, bot - 10);
        ctx.lineTo(cx - 18, bot - 26);
        ctx.lineTo(cx + 5, bot - 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(cx, bot - 20, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (t.type?.startsWith("Live")) {
        ctx.strokeStyle = C.teal;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, bot - 20, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = C.teal;
        ctx.font = "bold 8px system-ui";
        ctx.fillText("LIVE", cx - 10, bot - 16);
      }
    } else {
      // Mill profile
      const totalLen = (t.lt || 75) + (t.hlen || 50);
      const isReliefNeck = String(t.type || "").includes("Relief Neck");
      const neckLen = isReliefNeck
        ? Math.max(
            0,
            Math.min(t.neckLen || 0, Math.max(0, (t.lt || 75) - (t.lc || 22))),
          )
        : 0;
      const neckR = isReliefNeck
        ? Math.max(0.2, (t.neckDia || t.dia * 0.7 || 1) / 2)
        : null;
      const sc = Math.min(
        (H - 16) / totalLen,
        (W / 2 - 8) / ((t.hdia || 32) / 2),
      );
      const px = (d) => cx + d * sc,
        py = (z) => bot - z * sc;
      const r = t.dia / 2 || 5;
      ctx.beginPath();
      ctx.moveTo(px(-r), py(0));
      if (t.cr > 0) {
        ctx.lineTo(px(-(r - t.cr)), py(0));
        ctx.arc(px(-(r - t.cr)), py(t.cr), t.cr * sc, Math.PI / 2, Math.PI);
      }
      ctx.lineTo(px(-r), py(t.lc || 22));
      if (isReliefNeck && neckLen > 0 && neckR != null) {
        ctx.lineTo(px(-neckR), py((t.lc || 22) + neckLen));
      }
      ctx.lineTo(px(-(t.shank / 2 || 5)), py(t.lt || 75));
      const hr = (t.hdia || 32) / 2;
      ctx.lineTo(px(-hr), py(t.lt || 75));
      ctx.lineTo(px(-hr), py((t.lt || 75) + (t.hlen || 50)));
      ctx.lineTo(px(hr), py((t.lt || 75) + (t.hlen || 50)));
      ctx.lineTo(px(hr), py(t.lt || 75));
      ctx.lineTo(px(t.shank / 2 || 5), py(t.lt || 75));
      if (isReliefNeck && neckLen > 0 && neckR != null) {
        ctx.lineTo(px(neckR), py((t.lc || 22) + neckLen));
      }
      ctx.lineTo(px(r), py(t.lc || 22));
      if (t.cr > 0) {
        ctx.arc(px(r - t.cr), py(t.cr), t.cr * sc, 0, -Math.PI / 2, true);
      }
      ctx.lineTo(px(r), py(0));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = C.blue + "40";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, bot);
      ctx.lineTo(cx, bot - totalLen * sc - 5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.txt3;
      ctx.font = "8px system-ui";
      ctx.fillText(`Ø${t.dia} TLO:${t.tlo} LC:${t.lc}`, 4, 10);
    }
  }, [editTool]);

  // ─── Stock mini canvas ─────────────────────────────────────────
  const stockCvsRef = useRef(null);
  useEffect(() => {
    const cvs = stockCvsRef.current;
    if (!cvs) return;
    cvs.width = cvs.parentElement?.clientWidth || 220;
    cvs.height = 76;
    const ctx = cvs.getContext("2d");
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, cvs.width, cvs.height);
    if (stock.shape === "cyl") {
      const R = (stock.diameter || 80) / 2,
        L = stock.length || 150;
      const sc = Math.min((cvs.width - 20) / L, (cvs.height - 20) / R);
      const ox = 10,
        cy = cvs.height / 2;
      ctx.fillStyle = C.stockS1;
      ctx.strokeStyle = C.stockBd;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(ox, cy - R * sc, L * sc, R * sc * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(ox, cy, 3, R * sc, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.stockFront;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(ox + L * sc, cy, 3, R * sc, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.stockTop;
      ctx.fill();
      ctx.stroke();
      // Centreline
      ctx.strokeStyle = C.blue + "40";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, cy);
      ctx.lineTo(ox + L * sc, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.blue;
      ctx.font = "bold 8px system-ui";
      ctx.fillText(
        `Ø${stock.diameter || 80} × ${stock.length || 150}mm`,
        4,
        10,
      );
    } else {
      const W = stock.width || 100,
        H2 = stock.height || 80,
        D = stock.depth || 40;
      const sk = 0.35,
        sc =
          Math.min(
            (cvs.width - 30) / (W + D * sk),
            (cvs.height - 14) / (H2 + D * sk),
          ) * 0.85;
      const ox = 10,
        oy = cvs.height - 8;
      const p = (x, y, z) => ({
        x: ox + x * sc + z * sc * sk,
        y: oy - y * sc - z * sc * sk,
      });
      const A = p(0, 0, 0),
        B = p(W, 0, 0),
        Cp = p(W, H2, 0),
        Dp = p(0, H2, 0);
      const E = p(0, 0, D),
        F = p(W, 0, D),
        G = p(W, H2, D),
        Hp = p(0, H2, D);
      const fc = (pts, fill) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = C.stockBd;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      fc([A, B, Cp, Dp], C.stockTop);
      fc([B, F, G, Cp], C.stockS1);
      fc([E, F, G, Hp], C.stockS2);
      ctx.fillStyle = C.blue;
      ctx.font = "bold 8px system-ui";
      ctx.fillText(`${W}×${H2}×${D}mm`, 4, 10);
    }
  }, [stock]);

  // ─── Wheel: must be non-passive to call preventDefault ─────────
  useEffect(() => {
    const cvs = cvsRef.current;
    if (!cvs) return;
    const h = (e) => {
      e.preventDefault();
      camRef.current.zoom = Math.max(
        0.05,
        Math.min(20, camRef.current.zoom * (e.deltaY > 0 ? 0.88 : 1.14)),
      );
      draw();
    };
    cvs.addEventListener("wheel", h, { passive: false });
    return () => cvs.removeEventListener("wheel", h);
  }, [draw]);

  // ─── Jog ───────────────────────────────────────────────────────
  const jog = useCallback(
    (dir) => {
      const d = dir * jogStep;
      setMs((m) => ({
        ...m,
        pos: { ...m.pos, [jogAxis]: (m.pos[jogAxis] || 0) + d },
      }));
      draw();
    },
    [jogAxis, jogStep, draw],
  );

  // ─── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")
        return;
      if (e.code === "Space") {
        e.preventDefault();
        toggleCycle();
      } else if (e.code === "KeyS") step();
      else if (e.code === "KeyR") resetProg();
      else if (e.code === "Escape") {
        setDrawPts([]);
        setDrawActive(false);
        setDrawTool("select");
      } else if (e.code === "ArrowRight") jog(+1);
      else if (e.code === "ArrowLeft") jog(-1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [toggleCycle, step, resetProg, jog]);

  // ─── Setup export/import ──────────────────────────────────────
  const exportToolLibrary = () => {
    const payload = {
      version: TOOL_SCHEMA_VERSION,
      ts: new Date().toISOString(),
      class: activeToolClass,
      units: "mixed",
      schema: "cncsim-tool-library",
      tools: normalizeToolTable(tools, activeToolClass),
    };
    const b = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    const url = URL.createObjectURL(b);
    a.href = url;
    a.download = `cnc-tools-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importToolLibrary = (f) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const d = JSON.parse(String(e.target?.result || "{}"));
        const tbl = normalizeImportedToolPayload(d, activeToolClass);
        if (!Object.keys(tbl).length) {
          throw new Error("Invalid tool library payload");
        }
        setTools((prev) =>
          normalizeToolTable({ ...prev, ...tbl }, activeToolClass),
        );
      } catch (err) {
        alert("Tool library import error: " + err.message);
      }
    };
    r.readAsText(f);
  };

  const exportSetup = () => {
    const d = {
      version: 5,
      ts: new Date().toISOString(),
      machDefId,
      mach,
      code,
      projectFiles,
      activeFileId,
      toolLibraries,
      stock,
      fixtures,
      coordinateSystems,
      activeCoordinateSystemId,
      geoms,
      offsets: ms.offsets,
      wcs: ms.wcs,
      home: ms.home,
      savedProgs,
      geomDepth,
      geomFeed,
    };
    const b = new Blob([JSON.stringify(d, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    const url = URL.createObjectURL(b);
    a.href = url;
    a.download = `cnc_${new Date().toISOString().slice(0, 10)}.cncsetup`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const importSetup = (f) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        if (d.machDefId) setMachDefId(d.machDefId);
        if (Array.isArray(d.projectFiles) && d.projectFiles.length) {
          loadProjectFiles(d.projectFiles, {
            activeId: d.activeFileId || d.projectFiles[0]?.id,
          });
        } else if (d.code) {
          const nextFiles = [
            createProjectFile({
              name: "MAIN.nc",
              content: d.code,
              bucket: "main",
            }),
          ];
          loadProjectFiles(nextFiles);
        }
        if (d.toolLibraries) {
          setToolLibraries({
            mill: normalizeToolTable(d.toolLibraries.mill || {}, "mill"),
            lathe: normalizeToolTable(d.toolLibraries.lathe || {}, "lathe"),
          });
        }
        if (d.tools) {
          const importedDef = MACHINE_DEFINITIONS[d.machDefId] || machDef;
          const importedClass = importedDef.class === "lathe" ? "lathe" : "mill";
          setTools(normalizeToolTable(d.tools, importedClass));
        }
        if (d.stock) setStock(d.stock);
        if (d.fixtures) setFixtures(d.fixtures);
        if (d.offsets || d.wcs || d.home) {
          setMs((m) => ({
            ...m,
            offsets: d.offsets || m.offsets,
            wcs: d.wcs || m.wcs,
            home: d.home || m.home,
          }));
        }
        if (d.coordinateSystems) {
          setCoordinateSystems(
            normalizeCoordinateSystems(d.coordinateSystems, d.offsets || {}),
          );
        }
        if (d.activeCoordinateSystemId) {
          setActiveCoordinateSystemId(d.activeCoordinateSystemId);
        }
        if (d.geoms) setGeoms(d.geoms);
        if (d.savedProgs) setSavedProgs(d.savedProgs);
        if (d.geomDepth) setGeomDepth(d.geomDepth);
        if (d.geomFeed) setGeomFeed(d.geomFeed);
        const importedOffsets = d.offsets || msRef.current.offsets;
        setTimeout(() => reload(
          Array.isArray(d.projectFiles) && d.projectFiles.length
            ? buildProjectSources(d.projectFiles)
            : d.code,
          { machDefId: d.machDefId || machDefId, offsets: importedOffsets },
        ), 0);
      } catch (err) {
        alert("Import error: " + err.message);
      }
    };
    r.readAsText(f);
  };

  // ─── Tool filtering by machine class ──────────────────────────
  const visibleTools = useMemo(() => {
    return Object.entries(tools).filter(([, t]) => {
      if (mach.isLathe && !mach.isMill)
        return t.cls === "lathe" || (t.cls === "live" && mach.liveTools);
      if (!mach.isLathe)
        return t.cls === "mill" || (t.cls === "live" && mach.liveTools);
      return true; // millturn shows all
    });
  }, [tools, mach]);

  // ─── Prog library by machine ──────────────────────────────────
  const progLib = useMemo(() => getProgLib(machDef), [machDef]);

  // ─── Generate G-code from geometry ────────────────────────────
  const genFromGeom = () => {
    if (!geoms.length) return;
    const t = tools[ms.activeT] || { dia: 10 };
    const g = geomToGCode(geoms, mach, t.dia, geomDepth, geomFeed, 1500);
    const nextFiles = projectFiles.length
      ? projectFiles.map((file) =>
          file.id === (activeFileId || currentProjectFile?.id)
            ? { ...file, content: g, programId: inferProgramId(g, file.name) }
            : file,
        )
      : [createProjectFile({ name: "MAIN.nc", content: g, bucket: "main" })];
    loadProjectFiles(nextFiles, {
      activeId: activeFileId || nextFiles[0]?.id,
      switchTo: "code",
    });
    setTimeout(() => reload(buildProjectSources(nextFiles)), 50);
    setRightTab("code");
  };

  // ─── Machine config builder apply ─────────────────────────────
  const applyCustomMach = () => {
    const built = buildMachCfg(customMach);
    setMach(built);
    if (built.isLathe) setStock((s) => ({ ...s, shape: "cyl" }));
    else setStock((s) => ({ ...s, shape: "rect" }));
  };

  // ─── RENDER ─────────────────────────────────────────────────────
  const axisColor = (ax) =>
    ax === "X"
      ? C.red
      : ax === "Y"
        ? C.green
        : ax === "Z"
          ? C.blue
          : ax === "B"
            ? C.purple
            : C.amber;
  const stockUnitScale = stockUnits === "inch" ? 25.4 : 1;
  const toolDisplayDim = (v, units = toolUnits) =>
    Number((Number(v || 0) / (units === "inch" ? 25.4 : 1)).toFixed(4));
  const toolInputToMm = (v, units = toolUnits) =>
    (Number(v || 0) || 0) * (units === "inch" ? 25.4 : 1);
  const stockDisplayDim = (v) =>
    Number((Number(v || 0) / stockUnitScale).toFixed(4));
  const stockInputToMm = (v) => (Number(v || 0) || 0) * stockUnitScale;
  const stockUnitLabel = stockUnits === "inch" ? "in" : "mm";
  const activeT = tools[ms.activeT];
  const activeTool = activeT || tools[1] || null;
  const currentChannel = channelStates[activeChannel];
  const activeCoordinateSystem =
    coordinateSystems.find((frame) => frame.id === activeCoordinateSystemId) ||
    coordinateSystems.find((frame) => frame.id === `wcs_${ms.wcs}`) ||
    coordinateSystems[0] ||
    null;
  const backplotIs3D = vpView === "iso";
  // Z offset to lift path and tool so stock sits on the grid.
  // G-code Z=0 (part top) → scene Z = stockDepth; Z=-5 (cut) → scene Z = stockDepth-5.
  // Use ms.units (G-code execution units) to match path-point coordinate space.
  const backplotZOffset = mach.isLathe
    ? 0
    : (stock.depth ?? 40) / ((pStats.units || ms.units) === "inch" ? 25.4 : 1);
  const backplotPathPoints = useMemo(
    () =>
      pathPts.map((p) => ({
        machineX: mach.isLathe ? (p.z ?? 0) : (p.x ?? 0),
        machineY: mach.isLathe ? 0 : (p.y ?? 0),
        machineZ: mach.isLathe ? (p.x ?? 0) / 2 : (p.z ?? 0) + backplotZOffset,
        motionMode: p.m ?? p.motionMode ?? "G00",
        channelId: p.channelId ?? 0,
      })),
    [pathPts, mach.isLathe, backplotZOffset],
  );
  const backplotCurrentStep = useMemo(() => {
    if (!pathPts.length) return 0;
    let idx = 0;
    for (let i = 0; i < pathPts.length; i++) {
      if ((pathPts[i]?.bi ?? 0) <= curPt) idx = i;
      else break;
    }
    return idx;
  }, [pathPts, curPt]);
  useEffect(() => {
    cancelAnimationFrame(toolPathAnimRef.current);
    if (!pathPts.length) {
      setToolPathStep(0);
      return;
    }
    const target = Math.max(
      0,
      Math.min(backplotCurrentStep, pathPts.length - 1),
    );
    if (!isPlaying) {
      setToolPathStep(target);
      return;
    }
    const tick = () => {
      let shouldContinue = false;
      setToolPathStep((prev) => {
        if (prev === target) return prev;
        shouldContinue = true;
        const delta = target - prev;
        const stride = Math.max(1, Math.ceil(Math.abs(delta) / 8));
        return delta > 0
          ? Math.min(target, prev + stride)
          : Math.max(target, prev - stride);
      });
      if (shouldContinue) {
        toolPathAnimRef.current = requestAnimationFrame(tick);
      }
    };
    toolPathAnimRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(toolPathAnimRef.current);
  }, [backplotCurrentStep, pathPts.length, isPlaying]);
  // ms.pos is the single source of truth — updated by both step() and jog().
  // The path polylines (backplotPathPoints) are the trace lines; the tool
  // indicator always tracks live machine position so jogging moves it.
  const backplotToolPosition = useMemo(() => {
    // Compute live tool axis from B/C rotary angles (5-axis tilt)
    const _bRad = ((ms.pos.B || 0) * Math.PI) / 180;
    const _cRad = ((ms.pos.C || 0) * Math.PI) / 180;
    const _cosB = Math.cos(_bRad), _sinB = Math.sin(_bRad);
    const _cosC = Math.cos(_cRad), _sinC = Math.sin(_cRad);
    // WCS offset for current work coordinate system
    const _wcsOff = ms.offsets?.[ms.wcs] || {};
    if (mach.isLathe) {
      return {
        machineX: (ms.pos.Z ?? 0) + (_wcsOff.Z || 0),
        machineY: 0,
        machineZ: ((ms.pos.X ?? 0) + (_wcsOff.X || 0)) / 2,
        toolAxisX: 0, toolAxisY: 0, toolAxisZ: 1,
        b: 0, c: 0,
      };
    }
    return {
      machineX: (ms.pos.X ?? 0) + (_wcsOff.X || 0),
      machineY: (ms.pos.Y ?? 0) + (_wcsOff.Y || 0),
      machineZ: (ms.pos.Z ?? 0) + (_wcsOff.Z || 0) + backplotZOffset,
      toolAxisX: -_sinB * _cosC,
      toolAxisY: -_sinB * _sinC,
      toolAxisZ: _cosB,
      b: ms.pos.B || 0,
      c: ms.pos.C || 0,
    };
  }, [mach.isLathe, ms.pos.X, ms.pos.Y, ms.pos.Z, ms.pos.B, ms.pos.C, ms.wcs, ms.offsets, backplotZOffset]);
  const backplotCoordinateFrames = useMemo(
    () =>
      coordinateSystemsToBackplotFrames(coordinateSystems, {
        activeId: activeCoordinateSystemId,
        activeWCS: ms.wcs,
        zOffset: backplotZOffset,
        machineClass: mach.isLathe ? "lathe" : "mill",
      }),
    [
      coordinateSystems,
      activeCoordinateSystemId,
      ms.wcs,
      backplotZOffset,
      mach.isLathe,
    ],
  );
  const unitScale = ms.units === "inch" ? 25.4 : 1;
  const backplotToolDiameter =
    ((activeTool?.dia ?? 10) + (activeTool?.wearR ?? 0) * 2) / unitScale;
  const backplotToolLength =
    ((activeTool?.tlo ?? activeTool?.lt ?? activeTool?.hlen ?? 75) +
      (activeTool?.wearL ?? 0)) /
    unitScale;
  const backplotToolLenCut =
    activeTool && (activeTool?.lc ?? activeTool?.lt) != null
      ? ((activeTool?.lc ?? activeTool?.lt) || null) / unitScale
      : null;
  const backplotStockDimensions = useMemo(
    () =>
      stock.shape === "cyl"
        ? {
            length: (stock.length ?? 150) / stockUnitScale,
            diameter: (stock.diameter ?? 80) / stockUnitScale,
          }
        : {
            width: (stock.width ?? 100) / stockUnitScale,
            height: (stock.height ?? 80) / stockUnitScale,
            depth: (stock.depth ?? 40) / stockUnitScale,
          },
    [
      stock.shape,
      stock.length,
      stock.diameter,
      stock.width,
      stock.height,
      stock.depth,
      stockUnitScale,
    ],
  );
  const backplotStockOrigin = useMemo(
    () =>
      stock.shape === "cyl"
        ? {
            x: (stock.z ?? 0) / stockUnitScale,
            y: 0,
            z: (stock.x ?? 0) / stockUnitScale,
          }
        : {
            x: (stock.x ?? 0) / stockUnitScale,
            y: (stock.y ?? 0) / stockUnitScale,
            z: (stock.z ?? 0) / stockUnitScale,
          },
    [stock.shape, stock.x, stock.y, stock.z, stock.depth, stockUnitScale],
  );

  const moveProjectFile = useCallback(
    (fileId, bucket, channel = null) => {
      setProjectFiles((prev) => {
        const next = prev.map((file) =>
          file.id === fileId ? { ...file, bucket, channel } : file,
        );
        setValidationIssues(validateProjectFiles(next, machDef));
        setTimeout(() => reload(buildProjectSources(next)), 0);
        return next;
      });
    },
    [machDef, reload],
  );

  const removeProjectFile = useCallback(
    (fileId) => {
      setProjectFiles((prev) => {
        const next = prev.filter((file) => file.id !== fileId);
        setValidationIssues(validateProjectFiles(next, machDef));
        if (activeFileId === fileId) {
          setActiveFileId(next[0]?.id || null);
          setCode(next[0]?.content || "");
        }
        setTimeout(() => reload(buildProjectSources(next)), 0);
        return next;
      });
    },
    [machDef, reload, activeFileId],
  );

  const addUploadedFiles = useCallback(
    (fileList, bucket = "main", channel = null) => {
      const files = Array.from(fileList || []);
      if (!files.length) return;
      Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (ev) =>
                resolve(
                  createProjectFile({
                    name: file.webkitRelativePath || file.name,
                    content: String(ev.target?.result || ""),
                    bucket,
                    channel,
                  }),
                );
              reader.onerror = reject;
              reader.readAsText(file);
            }),
        ),
      )
        .then((loaded) => {
          const nextFiles = [...projectFiles, ...loaded];
          loadProjectFiles(nextFiles, {
            activeId: loaded[0]?.id || activeFileId,
          });
          setTimeout(() => reload(buildProjectSources(nextFiles)), 0);
        })
        .catch((err) => {
          setAlarms((prev) => [...prev, `Upload error: ${err.message}`]);
        });
    },
    [projectFiles, loadProjectFiles, activeFileId, reload],
  );

  const loadExampleProject = useCallback(
    (example, bucket = "main", channel = null) => {
      const nextFiles = exampleToProject(example, bucket, channel, machDef);
      loadProjectFiles(nextFiles, {
        activeId: nextFiles[0]?.id,
        switchTo: "code",
      });
      setTimeout(() => reload(buildProjectSources(nextFiles)), 0);
    },
    [loadProjectFiles, reload, machDef],
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="sim">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="brand">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke={C.blue} strokeWidth="1.5" />
              <circle cx="8" cy="8" r="3" fill={C.blue} />
            </svg>
            CNC·SIM{" "}
            <span style={{ fontSize: 8, color: C.txt3, letterSpacing: 2 }}>
              PRO v4
            </span>
          </div>
          <div className="tseg">
            <div
              className={`run-dot${isPlaying ? " run" : doneRef.current ? " done" : ""}`}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                color: C.txt3,
                minWidth: 80,
              }}
            >
              {isPlaying
                ? "EXECUTING"
                : doneRef.current
                  ? "COMPLETED"
                  : "READY"}
            </span>
          </div>
          <div className="tseg">
            <span className="tlbl">Machine</span>
            <span className="bdg bdg-mt">{mach.label || "Custom"}</span>
          </div>
          <div className="tseg" style={{ gap: 4 }}>
            <span className="tlbl">Control</span>
            <span className="bdg bdg-bl">{formatControlLabel(machDef)}</span>
            <span className="bdg bdg-mt">{controlBehavior.toolSyntax}</span>
          </div>
          <div className="tseg">
            <span className="tlbl">T</span>
            <span className="bdg bdg-am">
              T{String(ms.activeT).padStart(2, "0")}{" "}
              {activeT?.type?.split(" ")[0] || ""}
            </span>
            <span className="tlbl" style={{ marginLeft: 6 }}>
              TLO
            </span>
            <span className="bdg bdg-bl">
              H{String(ms.activeH).padStart(2, "0")} +{activeT?.tlo || 0}
            </span>
          </div>
          <div className="tseg">
            <span className="tlbl">S</span>
            <span className="tval" style={{ color: C.blue2, minWidth: 65 }}>
              {ms.rpm} RPM
            </span>
            <span className="tlbl" style={{ marginLeft: 5 }}>
              F
            </span>
            <span className="tval" style={{ color: C.amber2, minWidth: 80 }}>
              {ms.feed} {ms.units === "inch" ? "ipm" : "mm/min"}
            </span>
          </div>
          <div className="tseg" style={{ gap: 4 }}>
            <span className="bdg bdg-bl">{ms.wcs}</span>
            <span className="bdg bdg-mt">{ms.motion}</span>
            <span className="bdg bdg-mt">{ms.plane}</span>
            <span className="bdg bdg-mt">
              {ms.units === "inch" ? "G20" : "G21"}
            </span>
            {ms.coolant && <span className="bdg bdg-bl">COOL</span>}
            {mach.liveTools && ms.dir && (
              <span className="bdg bdg-gr">LT {ms.dir}</span>
            )}
          </div>
          {channelStates.length > 1 && (
            <div className="tseg" style={{ gap: 4 }}>
              <span className="tlbl">Channels</span>
              {channelStates.map((ch, idx) => (
                <button
                  key={ch.id ?? idx}
                  onClick={() => setActiveChannel(idx)}
                  style={{
                    background:
                      idx === activeChannel
                        ? `${CHANNEL_COLORS[idx % CHANNEL_COLORS.length]}22`
                        : "transparent",
                    color:
                      idx === activeChannel
                        ? CHANNEL_COLORS[idx % CHANNEL_COLORS.length]
                        : C.txt3,
                    border: `1px solid ${idx === activeChannel ? CHANNEL_COLORS[idx % CHANNEL_COLORS.length] : C.bd}`,
                    borderRadius: 4,
                    padding: "2px 7px",
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {ch.label || `CH${idx + 1}`}
                </button>
              ))}
            </div>
          )}
          <div style={{ flex: 1 }} />
          <div className="tseg">
            <span
              style={{ fontSize: 9, color: C.txt3, fontFamily: "monospace" }}
            >
              {currentChannel?.label || "CH1"} BLK {pointer}
            </span>
          </div>
          <button
            onClick={() => window.history.back()}
            title="Exit CNC Sim"
            style={{
              marginLeft: 8,
              marginRight: 8,
              padding: "4px 12px",
              background: "transparent",
              border: `1px solid ${C.bd}`,
              borderRadius: 5,
              color: C.txt3,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              cursor: "pointer",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.txt3)}
          >
            ✕ EXIT
          </button>
        </div>

        {/* MAIN */}
        <div
          className="main"
          style={{
            gridTemplateColumns: `260px minmax(320px,1fr) 6px ${rightPanelWidth}px`,
          }}
        >
          {/* LEFT */}
          <div className="panel">
            <div className="tabrow">
              {["dro", "mach", "wcs", "jog", "vars"].map((t) => (
                <div
                  key={t}
                  className={`tab${leftTab === t ? " on" : ""}`}
                  onClick={() => setLeftTab(t)}
                >
                  {t.toUpperCase()}
                </div>
              ))}
            </div>
            <div className="pscroll">
              {leftTab === "dro" && (
                <>
                  {channelStates.length > 1 && (
                    <>
                      <div className="sec">Channel Monitor</div>
                      {channelStates.map((ch, idx) => {
                        const chBlocks = channelBlocks[idx] || [];
                        const prog = chBlocks.length
                          ? Math.round((ch.pointer / chBlocks.length) * 100)
                          : 0;
                        const chColor =
                          CHANNEL_COLORS[idx % CHANNEL_COLORS.length] || C.blue;
                        return (
                          <div
                            key={ch.id ?? idx}
                            onClick={() => setActiveChannel(idx)}
                            style={{
                              background:
                                idx === activeChannel ? `${chColor}14` : C.bg,
                              border: `1px solid ${idx === activeChannel ? chColor : C.bd}`,
                              borderRadius: 4,
                              padding: "7px 8px",
                              marginBottom: 4,
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color:
                                    idx === activeChannel ? chColor : C.txt,
                                }}
                              >
                                {ch.label || `CH${idx + 1}`}
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color: ch.waiting
                                    ? C.amber2
                                    : ch.done
                                      ? C.green2
                                      : C.txt3,
                                }}
                              >
                                {ch.waiting ? "WAIT" : ch.done ? "DONE" : "RUN"}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 9,
                                color: C.txt3,
                                fontFamily: "monospace",
                              }}
                            >
                              <span>
                                T{String(ch.activeT || 0).padStart(2, "0")}{" "}
                                {ch.motionMode}
                              </span>
                              <span>
                                BLK {ch.pointer}/{chBlocks.length}
                              </span>
                            </div>
                            <div className="progbar" style={{ marginTop: 5 }}>
                              <div
                                className="progfill"
                                style={{
                                  width: `${prog}%`,
                                  background: chColor,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div className="sec">Work Position</div>
                  {mach.axes.map((ax) => (
                    <div className="dro" key={ax}>
                      <span className="dro-ax" style={{ color: axisColor(ax) }}>
                        {ax}
                      </span>
                      <span
                        className="dro-num"
                        style={{ color: ax === "Z" ? C.blue2 : C.txt }}
                      >
                        {(ms.pos[ax] || 0).toFixed(4)}
                      </span>
                      <span className="dro-unit">
                        {mach.rotary.includes(ax) ? "°" : "mm"}
                      </span>
                    </div>
                  ))}
                  <div className="sec">Machine (G53)</div>
                  {["X", "Y", "Z"]
                    .filter((ax) => mach.axes.includes(ax))
                    .map((ax) => (
                      <div className="mini" key={ax}>
                        <span className="mini-l">M{ax}</span>
                        <span className="mini-v">
                          {(ms.mpos[ax] || 0).toFixed(4)}
                        </span>
                      </div>
                    ))}
                  {mach.subSpindle && (
                    <div className="mini">
                      <span className="mini-l">SS-Z</span>
                      <span className="mini-v">0.0000</span>
                    </div>
                  )}
                  <div className="sec">Spindle / Feed</div>
                  <div className="sgrid">
                    <div className="sbox">
                      <div className="sbox-l">Spindle</div>
                      <div className="sbox-v" style={{ color: C.blue2 }}>
                        {ms.rpm} RPM
                      </div>
                    </div>
                    <div className="sbox">
                      <div className="sbox-l">Dir</div>
                      <div
                        className="sbox-v"
                        style={{
                          color:
                            ms.dir === "CW"
                              ? C.green2
                              : ms.dir === "CCW"
                                ? C.amber2
                                : C.txt3,
                        }}
                      >
                        {ms.dir || "OFF"}
                      </div>
                    </div>
                    <div className="sbox">
                      <div className="sbox-l">Feed</div>
                      <div className="sbox-v" style={{ color: C.amber2 }}>
                        {ms.feed}
                      </div>
                    </div>
                    <div className="sbox">
                      <div className="sbox-l">Coolant</div>
                      <div
                        className="sbox-v"
                        style={{ color: ms.coolant ? C.teal : C.txt3 }}
                      >
                        {ms.coolant ? "ON" : "OFF"}
                      </div>
                    </div>
                  </div>
                  {mach.liveTools && (
                    <>
                      <div className="sec">Live Tool Status</div>
                      <div className="sgrid">
                        <div className="sbox">
                          <div className="sbox-l">LT RPM</div>
                          <div className="sbox-v" style={{ color: C.teal }}>
                            —
                          </div>
                        </div>
                        <div className="sbox">
                          <div className="sbox-l">LT Dir</div>
                          <div className="sbox-v" style={{ color: C.txt3 }}>
                            —
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="sec">Progress</div>
                  <div className="progbar">
                    <div
                      className="progfill"
                      style={{
                        width: `${blocks.length ? Math.round((pointer / blocks.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 9,
                      color: C.txt3,
                      marginTop: 3,
                    }}
                  >
                    <span>
                      BLK {pointer} / {blocks.length}
                    </span>
                    <span>
                      {blocks.length
                        ? Math.round((pointer / blocks.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="sec">Diagnostics</div>
                  <div className="mvar">
                    <span className="mvar-k">Rapid</span>
                    <span className="mvar-v">{pStats.rapid}</span>
                  </div>
                  <div className="mvar">
                    <span className="mvar-k">Linear cut</span>
                    <span className="mvar-v">{pStats.cut}</span>
                  </div>
                  <div className="mvar">
                    <span className="mvar-k">Arc moves</span>
                    <span className="mvar-v">{pStats.arc}</span>
                  </div>
                  <div className="mvar">
                    <span className="mvar-k">Est. time</span>
                    <span className="mvar-v">{Number(pStats.time || 0).toFixed(2)}s</span>
                  </div>
                  <div className="mvar">
                    <span className="mvar-k">Path length</span>
                    <span className="mvar-v">
                      {Number(pStats.dist || 0).toFixed(3)}{pStats.units === "inch" ? "in" : "mm"}
                    </span>
                  </div>
                </>
              )}

              {leftTab === "mach" && (
                <>
                  <div className="sec">Machine Definition</div>
                  <select
                    value={machDefId}
                    onChange={(e) => {
                      setMachDefId(e.target.value);
                      const def = MACHINE_DEFINITIONS[e.target.value];
                      setMach(engineDefToMachCfg(def));
                    }}
                    style={{ width: "100%", marginBottom: 8 }}
                  >
                    {Object.entries(MACHINE_DEFINITIONS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>

                  {MACHINE_DEFINITIONS[machDefId]?.channels?.length > 1 && (
                    <div style={{ marginBottom: 8 }}>
                      <div className="sec">Channels</div>
                      {MACHINE_DEFINITIONS[machDefId].channels.map((ch, i) => (
                        <div key={i} className="mini">
                          <span className="mini-l">
                            {ch.tag || `CH${i + 1}`}
                          </span>
                          <span className="mini-v">{ch.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="sec">Control Behavior</div>
                  <div className="mini">
                    <span className="mini-l">Vendor</span>
                    <span className="mini-v">{machDef.vendor || "Custom"}</span>
                  </div>
                  <div className="mini">
                    <span className="mini-l">Dialect</span>
                    <span className="mini-v">
                      {(machDef.dialect || "fanuc").toUpperCase()}
                    </span>
                  </div>
                  <div className="mini">
                    <span className="mini-l">Tool Call</span>
                    <span className="mini-v">{controlBehavior.toolSyntax}</span>
                  </div>
                  <div className="mini">
                    <span className="mini-l">Feed Mode</span>
                    <span className="mini-v">{controlBehavior.feedMode}</span>
                  </div>
                  <div className="mini">
                    <span className="mini-l">Default Plane</span>
                    <span className="mini-v">{controlBehavior.plane}</span>
                  </div>
                  <div className="mini">
                    <span className="mini-l">Abs / Inc</span>
                    <span className="mini-v">{controlBehavior.absMode}</span>
                  </div>
                  <div className="mini">
                    <span className="mini-l">Units</span>
                    <span className="mini-v">{controlBehavior.units}</span>
                  </div>
                  {controlBehavior.waitCodes.length > 0 && (
                    <div
                      style={{
                        background: C.bg,
                        border: `1px solid ${C.bd}`,
                        borderRadius: 4,
                        padding: "6px 8px",
                        marginBottom: 8,
                        fontSize: 9,
                        color: C.txt3,
                        lineHeight: 1.7,
                      }}
                    >
                      <b style={{ color: C.txt2 }}>Channel sync codes</b>
                      <br />
                      <span style={{ fontFamily: "monospace" }}>
                        {controlBehavior.waitCodes.join(", ")}
                      </span>
                    </div>
                  )}
                  {/*
              <div className="sec">Machine Preset</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:8}}>
                {Object.entries(MACHINE_PRESETS).map(([k,m])=>(
                  <div key={k} className={`mccard${preset===k?" on":""}`} onClick={()=>setPreset(k)}>
                    <div style={{fontSize:13}}>{m.isLathe?"�":m.class==="millturn"?"�":"�"}</div>
                    <div className="mccard-n">{m.label}</div>
                    <div className="mccard-s">{m.axes.join(" ")}</div>
                  </div>
                ))}
              </div>
              */}
                  <div className="div" />
                  <div className="sec">Machine Config Builder</div>
                  <div className="mcfg-row">
                    <span className="mcfg-lbl">Class</span>
                    <select
                      value={customMach.class || "lathe"}
                      onChange={(e) =>
                        setCustomMach((m) => ({ ...m, class: e.target.value }))
                      }
                      style={{ width: 110 }}
                    >
                      <option value="mill">Mill</option>
                      <option value="lathe">Lathe</option>
                      <option value="millturn">Mill-Turn</option>
                      <option value="swiss">Swiss</option>
                    </select>
                  </div>
                  <div className="mcfg-row">
                    <span className="mcfg-lbl">Bed Type</span>
                    <select
                      value={customMach.bedType || "slant"}
                      onChange={(e) =>
                        setCustomMach((m) => ({
                          ...m,
                          bedType: e.target.value,
                        }))
                      }
                      style={{ width: 110 }}
                    >
                      {Object.entries(BED_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mcfg-row">
                    <span className="mcfg-lbl">Turret</span>
                    <select
                      value={customMach.turret || "disc"}
                      onChange={(e) =>
                        setCustomMach((m) => ({ ...m, turret: e.target.value }))
                      }
                      style={{ width: 110 }}
                    >
                      {Object.entries(TURRET_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label} ({v.cap})
                        </option>
                      ))}
                    </select>
                  </div>
                  {[
                    "yAxis",
                    "bAxis",
                    "cAxis",
                    "liveTools",
                    "subSpindle",
                    "turret2",
                  ].map((opt) => (
                    <div className="mcfg-row" key={opt}>
                      <span className="mcfg-lbl">
                        {
                          {
                            yAxis: "Y Axis",
                            bAxis: "B Axis",
                            cAxis: "C Axis / Spindle",
                            liveTools: "Live Tooling",
                            subSpindle: "Sub-Spindle",
                            turret2: "2nd Turret",
                          }[opt]
                        }
                      </span>
                      <div className="toggle">
                        <input
                          type="checkbox"
                          checked={!!customMach[opt]}
                          onChange={(e) =>
                            setCustomMach((m) => ({
                              ...m,
                              [opt]: e.target.checked,
                            }))
                          }
                        />
                        <span
                          style={{
                            fontSize: 9,
                            color: customMach[opt] ? C.green2 : C.txt3,
                          }}
                        >
                          {customMach[opt] ? "ON" : "OFF"}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="frow" style={{ marginTop: 6 }}>
                    <div className="field">
                      <div className="lbl">Max RPM</div>
                      <input
                        type="number"
                        value={customMach.maxSpindleRPM || 3000}
                        onChange={(e) =>
                          setCustomMach((m) => ({
                            ...m,
                            maxSpindleRPM: +e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <div className="lbl">kW</div>
                      <input
                        type="number"
                        value={customMach.spindleKW || 15}
                        onChange={(e) =>
                          setCustomMach((m) => ({
                            ...m,
                            spindleKW: +e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="field">
                    <div className="lbl">Label</div>
                    <input
                      type="text"
                      value={customMach.label || ""}
                      onChange={(e) =>
                        setCustomMach((m) => ({ ...m, label: e.target.value }))
                      }
                    />
                  </div>
                  <button
                    className="btn btn-gr full lg"
                    onClick={applyCustomMach}
                    style={{ marginTop: 6 }}
                  >
                    ✓ Apply Custom Config
                  </button>
                  <div className="div" />
                  <div className="sec">Active Config</div>
                  <div
                    style={{
                      fontSize: 9,
                      color: C.txt3,
                      lineHeight: 1.9,
                      fontFamily: "monospace",
                    }}
                  >
                    {`Axes: ${mach.axes?.join(" ") || ""}\nRotary: ${mach.rotary?.join(" ") || "none"}\nBed: ${mach.bedType || "?"}\nTurret: ${mach.turret || "?"}\nLive: ${mach.liveTools ? "YES" : "no"}\nSub-Sp: ${mach.subSpindle ? "YES" : "no"}\n2nd Turret: ${mach.turret2 ? "YES" : "no"}`}
                  </div>
                  <div className="div" />
                  <div className="sec">Stock</div>
                  <div className="frow" style={{ marginBottom: 5 }}>
                    <div className="field">
                      <div className="lbl">Stock Units</div>
                      <select
                        value={stockUnits}
                        onChange={(e) => setStockUnits(e.target.value)}
                      >
                        <option value="mm">Metric (mm)</option>
                        <option value="inch">Inch (in)</option>
                      </select>
                    </div>
                  </div>
                  <div className="btnrow">
                    <button
                      className={`btn${stock.shape === "rect" ? " btn-bl" : ""}`}
                      style={{ flex: 1 }}
                      onClick={() => setStock((s) => ({ ...s, shape: "rect" }))}
                    >
                      Rect
                    </button>
                    <button
                      className={`btn${stock.shape === "cyl" ? " btn-bl" : ""}`}
                      style={{ flex: 1 }}
                      onClick={() => setStock((s) => ({ ...s, shape: "cyl" }))}
                    >
                      Cylinder
                    </button>
                  </div>
                  {stock.shape === "rect" ? (
                    <div className="frow" style={{ marginTop: 5 }}>
                      <div className="field">
                        <div className="lbl">W ({stockUnitLabel})</div>
                        <input
                          type="number"
                          value={stockDisplayDim(stock.width || 100)}
                          onChange={(e) =>
                            setStock((s) => ({
                              ...s,
                              width: stockInputToMm(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">H ({stockUnitLabel})</div>
                        <input
                          type="number"
                          value={stockDisplayDim(stock.height || 80)}
                          onChange={(e) =>
                            setStock((s) => ({
                              ...s,
                              height: stockInputToMm(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">D ({stockUnitLabel})</div>
                        <input
                          type="number"
                          value={stockDisplayDim(stock.depth || 40)}
                          onChange={(e) =>
                            setStock((s) => ({
                              ...s,
                              depth: stockInputToMm(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="frow" style={{ marginTop: 5 }}>
                      <div className="field">
                        <div className="lbl">Ø dia ({stockUnitLabel})</div>
                        <input
                          type="number"
                          value={stockDisplayDim(stock.diameter || 80)}
                          onChange={(e) =>
                            setStock((s) => ({
                              ...s,
                              diameter: stockInputToMm(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">Length ({stockUnitLabel})</div>
                        <input
                          type="number"
                          value={stockDisplayDim(stock.length || 150)}
                          onChange={(e) =>
                            setStock((s) => ({
                              ...s,
                              length: stockInputToMm(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                  <div className="frow" style={{ marginTop: 4 }}>
                    <div className="field">
                      <div className="lbl">Table X ({stockUnitLabel})</div>
                      <input
                        type="number"
                        value={stockDisplayDim(stock.x || 0)}
                        step={0.001}
                        onChange={(e) =>
                          setStock((s) => ({
                            ...s,
                            x: stockInputToMm(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <div className="lbl">Table Y ({stockUnitLabel})</div>
                      <input
                        type="number"
                        value={stockDisplayDim(stock.y || 0)}
                        step={0.001}
                        onChange={(e) =>
                          setStock((s) => ({
                            ...s,
                            y: stockInputToMm(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="field">
                      <div className="lbl">Table Z ({stockUnitLabel})</div>
                      <input
                        type="number"
                        value={stockDisplayDim(stock.z || 0)}
                        step={0.001}
                        onChange={(e) =>
                          setStock((s) => ({
                            ...s,
                            z: stockInputToMm(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <canvas className="stock-cvs" ref={stockCvsRef} />
                  <div className="div" />
                  <div className="sec">Fixtures</div>
                  <button
                    className="btn btn-gr full"
                    onClick={() =>
                      setFixtures((p) => [
                        ...p,
                        {
                          id: Date.now(),
                          name: `Fix ${p.length + 1}`,
                          format: null,
                          buffer: null,
                          position: [120, 0, 0],
                          rotation: [0, 0, 0],
                          scale: [1, 1, 1],
                          // legacy box dims kept for placeholder rendering
                          x: 120,
                          y: 0,
                          z: 0,
                          w: 60,
                          h: 50,
                          d: 25,
                        },
                      ])
                    }
                  >
                    + Add Fixture
                  </button>
                  {fixtures.map((f, fi) => {
                    const pos = f.position ?? [f.x ?? 0, f.y ?? 0, f.z ?? 0];
                    const rot = f.rotation ?? [0, 0, 0];
                    const isSelected = selectedFixtureId === f.id;
                    return (
                      <div
                        key={f.id}
                        style={{
                          background: isSelected ? C.greenBg : C.bg,
                          border: `1px solid ${isSelected ? C.green : C.bd}`,
                          borderRadius: 4,
                          padding: "6px 8px",
                          marginTop: 4,
                        }}
                      >
                        {/* Header row */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 10 }}>
                            {f.name}
                          </span>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              className={`btn${isSelected ? " btn-gr" : ""}`}
                              style={{ fontSize: 8, padding: "1px 6px" }}
                              onClick={() =>
                                setSelectedFixtureId((id) =>
                                  id === f.id ? null : f.id,
                                )
                              }
                            >
                              {isSelected ? "✓ Sel" : "Select"}
                            </button>
                            <button
                              className="btn btn-rd"
                              style={{ fontSize: 8, padding: "1px 5px" }}
                              onClick={() => {
                                if (selectedFixtureId === f.id)
                                  setSelectedFixtureId(null);
                                setFixtures((p) =>
                                  p.filter((_, i) => i !== fi),
                                );
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Model upload */}
                        <label
                          className="btn btn-gr full"
                          style={{
                            cursor: "pointer",
                            marginBottom: 4,
                            fontSize: 9,
                          }}
                        >
                          {f.buffer
                            ? `✓ ${f.format?.toUpperCase()} loaded`
                            : "Upload model (.stl .obj .fbx .glb .gltf .dae .ply)"}
                          <input
                            type="file"
                            accept=".stl,.obj,.fbx,.glb,.gltf,.dae,.ply"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const ext = file.name
                                .split(".")
                                .pop()
                                .toLowerCase();
                              file
                                .arrayBuffer()
                                .then((buf) =>
                                  setFixtures((p) =>
                                    p.map((x) =>
                                      x.id === f.id
                                        ? { ...x, format: ext, buffer: buf }
                                        : x,
                                    ),
                                  ),
                                );
                            }}
                          />
                        </label>

                        {/* Position */}
                        <div className="frow">
                          {["X", "Y", "Z"].map((k, ki) => (
                            <div key={k} className="field">
                              <div className="lbl">{k}</div>
                              <input
                                type="number"
                                value={+(pos[ki] ?? 0).toFixed(3)}
                                step={0.1}
                                onChange={(e) =>
                                  setFixtures((p) =>
                                    p.map((x) => {
                                      if (x.id !== f.id) return x;
                                      const newPos = [
                                        ...(x.position ?? [
                                          x.x ?? 0,
                                          x.y ?? 0,
                                          x.z ?? 0,
                                        ]),
                                      ];
                                      newPos[ki] = +e.target.value;
                                      return { ...x, position: newPos };
                                    }),
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>

                        {/* Rotation (degrees) */}
                        <div className="frow">
                          {["Rx", "Ry", "Rz"].map((k, ki) => (
                            <div key={k} className="field">
                              <div className="lbl">{k}</div>
                              <input
                                type="number"
                                value={
                                  +(((rot[ki] ?? 0) * 180) / Math.PI).toFixed(1)
                                }
                                step={1}
                                onChange={(e) =>
                                  setFixtures((p) =>
                                    p.map((x) => {
                                      if (x.id !== f.id) return x;
                                      const newRot = [
                                        ...(x.rotation ?? [0, 0, 0]),
                                      ];
                                      newRot[ki] =
                                        (+e.target.value * Math.PI) / 180;
                                      return { ...x, rotation: newRot };
                                    }),
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>

                        {/* Box dims (shown when no model loaded) */}
                        {!f.buffer && (
                          <div className="frow">
                            {["w", "h", "d"].map((k) => (
                              <div key={k} className="field">
                                <div className="lbl">{k.toUpperCase()}</div>
                                <input
                                  type="number"
                                  value={f[k]}
                                  onChange={(e) =>
                                    setFixtures((p) =>
                                      p.map((x) =>
                                        x.id === f.id
                                          ? { ...x, [k]: +e.target.value }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Snap stock on top of fixture */}
                        <button
                          className="btn btn-gr full"
                          style={{ marginTop: 4, fontSize: 9 }}
                          onClick={() => {
                            const fzTop =
                              (f.position?.[2] ?? f.z ?? 0) + (f.d ?? 25);
                            setStock((s) => ({ ...s, z: fzTop }));
                          }}
                        >
                          Snap Stock on Top
                        </button>
                      </div>
                    );
                  })}
                </>
              )}

              {leftTab === "wcs" && (
                <>
                  <div className="sec">Work Offsets</div>
                  {Object.entries(ms.offsets).map(([k, v]) => (
                    <div
                      key={k}
                      className={`wcs-item${ms.wcs === k ? " on" : ""}`}
                      onClick={() => {
                        setMs((m) => ({ ...m, wcs: k }));
                        setActiveCoordinateSystemId(`wcs_${k}`);
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: 10,
                            color: ms.wcs === k ? C.blue2 : C.txt,
                          }}
                        >
                          {k}{" "}
                          {ms.wcs === k && (
                            <span
                              style={{
                                fontSize: 7,
                                background: C.blue,
                                color: "#000",
                                padding: "1px 3px",
                                borderRadius: 1,
                              }}
                            >
                              ACT
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                          {["X", "Y", "Z", ...mach.rotary].map((ax) => (
                            <span
                              key={ax}
                              style={{
                                fontSize: 8,
                                color: C.txt3,
                                fontFamily: "monospace",
                              }}
                            >
                              {ax}:{(v[ax] || 0).toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="div" />
                  <div className="sec">Edit: {ms.wcs}</div>
                  {["X", "Y", "Z", ...mach.rotary].map((ax) => (
                    <div
                      className="frow"
                      key={ax}
                      style={{ marginBottom: 4, alignItems: "center" }}
                    >
                      <span
                        style={{
                          width: 16,
                          fontWeight: 700,
                          fontSize: 11,
                          color: axisColor(ax),
                          flexShrink: 0,
                        }}
                      >
                        {ax}
                      </span>
                      <input
                        type="number"
                        step={0.001}
                        value={(ms.offsets[ms.wcs]?.[ax] || 0).toFixed(3)}
                        onChange={(e) =>
                          setMs((m) => ({
                            ...m,
                            offsets: {
                              ...m.offsets,
                              [m.wcs]: {
                                ...m.offsets[m.wcs],
                                [ax]: parseFloat(e.target.value) || 0,
                              },
                            },
                          }))
                        }
                      />
                      <button
                        className="btn"
                        style={{
                          padding: "4px 6px",
                          fontSize: 9,
                          flexShrink: 0,
                          marginLeft: 3,
                        }}
                        onClick={() =>
                          setMs((m) => ({
                            ...m,
                            offsets: {
                              ...m.offsets,
                              [m.wcs]: { ...m.offsets[m.wcs], [ax]: 0 },
                            },
                          }))
                        }
                      >
                        0
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn btn-am full"
                    style={{ marginTop: 4 }}
                    onClick={() =>
                      setMs((m) => ({
                        ...m,
                        offsets: {
                          ...m.offsets,
                          [m.wcs]: { X: 0, Y: 0, Z: 0, B: 0, C: 0 },
                        },
                      }))
                    }
                  >
                    Zero All
                  </button>
                  <div className="div" />
                  <div
                    className="sec"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Coordinate Systems</span>
                    <button
                      className="btn btn-gr"
                      style={{ fontSize: 8, padding: "2px 6px" }}
                      onClick={addCoordinateSystem}
                    >
                      + Add
                    </button>
                  </div>
                  {coordinateSystems.map((frame) => {
                    const active = activeCoordinateSystemId === frame.id;
                    return (
                      <div
                        key={frame.id}
                        className={`wcs-item${active ? " on" : ""}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                        }}
                        onClick={() => {
                          setActiveCoordinateSystemId(frame.id);
                          if (frame.id.startsWith("wcs_")) {
                            setMs((m) => ({ ...m, wcs: frame.id.slice(4) }));
                          }
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: 10,
                              color: active ? C.green2 : C.txt,
                            }}
                          >
                            <span>{frame.name}</span>
                            <span
                              style={{
                                fontSize: 7,
                                color: C.txt3,
                                textTransform: "uppercase",
                              }}
                            >
                              {frame.type}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                            {["X", "Y", "Z"].map((ax) => (
                              <span
                                key={ax}
                                style={{
                                  fontSize: 8,
                                  color: C.txt3,
                                  fontFamily: "monospace",
                                }}
                              >
                                {ax}:{(frame.origin?.[ax] || 0).toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          className={`btn${frame.visible !== false ? " btn-gr" : ""}`}
                          style={{
                            fontSize: 8,
                            padding: "2px 6px",
                            flexShrink: 0,
                          }}
                          title="Toggle this coordinate frame in the 3D viewport"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCoordinateSystem(frame.id, {
                              visible: frame.visible === false,
                            });
                          }}
                        >
                          {frame.visible !== false ? "On" : "Off"}
                        </button>
                      </div>
                    );
                  })}
                  {activeCoordinateSystem && (
                    <>
                      <div className="div" />
                      <div className="sec">Edit CS: {activeCoordinateSystem.name}</div>
                      {!activeCoordinateSystem.locked && (
                        <div className="field" style={{ marginBottom: 6 }}>
                          <div className="lbl">Name</div>
                          <input
                            type="text"
                            value={activeCoordinateSystem.name}
                            onChange={(e) =>
                              updateCoordinateSystem(activeCoordinateSystem.id, {
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                      {["X", "Y", "Z"].map((ax) => (
                        <div
                          className="frow"
                          key={ax}
                          style={{ marginBottom: 4, alignItems: "center" }}
                        >
                          <span
                            style={{
                              width: 16,
                              fontWeight: 700,
                              fontSize: 11,
                              color: axisColor(ax),
                              flexShrink: 0,
                            }}
                          >
                            {ax}
                          </span>
                          <input
                            type="number"
                            step={0.001}
                            disabled={activeCoordinateSystem.locked}
                            value={(activeCoordinateSystem.origin?.[ax] || 0).toFixed(3)}
                            onChange={(e) =>
                              updateCoordinateSystem(activeCoordinateSystem.id, {
                                origin: {
                                  [ax]: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                      {["A", "B", "C"].map((ax) => (
                        <div
                          className="frow"
                          key={ax}
                          style={{ marginBottom: 4, alignItems: "center" }}
                        >
                          <span
                            style={{
                              width: 16,
                              fontWeight: 700,
                              fontSize: 11,
                              color: axisColor(ax),
                              flexShrink: 0,
                            }}
                          >
                            {ax}
                          </span>
                          <input
                            type="number"
                            step={0.1}
                            disabled={activeCoordinateSystem.locked}
                            value={(activeCoordinateSystem.rotation?.[ax] || 0).toFixed(3)}
                            onChange={(e) =>
                              updateCoordinateSystem(activeCoordinateSystem.id, {
                                rotation: {
                                  [ax]: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                      {!activeCoordinateSystem.locked && (
                        <button
                          className="btn btn-rd full"
                          style={{ marginTop: 4 }}
                          onClick={() => {
                            setCoordinateSystems((prev) =>
                              prev.filter((frame) => frame.id !== activeCoordinateSystem.id),
                            );
                            setActiveCoordinateSystemId(`wcs_${ms.wcs}`);
                          }}
                        >
                          Delete Coordinate System
                        </button>
                      )}
                    </>
                  )}
                  <div className="div" />
                  <div className="sec">Machine Home</div>
                  {mach.axes.map((ax) => (
                    <div
                      className="frow"
                      key={ax}
                      style={{ marginBottom: 3, alignItems: "center" }}
                    >
                      <span
                        style={{
                          width: 16,
                          fontWeight: 700,
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      >
                        {ax}
                      </span>
                      <input
                        type="number"
                        step={0.001}
                        value={ms.home[ax] || 0}
                        onChange={(e) =>
                          setMs((m) => ({
                            ...m,
                            home: {
                              ...m.home,
                              [ax]: parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                  <button
                    className="btn btn-gr full"
                    style={{ marginTop: 4 }}
                    onClick={() =>
                      setMs((m) => ({ ...m, pos: { ...m.pos, ...m.home } }))
                    }
                  >
                    Go to Home
                  </button>
                </>
              )}

              {leftTab === "jog" && (
                <>
                  <div className="sec">Jog / MPG</div>
                  <div className="lbl">Axis</div>
                  <div
                    style={{
                      display: "flex",
                      gap: 3,
                      marginBottom: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {mach.axes.map((ax) => (
                      <button
                        key={ax}
                        className={`btn${jogAxis === ax ? " btn-bl" : ""}`}
                        style={{ flex: 1, minWidth: 32 }}
                        onClick={() => setJogAxis(ax)}
                      >
                        {ax}
                      </button>
                    ))}
                  </div>
                  <div className="lbl">Increment</div>
                  <div
                    style={{
                      display: "flex",
                      gap: 3,
                      marginBottom: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {[0.001, 0.01, 0.1, 1, 10].map((s) => (
                      <button
                        key={s}
                        className={`btn${jogStep === s ? " btn-bl" : ""}`}
                        style={{ flex: 1, minWidth: 36, fontSize: 9 }}
                        onClick={() => setJogStep(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 9, color: C.txt3, marginBottom: 8 }}>
                    Step:{" "}
                    <span style={{ color: C.txt, fontFamily: "monospace" }}>
                      {jogStep}mm
                    </span>{" "}
                    | Axis:{" "}
                    <span style={{ color: C.blue2, fontFamily: "monospace" }}>
                      {jogAxis}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    <button
                      className="btn btn-rd lg"
                      style={{ padding: 10, textAlign: "center" }}
                      onClick={() => jog(-1)}
                    >
                      − {jogAxis}
                    </button>
                    <button
                      className="btn btn-gr lg"
                      style={{ padding: 10, textAlign: "center" }}
                      onClick={() => jog(+1)}
                    >
                      + {jogAxis}
                    </button>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gap: 3,
                      marginBottom: 10,
                    }}
                  >
                    {["X", "Y", "Z"]
                      .filter((a) => mach.axes.includes(a))
                      .map((ax) => (
                        <div key={ax} className="mini">
                          <span className="mini-l">{ax}</span>
                          <span className="mini-v">
                            {(ms.pos[ax] || 0).toFixed(3)}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="div" />
                  <div className="sec">Feed Override: {feedOvr}%</div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={feedOvr}
                    onChange={(e) => setFeedOvr(+e.target.value)}
                    style={{ width: "100%" }}
                  />
                  <div className="sec">Spindle Override: {rpmOvr}%</div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={rpmOvr}
                    onChange={(e) => setRpmOvr(+e.target.value)}
                    style={{ width: "100%" }}
                  />
                  <div className="div" />
                  <button
                    className="btn btn-am full lg"
                    onClick={() => setMs((m) => ({ ...m, pos: { ...m.home } }))}
                  >
                    ⌂ Reference All Axes
                  </button>
                </>
              )}

              {leftTab === "vars" && (
                <>
                  <div className="sec">Macro Variables</div>
                  {Object.entries(ms.vars || {}).length ? (
                    Object.entries(ms.vars).map(([k, v]) => (
                      <div key={k} className="mvar">
                        <span className="mvar-k">#{k}</span>
                        <span className="mvar-v">
                          {typeof v === "number" ? v.toFixed(4) : v}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: C.txt3, fontSize: 9 }}>
                      No variables set
                    </div>
                  )}
                  <div className="div" />
                  <div className="sec">System Variables</div>
                  {mach.axes.map((ax, i) => (
                    <div key={ax} className="mvar">
                      <span className="mvar-k">
                        #{5041 + i} {ax}
                      </span>
                      <span className="mvar-v">
                        {(ms.pos[ax] || 0).toFixed(4)}
                      </span>
                    </div>
                  ))}
                  <div className="mvar">
                    <span className="mvar-k">#_DATE</span>
                    <span className="mvar-v">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mvar">
                    <span className="mvar-k">#_TIME</span>
                    <span className="mvar-v">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* CENTER */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <div className="ctrlbar">
              <button
                className={`btn lg${isPlaying ? " btn-am" : " btn-gr"}`}
                style={{ minWidth: 120 }}
                onClick={toggleCycle}
              >
                {isPlaying ? "⏹ Feed Hold" : "▶ Cycle Start"}
              </button>
              <button className="btn" onClick={step}>
                Step ▸
              </button>
              <button
                className={`btn${sbk ? " btn-bl" : ""}`}
                onClick={() => setSbk((s) => !s)}
              >
                SBK {sbk ? "ON" : "OFF"}
              </button>
              <button className="btn" onClick={resetProg}>
                ↺ Reset
              </button>
              <div className="ctrl-div" />
              <span style={{ fontSize: 9, color: C.txt3 }}>Speed</span>
              {["max", "rt", "custom"].map((m) => (
                <button
                  key={m}
                  className={`btn${speedMode === m ? " btn-bl" : ""}`}
                  style={{ fontSize: 9, padding: "3px 7px" }}
                  onClick={() => setSpeedMode(m)}
                >
                  {m === "max" ? "MAX" : m === "rt" ? "REAL-TIME" : "CUSTOM"}
                </button>
              ))}
              {speedMode === "custom" && (
                <>
                  <input
                    type="range"
                    min={1}
                    max={5000}
                    value={custSpeed}
                    onChange={(e) => setCustSpeed(+e.target.value)}
                    style={{ width: 70 }}
                  />
                  <span style={{ fontSize: 9, color: C.blue2, minWidth: 36 }}>
                    {custSpeed}×
                  </span>
                </>
              )}
              <div className="ctrl-div" />
              <div style={{ flex: 1 }} />
              {mach.isLathe ? (
                <>
                  <button className="vp-btn" onClick={() => setVPView("iso")}>
                    ISO
                  </button>
                  <button className="vp-btn" onClick={() => setVPView("lathe")}>
                    ZX
                  </button>
                </>
              ) : (
                ["top", "front", "side", "iso"].map((v) => (
                  <button
                    key={v}
                    className="vp-btn"
                    onClick={() => setVPView(v)}
                  >
                    {v.toUpperCase()}
                  </button>
                ))
              )}
              <div className="ctrl-div" />
              {Object.entries(layers).map(([l, on]) => (
                <button
                  key={l}
                  className={`vp-btn${on ? " on" : ""}`}
                  onClick={() => setLayers((v) => ({ ...v, [l]: !v[l] }))}
                >
                  {l === "removal"
                    ? "Cut"
                    : l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
              {selectedFixtureId && (
                <>
                  <div className="ctrl-div" />
                  {[
                    ["translate", "↔"],
                    ["rotate", "↻"],
                    ["scale", "⊞"],
                  ].map(([m, icon]) => (
                    <button
                      key={m}
                      className={`vp-btn${transformMode === m ? " on" : ""}`}
                      onClick={() => setTransformMode(m)}
                    >
                      {icon} {m[0].toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                  <button
                    className={`vp-btn${facePickMode ? " on" : ""}`}
                    title="Click a face on the model to align it to an axis"
                    onClick={() => setFacePickMode((f) => !f)}
                  >
                    Face↔Z
                  </button>
                  <button
                    className="vp-btn"
                    style={{ color: "#f87171" }}
                    onClick={() => {
                      setSelectedFixtureId(null);
                      setFacePickMode(false);
                    }}
                  >
                    ✕ Deselect
                  </button>
                </>
              )}
              <div className="ctrl-div" />
              <button
                className={`vp-btn${snapGrid ? " on" : ""}`}
                title="Toggle 1 mm grid snap for transform gizmo"
                onClick={() => setSnapGrid((v) => (v ? 0 : 1))}
              >
                Snap{snapGrid ? ` ${snapGrid}mm` : ""}
              </button>
            </div>

            <div id="vpWrap" ref={vpRef}>
              {backplotIs3D ? (
                <CNCBackplot
                  pathPoints={backplotPathPoints}
                  currentStep={toolPathStep}
                  activeChannel={activeChannel}
                  width="100%"
                  height="100%"
                  isDark={dark}
                  toolDiameter={backplotToolDiameter}
                  toolLength={backplotToolLength}
                  toolLenCut={backplotToolLenCut}
                  toolPosition={backplotToolPosition}
                  showGrid={layers.grid}
                  showTool={layers.tool}
                  stockShape={stock.shape === "cyl" ? "cylinder" : "box"}
                  stockDimensions={backplotStockDimensions}
                  stockOrigin={backplotStockOrigin}
                  showStock={layers.stock}
                  showCuts={layers.removal}
                  stockSTLBuffer={stockSTLBuffer}
                  fixtures={fixtures}
                  coordinateFrames={backplotCoordinateFrames}
                  selectedFixtureId={selectedFixtureId}
                  onSelectFixture={setSelectedFixtureId}
                  onFixtureTransform={handleFixtureTransform}
                  transformMode={transformMode}
                  snapGrid={snapGrid}
                  facePickMode={facePickMode}
                  machineHome={machDef?.machineHome ? {
                    x: machDef.machineHome.X || 0,
                    y: machDef.machineHome.Y || 0,
                    z: machDef.machineHome.Z || 0,
                  } : null}
                />
              ) : (
                <canvas
                  id="vpCvs"
                  ref={cvsRef}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onContextMenu={onContextMenu}
                  style={{
                    cursor:
                      drawTool !== "select"
                        ? "crosshair"
                        : mach.isLathe
                          ? "default"
                          : "default",
                  }}
                />
              )}
              <div className="vp-hud">
                {channelStates.length > 1 && (
                  <>
                    Channel:{" "}
                    <span
                      style={{
                        color:
                          CHANNEL_COLORS[
                            activeChannel % CHANNEL_COLORS.length
                          ] || C.blue2,
                      }}
                    >
                      {currentChannel?.label || `CH${activeChannel + 1}`}
                    </span>
                    <br />
                  </>
                )}
                {mach.isLathe ? (
                  <>
                    Z: <span>{(ms.pos.Z || 0).toFixed(3)}</span> &nbsp; X(dia):{" "}
                    <span>{(ms.pos.X || 0).toFixed(3)}</span>
                  </>
                ) : (
                  <>
                    X: <span>{(ms.pos.X || 0).toFixed(3)}</span> &nbsp; Y:{" "}
                    <span>{(ms.pos.Y || 0).toFixed(3)}</span> &nbsp; Z:{" "}
                    <span>{(ms.pos.Z || 0).toFixed(3)}</span>
                  </>
                )}
                <br />
                Feed: <span>{ms.feed}</span> &nbsp; RPM: <span>{ms.rpm}</span>
                {!backplotIs3D && mach.isLathe && (
                  <>
                    <br />
                    Left-drag: pan · Scroll: zoom · Right-click to finish
                    contour
                  </>
                )}
                {backplotIs3D && (
                  <>
                    <br />
                    Left-drag: rotate · Right-drag: pan · Scroll: zoom
                  </>
                )}
              </div>
              <div className="vp-legend">
                <span
                  className="leg"
                  style={{
                    background: "#ff6e2e15",
                    color: C.rapid,
                    borderColor: "#ff6e2e30",
                  }}
                >
                  Rapid
                </span>
                <span
                  className="leg"
                  style={{
                    background: "#3fb95015",
                    color: C.feed,
                    borderColor: "#3fb95030",
                  }}
                >
                  Feed
                </span>
                <span
                  className="leg"
                  style={{
                    background: "#bc8cff15",
                    color: C.arc,
                    borderColor: "#bc8cff30",
                  }}
                >
                  Arc
                </span>
                {mach.isLathe && layers.removal && (
                  <span
                    className="leg"
                    style={{
                      background: "#ff6e2e10",
                      color: C.rapid,
                      borderColor: "#ff6e2e20",
                    }}
                  >
                    Material Removed
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className="splitter"
            onMouseDown={() => {
              dragRef.current.resizeRight = true;
            }}
          />

          {/* RIGHT */}
          <div className="panel panel-r" style={{ minWidth: 0 }}>
            <div className="tabrow">
              {["trace", "code", "progs", "tools", "draw", "setup"].map((t) => (
                <div
                  key={t}
                  className={`tab${rightTab === t ? " on" : ""}`}
                  onClick={() => setRightTab(t)}
                >
                  {t.toUpperCase()}
                </div>
              ))}
            </div>

            {rightTab === "trace" && (
              <div className="trace-area">
                <div className="trace-hdr">
                  Program Trace{" "}
                  <span style={{ fontFamily: "monospace" }}>
                    {currentChannel?.label || "CH1"} BLK {pointer}/
                    {blocks.length}
                  </span>
                  <span
                    style={{ fontSize: 9, color: C.txt3, marginLeft: "auto" }}
                  >
                    {Number(pStats.dist || 0).toFixed(3)}
                    {pStats.units === "inch" ? "in" : "mm"} | {Number(pStats.time || 0).toFixed(2)}s
                  </span>
                </div>
                <div
                  className="trace-lines"
                  style={
                    channelStates.length > 1
                      ? {
                          display: "grid",
                          gridTemplateColumns: `repeat(${channelStates.length}, minmax(220px, 1fr))`,
                          gap: 8,
                          alignItems: "start",
                        }
                      : undefined
                  }
                >
                  {(channelStates.length > 1
                    ? channelStates
                    : [
                        {
                          ...currentChannel,
                          id: activeChannel,
                          label: currentChannel?.label || "CH1",
                          pointer,
                        },
                      ]
                  ).map((ch, ci) => {
                    const chBlocks = channelBlocks[ci] || blocks;
                    const chPointer = ch?.pointer ?? pointer;
                    const chColor =
                      CHANNEL_COLORS[ci % CHANNEL_COLORS.length] || C.blue;
                    return (
                      <div
                        key={ch?.id ?? ci}
                        style={
                          channelStates.length > 1
                            ? {
                                minWidth: 0,
                                border: `1px solid ${ci === activeChannel ? chColor : C.bd}`,
                                borderRadius: 4,
                                overflow: "hidden",
                                background: C.bg,
                              }
                            : undefined
                        }
                      >
                        {channelStates.length > 1 && (
                          <div
                            onClick={() => setActiveChannel(ci)}
                            style={{
                              padding: "5px 8px",
                              fontSize: 9,
                              fontWeight: 700,
                              letterSpacing: 0.8,
                              cursor: "pointer",
                              color: ci === activeChannel ? chColor : C.txt2,
                              borderBottom: `1px solid ${ci === activeChannel ? chColor : C.bd}`,
                              background:
                                ci === activeChannel ? `${chColor}12` : C.p1,
                            }}
                          >
                            {ch?.label || `CH${ci + 1}`}{" "}
                            {ch?.waiting ? "• WAIT" : ch?.done ? "• DONE" : ""}
                          </div>
                        )}
                        <div>
                          {chBlocks.map((b, bi) => {
                            const gWord = b.words?.G;
                            const gs =
                              gWord != null
                                ? Array.isArray(gWord)
                                  ? gWord
                                  : [gWord]
                                : [];
                            const m = gs.find(
                              (g) => g === 0 || g === 1 || g === 2 || g === 3,
                            );
                            return (
                              <div
                                key={bi}
                                id={`tl${ci}-${bi}`}
                                className={`tline${b.type === "cmt" ? " cmt" : ""}${bi === chPointer - 1 ? " cur" : ""}${m === 0 ? " rpl" : m === 1 ? " fpl" : m === 2 || m === 3 ? " apl" : ""}`}
                              >
                                {b.seqN != null ? (
                                  <span className="tline-nn">N{b.seqN}</span>
                                ) : (
                                  <span className="tline-n">{bi}</span>
                                )}
                                <span>{b.raw}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    padding: "8px 10px",
                    borderTop: `1px solid ${C.bd}`,
                    display: "grid",
                    gridTemplateColumns:
                      channelStates.length > 1
                        ? "repeat(2, minmax(0,1fr))"
                        : "1fr",
                    gap: 6,
                  }}
                >
                  {(channelStates.length > 0
                    ? channelStates
                    : [currentChannel].filter(Boolean)
                  ).map((ch, idx) => {
                    const chColor =
                      CHANNEL_COLORS[idx % CHANNEL_COLORS.length] || C.blue;
                    const diag = computeChannelDiagnostics(
                      ch,
                      channelBlocks[idx] || blocks,
                    );
                    return (
                      <div
                        key={ch?.id ?? idx}
                        style={{
                          background: C.bg,
                          border: `1px solid ${idx === activeChannel ? chColor : C.bd}`,
                          borderRadius: 4,
                          padding: "7px 8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: idx === activeChannel ? chColor : C.txt,
                            }}
                          >
                            {ch?.label || `CH${idx + 1}`}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              color: C.txt3,
                              fontFamily: "monospace",
                            }}
                          >
                            {ch?.motionMode || "G00"}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: 3,
                            fontSize: 9,
                            color: C.txt2,
                            fontFamily: "monospace",
                          }}
                        >
                          <div>
                            WORK{" "}
                            {mach.axes
                              .map(
                                (ax) =>
                                  `${ax}:${(ch?.pos?.[ax] ?? 0).toFixed(3)}`,
                              )
                              .join("  ")}
                          </div>
                          <div>
                            MACH{" "}
                            {["X", "Y", "Z"]
                              .filter((ax) => mach.axes.includes(ax))
                              .map(
                                (ax) =>
                                  `${ax}:${(ch?.machinePos?.[ax] ?? 0).toFixed(3)}`,
                              )
                              .join("  ")}
                          </div>
                          <div>
                            ABS{" "}
                            {mach.axes
                              .map(
                                (ax) =>
                                  `${ax}:${(diag.absolute?.[ax] ?? 0).toFixed(3)}`,
                              )
                              .join("  ")}
                          </div>
                          <div>
                            DTG{" "}
                            {mach.axes
                              .map(
                                (ax) =>
                                  `${ax}:${diag.dtg?.[ax] == null ? "—" : diag.dtg[ax].toFixed(3)}`,
                              )
                              .join("  ")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TOOLS */}
            {rightTab === "tools" && (
              <div className="pscroll">
                <div className="sec">
                  Tool Table ({mach.isLathe && !mach.isMill ? "Lathe" : "Mill"}
                  {mach.liveTools ? " + Live" : ""})
                </div>
                <div className="btnrow" style={{ marginBottom: 6 }}>
                  <button className="btn" onClick={exportToolLibrary}>
                    Export Tool JSON
                  </button>
                  <label className="btn" style={{ cursor: "pointer" }}>
                    Import Tool JSON
                    <input
                      type="file"
                      accept=".json"
                      style={{ display: "none" }}
                      onChange={(e) => importToolLibrary(e.target.files?.[0])}
                    />
                  </label>
                </div>
                {visibleTools.map(([n, t]) => (
                  <div
                    key={n}
                    className={`tcard${ms.activeT == n ? " on" : ""}`}
                    onClick={() => {
                      setMs((m) => ({ ...m, activeT: +n, activeH: +n }));
                      setEditTool({
                        ...normalizeToolDefinition(t, +n, activeToolClass),
                        n: +n,
                      });
                      setToolUnits(inferUnits(t.units, "mm"));
                    }}
                  >
                    <div className="tcard-h">
                      <span className="tcard-name">
                        T{String(n).padStart(2, "0")} — {t.type}
                      </span>
                      {ms.activeT == n && (
                        <span
                          style={{
                            fontSize: 7,
                            background: C.amber,
                            color: "#000",
                            borderRadius: 2,
                            padding: "1px 4px",
                            fontWeight: 700,
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                      {t.cls === "live" && (
                        <span
                          style={{
                            fontSize: 7,
                            background: C.teal,
                            color: "#000",
                            borderRadius: 2,
                            padding: "1px 4px",
                            fontWeight: 700,
                            marginLeft: 3,
                          }}
                        >
                          LIVE
                        </span>
                      )}
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: C.txt3,
                          cursor: "pointer",
                          marginLeft: "auto",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTools((prev) => {
                            const next = { ...prev };
                            delete next[n];
                            return next;
                          });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="tcard-meta">
                      {t.desc}{" "}
                      {t.dia
                        ? `Ø${toolDisplayDim(t.dia, t.units || "mm")} ${t.units === "inch" ? "in" : "mm"}`
                        : ""}{" "}
                      TLO:{toolDisplayDim(t.tlo, t.units || "mm")}{" "}
                      {t.units === "inch" ? "in" : "mm"} {t.mat}
                      {t.source ? ` · ${t.source}` : ""}
                    </div>
                  </div>
                ))}
                {visibleTools.length === 0 && (
                  <div style={{ color: C.txt3, fontSize: 9, padding: "8px 0" }}>
                    No {mach.isLathe ? "lathe" : "mill"} tools defined. Add
                    tools below.
                  </div>
                )}
                <div className="div" />
                <div className="sec">Add / Edit Tool</div>
                <div className="frow">
                  <div className="field">
                    <div className="lbl">Tool Units</div>
                    <select
                      value={editTool.units || toolUnits}
                      onChange={(e) => {
                        const nextUnits = e.target.value;
                        setToolUnits(nextUnits);
                        setEditTool((t) => ({ ...t, units: nextUnits }));
                      }}
                    >
                      <option value="mm">Metric (mm)</option>
                      <option value="inch">Inch (in)</option>
                    </select>
                  </div>
                </div>
                <div className="frow">
                  <div className="field">
                    <div className="lbl">T#</div>
                    <input
                      type="number"
                      value={editTool.n}
                      onChange={(e) =>
                        setEditTool((t) => ({ ...t, n: +e.target.value }))
                      }
                      style={{ width: 55 }}
                    />
                  </div>
                  <div className="field">
                    <div className="lbl">Class</div>
                    <select
                      value={editTool.cls || "lathe"}
                      onChange={(e) =>
                        setEditTool((t) => ({
                          ...t,
                          units: t.units || toolUnits,
                          cls: e.target.value,
                          type:
                            e.target.value === "mill"
                              ? MILL_TOOLS[0]
                              : e.target.value === "live"
                                ? LIVE_TOOLS[0]
                                : LATHE_TOOLS[0],
                        }))
                      }
                    >
                      <option value="mill">Mill</option>
                      <option value="lathe">Lathe</option>
                      <option value="live">Live Tool</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <div className="lbl">Type</div>
                  <select
                    value={editTool.type}
                    onChange={(e) =>
                      setEditTool((t) => ({ ...t, type: e.target.value }))
                    }
                  >
                    {(editTool.cls === "mill"
                      ? MILL_TOOLS
                      : editTool.cls === "live"
                        ? LIVE_TOOLS
                        : LATHE_TOOLS
                    ).map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <div className="lbl">Description</div>
                  <input
                    type="text"
                    value={editTool.desc}
                    onChange={(e) =>
                      setEditTool((t) => ({ ...t, desc: e.target.value }))
                    }
                  />
                </div>
                {editTool.cls === "mill" || editTool.cls === "live" ? (
                  <>
                    <div className="frow">
                      <div className="field">
                        <div className="lbl">
                          Ø dia ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.dia,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              dia: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">
                          Corner R ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.cr,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              cr: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="frow">
                      <div className="field">
                        <div className="lbl">
                          TLO (H) ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.tlo,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              tlo: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">
                          Flute Len ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.lc,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              lc: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="frow">
                      <div className="field">
                        <div className="lbl">
                          Total Len ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.lt,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              lt: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">
                          Shank Ø ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.shank,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              shank: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    {String(editTool.type || "").includes("Relief Neck") && (
                      <div className="frow">
                        <div className="field">
                          <div className="lbl">
                            Neck Ø ({editTool.units === "inch" ? "in" : "mm"})
                          </div>
                          <input
                            type="number"
                            value={toolDisplayDim(
                              editTool.neckDia || 0,
                              editTool.units || toolUnits,
                            )}
                            step={0.001}
                            onChange={(e) =>
                              setEditTool((t) => ({
                                ...t,
                                neckDia: toolInputToMm(
                                  e.target.value,
                                  t.units || toolUnits,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="field">
                          <div className="lbl">
                            Neck Len ({editTool.units === "inch" ? "in" : "mm"})
                          </div>
                          <input
                            type="number"
                            value={toolDisplayDim(
                              editTool.neckLen || 0,
                              editTool.units || toolUnits,
                            )}
                            step={0.001}
                            onChange={(e) =>
                              setEditTool((t) => ({
                                ...t,
                                neckLen: toolInputToMm(
                                  e.target.value,
                                  t.units || toolUnits,
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                    <div className="frow">
                      <div className="field">
                        <div className="lbl">
                          Wear R ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.wearR || 0,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              wearR: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">
                          Wear L ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.wearL || 0,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              wearL: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="frow">
                      <div className="field">
                        <div className="lbl">
                          Holder Ø ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.hdia,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              hdia: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">
                          Holder Len ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.hlen,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              hlen: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="frow">
                      <div className="field">
                        <div className="lbl">Insert Angle°</div>
                        <input
                          type="number"
                          value={editTool.iAngle || 80}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              iAngle: +e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">
                          Corner R ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.cr,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              cr: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="frow">
                      <div className="field">
                        <div className="lbl">
                          Wear R ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.wearR || 0,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              wearR: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">
                          Wear L ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.wearL || 0,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              wearL: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="frow">
                      <div className="field">
                        <div className="lbl">
                          TLO ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.tlo,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              tlo: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">
                          Shank W ({editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.shank,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              shank: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                    {(editTool.type === "Grooving" ||
                      editTool.type === "Parting") && (
                      <div className="field">
                        <div className="lbl">
                          Groove Width (
                          {editTool.units === "inch" ? "in" : "mm"})
                        </div>
                        <input
                          type="number"
                          value={toolDisplayDim(
                            editTool.dia,
                            editTool.units || toolUnits,
                          )}
                          step={0.001}
                          onChange={(e) =>
                            setEditTool((t) => ({
                              ...t,
                              dia: toolInputToMm(
                                e.target.value,
                                t.units || toolUnits,
                              ),
                            }))
                          }
                        />
                      </div>
                    )}
                  </>
                )}
                <canvas className="tool-cvs" ref={toolCvsRef} />
                <button
                  className="btn btn-gr full"
                  onClick={() =>
                    setTools((prev) => ({
                      ...prev,
                      [editTool.n]: normalizeToolDefinition(
                        editTool,
                        editTool.n,
                        activeToolClass,
                      ),
                    }))
                  }
                >
                  ⊕ Save Tool
                </button>
              </div>
            )}

            {/* DRAW */}
            {rightTab === "draw" && (
              <>
                <div className="draw-tb">
                  {["select", "line", "rect", "circle", "arc", "contour"].map(
                    (t) => (
                      <button
                        key={t}
                        className={`dbtn${drawTool === t ? " on" : ""}`}
                        onClick={() => {
                          setDrawTool(t);
                          setDrawPts([]);
                          setDrawActive(false);
                        }}
                      >
                        {t}
                      </button>
                    ),
                  )}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                    <button
                      className={`dbtn${snapMode.grid ? " on" : ""}`}
                      onClick={() =>
                        setSnapMode((s) => ({ ...s, grid: !s.grid }))
                      }
                    >
                      SNAP-G
                    </button>
                    <button
                      className={`dbtn${snapMode.points ? " on" : ""}`}
                      onClick={() =>
                        setSnapMode((s) => ({ ...s, points: !s.points }))
                      }
                    >
                      SNAP-P
                    </button>
                    <button
                      className="dbtn"
                      style={{ color: C.red2, borderColor: C.red + "30" }}
                      onClick={() => setGeoms([])}
                    >
                      CLR
                    </button>
                  </div>
                </div>
                <div className="pscroll">
                  <div
                    style={{
                      background: C.blueBg,
                      border: `1px solid ${C.blue}30`,
                      borderRadius: 4,
                      padding: 8,
                      marginBottom: 8,
                      fontSize: 9,
                      color: C.txt3,
                      lineHeight: 1.8,
                    }}
                  >
                    <b style={{ color: C.blue2 }}>Draw in the viewport:</b>
                    <br />
                    <b>Line:</b> click start → click end
                    <br />
                    <b>Rect:</b> click corner → click opposite corner
                    <br />
                    <b>Circle:</b> click center → click edge (sets radius)
                    <br />
                    <b>Arc:</b> click 3 points — circumscribed arc
                    <br />
                    <b>Contour:</b> click points → right-click to finish
                    <br />
                    Snap: Grid=10mm, Points=existing geometry
                    <br />
                    Esc = cancel current draw
                  </div>
                  <div className="sec">Coordinate Entry (precise input)</div>
                  <div
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.bd}`,
                      borderRadius: 4,
                      padding: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div className="frow" style={{ marginBottom: 4 }}>
                      <div className="field">
                        <div className="lbl">{mach.isLathe ? "Z" : "X"}</div>
                        <input
                          type="number"
                          id="ci-x"
                          step={0.001}
                          defaultValue={0}
                        />
                      </div>
                      <div className="field">
                        <div className="lbl">
                          {mach.isLathe ? "X(dia)" : "Y"}
                        </div>
                        <input
                          type="number"
                          id="ci-y"
                          step={0.001}
                          defaultValue={0}
                        />
                      </div>
                      {!mach.isLathe && (
                        <div className="field">
                          <div className="lbl">Z</div>
                          <input
                            type="number"
                            id="ci-z"
                            step={0.001}
                            defaultValue={0}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-bl full"
                      onClick={() => {
                        const x =
                          parseFloat(document.getElementById("ci-x")?.value) ||
                          0;
                        const y =
                          parseFloat(document.getElementById("ci-y")?.value) ||
                          0;
                        const pt = mach.isLathe ? { x, y: y / 2 } : { x, y }; // store radius for lathe
                        if (drawTool === "line") {
                          if (!drawActive) {
                            setDrawPts([pt]);
                            setDrawActive(true);
                          } else {
                            setGeoms((g) => [
                              ...g,
                              { type: "line", pts: [drawPts[0], pt] },
                            ]);
                            setDrawPts([]);
                            setDrawActive(false);
                          }
                        } else if (drawTool === "circle") {
                          if (!drawActive) {
                            setDrawPts([pt]);
                            setDrawActive(true);
                          } else {
                            const r = Math.sqrt(
                              (pt.x - drawPts[0].x) ** 2 +
                                (pt.y - drawPts[0].y) ** 2,
                            );
                            setGeoms((g) => [
                              ...g,
                              {
                                type: "circle",
                                cx: drawPts[0].x,
                                cy: drawPts[0].y,
                                r,
                              },
                            ]);
                            setDrawPts([]);
                            setDrawActive(false);
                          }
                        } else if (drawTool === "arc") {
                          const np = [...drawPts, pt];
                          if (np.length < 3) {
                            setDrawPts(np);
                            setDrawActive(true);
                          } else {
                            const [p1, p2, p3] = np;
                            const D =
                              2 *
                              (p1.x * (p2.y - p3.y) +
                                p2.x * (p3.y - p1.y) +
                                p3.x * (p1.y - p2.y));
                            if (Math.abs(D) > 0.001) {
                              const ux =
                                ((p1.x ** 2 + p1.y ** 2) * (p2.y - p3.y) +
                                  (p2.x ** 2 + p2.y ** 2) * (p3.y - p1.y) +
                                  (p3.x ** 2 + p3.y ** 2) * (p1.y - p2.y)) /
                                D;
                              const uy =
                                ((p1.x ** 2 + p1.y ** 2) * (p3.x - p2.x) +
                                  (p2.x ** 2 + p2.y ** 2) * (p1.x - p3.x) +
                                  (p3.x ** 2 + p3.y ** 2) * (p2.x - p1.x)) /
                                D;
                              const r = Math.sqrt(
                                (p1.x - ux) ** 2 + (p1.y - uy) ** 2,
                              );
                              const a0 = Math.atan2(p1.y - uy, p1.x - ux),
                                a1 = Math.atan2(p3.y - uy, p3.x - ux);
                              const amid = Math.atan2(p2.y - uy, p2.x - ux);
                              let da = amid - a0;
                              if (da < 0) da += Math.PI * 2;
                              let da1 = a1 - a0;
                              if (da1 < 0) da1 += Math.PI * 2;
                              setGeoms((g) => [
                                ...g,
                                {
                                  type: "arc",
                                  cx: ux,
                                  cy: uy,
                                  r,
                                  a0,
                                  a1,
                                  ccw: da < da1,
                                },
                              ]);
                            }
                            setDrawPts([]);
                            setDrawActive(false);
                          }
                        } else if (drawTool === "rect") {
                          if (!drawActive) {
                            setDrawPts([pt]);
                            setDrawActive(true);
                          } else {
                            const p0 = drawPts[0];
                            setGeoms((g) => [
                              ...g,
                              {
                                type: "rect",
                                x: Math.min(p0.x, pt.x),
                                y: Math.min(p0.y, pt.y),
                                w: Math.abs(pt.x - p0.x),
                                h: Math.abs(pt.y - p0.y),
                              },
                            ]);
                            setDrawPts([]);
                            setDrawActive(false);
                          }
                        } else if (drawTool === "contour") {
                          setDrawPts((p) => [...p, pt]);
                          setDrawActive(true);
                        }
                      }}
                    >
                      + Add Point (
                      {drawActive
                        ? `${drawPts.length} placed`
                        : "click to start"}
                      )
                    </button>
                    {drawActive && (
                      <button
                        className="btn full"
                        style={{ marginTop: 3, fontSize: 9 }}
                        onClick={() => {
                          setDrawPts([]);
                          setDrawActive(false);
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="sec">Toolpath Generation</div>
                  <div className="frow">
                    <div className="field">
                      <div className="lbl">Depth</div>
                      <input
                        type="number"
                        value={geomDepth}
                        step={0.1}
                        onChange={(e) => setGeomDepth(+e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <div className="lbl">Feed</div>
                      <input
                        type="number"
                        value={geomFeed}
                        onChange={(e) => setGeomFeed(+e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    className="btn btn-gr full lg"
                    onClick={genFromGeom}
                    style={{ marginBottom: 8 }}
                  >
                    ⚡ Generate G-Code
                  </button>
                  <div className="sec">Objects ({geoms.length})</div>
                  {geoms.length === 0 && (
                    <div style={{ color: C.txt3, fontSize: 9 }}>
                      No geometry yet. Select a draw tool and click in the
                      viewport, or use coordinate entry above.
                    </div>
                  )}
                  {geoms.map((g, i) => (
                    <div
                      key={i}
                      className={`geom-item${selGeom === i ? " on" : ""}`}
                      onClick={() => setSelGeom(selGeom === i ? null : i)}
                    >
                      <span
                        style={{
                          color: selGeom === i ? C.blue2 : C.txt,
                          fontWeight: 600,
                        }}
                      >
                        {g.type}{" "}
                        {g.type === "rect"
                          ? `${g.w?.toFixed(1)}×${g.h?.toFixed(1)}`
                          : g.type === "circle"
                            ? `R${g.r?.toFixed(1)}`
                            : g.type === "arc"
                              ? `R${g.r?.toFixed(1)} arc`
                              : g.pts
                                ? `${g.pts.length}pts`
                                : ""}
                      </span>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: C.txt3,
                          cursor: "pointer",
                          fontSize: 11,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setGeoms((p) => p.filter((_, j) => j !== i));
                          if (selGeom === i) setSelGeom(null);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* CODE */}
            {rightTab === "code" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    padding: "5px 8px",
                    borderBottom: `1px solid ${C.bd}`,
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <button
                    className="btn btn-bl"
                    style={{ fontSize: 9 }}
                    onClick={() => reload()}
                  >
                    ⟳ Parse Project
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: 9 }}
                    onClick={() => document.getElementById("ncup").click()}
                  >
                    ↑ Upload
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: 9 }}
                    onClick={() => document.getElementById("ncfolder").click()}
                  >
                    ↑ Folder
                  </button>
                  <button
                    className="btn"
                    style={{ fontSize: 9 }}
                    onClick={() => {
                      const b = new Blob([code], { type: "text/plain" });
                      const a = document.createElement("a");
                      const url = URL.createObjectURL(b);
                      a.href = url;
                      a.download = currentProjectFile?.name || "program.nc";
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 0);
                    }}
                  >
                    ↓ DL
                  </button>
                  <input
                    type="file"
                    id="ncup"
                    accept=".nc,.txt,.cnc,.mpf,.min,.tap"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      addUploadedFiles(e.target.files, "main", null);
                      e.target.value = "";
                    }}
                  />
                  <input
                    type="file"
                    id="ncfolder"
                    accept=".nc,.txt,.cnc,.mpf,.min,.tap"
                    multiple
                    webkitdirectory=""
                    directory=""
                    style={{ display: "none" }}
                    onChange={(e) => {
                      addUploadedFiles(e.target.files, "main", null);
                      e.target.value = "";
                    }}
                  />
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 9, color: C.txt3 }}>
                    {currentProjectFile?.name || "No file selected"}
                  </span>
                </div>
                <div
                  style={{
                    padding: "4px 8px",
                    borderBottom: `1px solid ${C.bd}`,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 3,
                    flexShrink: 0,
                  }}
                >
                  {(mach.isLathe
                    ? [
                        ["G00", "G00 X85. Z2."],
                        ["G01", "G01 Z-80. F0.2"],
                        ["G96", "G96 S200 M03"],
                        ["G97", "G97 S800 M03"],
                        ["G76", "G76 P010060 Q0.1 R0.05"],
                        ["T+M", "T0303"],
                        ["M08", "M08"],
                      ]
                    : [
                        ["G00", "G00 X0 Y0"],
                        ["G01", "G01 X0 F150"],
                        ["G02", "G02 X0 Y0 R10"],
                        ["G03", "G03 X0 Y0 R10"],
                        ["G81", "G81 Z-10. R3. F80"],
                        ["T+M", "T1 M06\nG43 H1"],
                        ["M03", "M03 S1500"],
                        ["M98", "M98 P9001"],
                      ]
                  ).map(([l, s]) => (
                    <button
                      key={l}
                      style={{
                        background: C.p3,
                        border: `1px solid ${C.bd}`,
                        color: C.txt3,
                        borderRadius: 3,
                        padding: "2px 5px",
                        fontSize: 8,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        const ta = document.getElementById("ced");
                        if (!ta) return;
                        const p = ta.selectionStart;
                        const nv =
                          ta.value.slice(0, p) + "\n" + s + ta.value.slice(p);
                        replaceCurrentFileContent(nv);
                        ta.selectionStart = ta.selectionEnd = p + s.length + 1;
                        ta.focus();
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <textarea
                  id="ced"
                  value={code}
                  spellCheck={false}
                  onChange={(e) => {
                    replaceCurrentFileContent(e.target.value);
                    clearTimeout(editorReloadRef.current);
                    editorReloadRef.current = setTimeout(() => reload(), 900);
                  }}
                  style={{
                    flex: 1,
                    resize: "none",
                    background: C.codeBg,
                    color: C.green,
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11,
                    border: "none",
                    outline: "none",
                    lineHeight: 1.7,
                    padding: 8,
                    width: "100%",
                  }}
                />
              </div>
            )}

            {/* PROGRAMS */}
            {rightTab === "progs" && (
              <div className="pscroll">
                <div className="sec">Project Files</div>
                <div
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.bd}`,
                    borderRadius: 4,
                    padding: 8,
                    marginBottom: 8,
                    fontSize: 9,
                    color: C.txt3,
                    lineHeight: 1.7,
                  }}
                >
                  Upload multiple files or a whole folder, then drag files
                  between `MAIN`, `SUB`, `MACRO`, and `CH1/CH2/CH3` buckets. The
                  project is compiled into control-aware sources before parsing.
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {[
                    { key: "main", label: "MAIN", channel: null },
                    { key: "sub", label: "SUBPROGRAMS", channel: null },
                    { key: "macro", label: "MACROS", channel: null },
                    ...Array.from(
                      { length: machDef.channels?.length || 0 },
                      (_, idx) => ({
                        key: "channel",
                        label: `CH${idx + 1}`,
                        channel: idx,
                      }),
                    ),
                  ].map((bucket) => {
                    const files = projectFiles.filter(
                      (file) =>
                        file.bucket === bucket.key &&
                        (bucket.key !== "channel" ||
                          file.channel === bucket.channel),
                    );
                    return (
                      <div
                        key={`${bucket.key}-${bucket.channel ?? "x"}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fileId = e.dataTransfer.getData(
                            "text/project-file-id",
                          );
                          if (fileId)
                            moveProjectFile(fileId, bucket.key, bucket.channel);
                        }}
                        style={{
                          background: C.bg,
                          border: `1px solid ${C.bd}`,
                          borderRadius: 4,
                          padding: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: C.blue2,
                            }}
                          >
                            {bucket.label}
                          </span>
                          <button
                            className="btn"
                            style={{ fontSize: 8, padding: "2px 5px" }}
                            onClick={() =>
                              document
                                .getElementById(
                                  `upload-${bucket.key}-${bucket.channel ?? "x"}`,
                                )
                                ?.click()
                            }
                          >
                            Upload
                          </button>
                          <input
                            id={`upload-${bucket.key}-${bucket.channel ?? "x"}`}
                            type="file"
                            accept=".nc,.txt,.cnc,.mpf,.min,.tap"
                            multiple
                            style={{ display: "none" }}
                            onChange={(e) => {
                              addUploadedFiles(
                                e.target.files,
                                bucket.key,
                                bucket.channel,
                              );
                              e.target.value = "";
                            }}
                          />
                        </div>
                        {files.length === 0 && (
                          <div style={{ fontSize: 9, color: C.txt3 }}>
                            Drop files here
                          </div>
                        )}
                        {files.map((file) => (
                          <div
                            key={file.id}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData(
                                "text/project-file-id",
                                file.id,
                              )
                            }
                            className={`tcard${activeFileId === file.id ? " on" : ""}`}
                            onClick={() => {
                              setActiveFileId(file.id);
                              setCode(file.content);
                              setRightTab("code");
                            }}
                            style={{ marginBottom: 4 }}
                          >
                            <div className="tcard-h">
                              <span className="tcard-name">{file.name}</span>
                              <span style={{ fontSize: 7, color: C.txt3 }}>
                                {file.programId || bucketLabel(file)}
                              </span>
                              <button
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: C.txt3,
                                  cursor: "pointer",
                                  marginLeft: "auto",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeProjectFile(file.id);
                                }}
                              >
                                &times;
                              </button>
                            </div>
                            <div className="tcard-meta">
                              {bucketLabel(file)}{" "}
                              {file.programId ? `• ${file.programId}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div className="div" />
                <div className="sec">Validation</div>
                {alarms.map((alarm, idx) => {
                  const isError = alarm.startsWith("ERROR:");
                  return (
                    <div
                      key={`engine-${idx}`}
                      className="alarm-i"
                      style={{
                        background: isError ? C.redBg : C.amberBg,
                        color: isError ? C.red2 : C.amber2,
                        borderColor: isError ? `${C.red}25` : `${C.amber}25`,
                      }}
                    >
                      {alarm}
                    </div>
                  );
                })}
                {validationIssues.length === 0 && (
                  <div style={{ fontSize: 9, color: C.green2 }}>
                    No structural project issues detected.
                  </div>
                )}
                {validationIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="alarm-i"
                    style={{
                      background: issue.level === "error" ? C.redBg : C.amberBg,
                      color: issue.level === "error" ? C.red2 : C.amber2,
                      borderColor:
                        issue.level === "error" ? `${C.red}25` : `${C.amber}25`,
                    }}
                  >
                    {issue.level.toUpperCase()}: {issue.text}
                  </div>
                ))}
                <div className="div" />
                <div className="sec">
                  Library —{" "}
                  {mach.isLathe
                    ? mach.liveTools
                      ? "Lathe + Live"
                      : "Lathe"
                    : "Mill"}
                </div>
                {progLib.map((p) => (
                  <div
                    key={p.id}
                    className="tcard"
                    onClick={() => loadExampleProject(p)}
                  >
                    <div className="tcard-h">
                      <span
                        style={{
                          color: C.blue2,
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        {p.id}
                      </span>
                      <span style={{ fontSize: 8, color: C.green2 }}>
                        Load ▸
                      </span>
                    </div>
                    <div
                      style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}
                    >
                      {p.name}
                    </div>
                    <div className="tcard-meta">{p.desc}</div>
                  </div>
                ))}
                <div className="div" />
                <div className="sec">Machine Memory</div>
                <div className="frow" style={{ marginBottom: 6 }}>
                  <input type="text" id="svn" placeholder="Program name..." />
                  <button
                    className="btn btn-gr"
                    onClick={() => {
                      const n =
                        document.getElementById("svn")?.value ||
                        `Prog ${Date.now()}`;
                      const next = [
                        ...savedProgs,
                        {
                          name: n,
                          projectFiles,
                          machClass: mach.class,
                          machDefId,
                          t: Date.now(),
                        },
                      ];
                      setSavedProgs(next);
                      try {
                        localStorage.setItem("csv4", JSON.stringify(next));
                      } catch {}
                      document.getElementById("svn").value = "";
                    }}
                  >
                    Save
                  </button>
                </div>
                {savedProgs.map((p, i) => (
                  <div
                    key={i}
                    className="tcard"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 10 }}>
                        {p.name}
                      </div>
                      <div className="tcard-meta">
                        {p.machClass || ""} {new Date(p.t).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      <button
                        className="btn btn-gr"
                        style={{ fontSize: 8, padding: "2px 5px" }}
                        onClick={() => {
                          const nextFiles =
                            Array.isArray(p.projectFiles) &&
                            p.projectFiles.length
                              ? p.projectFiles
                              : [
                                  createProjectFile({
                                    name: "MAIN.nc",
                                    content: p.code || "",
                                    bucket: "main",
                                  }),
                                ];
                          loadProjectFiles(nextFiles, {
                            activeId: nextFiles[0]?.id,
                          });
                          setTimeout(
                            () => reload(buildProjectSources(nextFiles)),
                            0,
                          );
                        }}
                      >
                        Load
                      </button>
                      <button
                        className="btn btn-rd"
                        style={{ fontSize: 8, padding: "2px 5px" }}
                        onClick={() => {
                          const next = savedProgs.filter((_, j) => j !== i);
                          setSavedProgs(next);
                          try {
                            localStorage.setItem("csv4", JSON.stringify(next));
                          } catch {}
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SETUP */}
            {rightTab === "setup" && (
              <div className="pscroll">
                <div className="sec">Save / Export Setup</div>
                <div
                  style={{
                    fontSize: 10,
                    color: C.txt3,
                    lineHeight: 1.7,
                    marginBottom: 8,
                  }}
                >
                  Exports: program, tools, WCS, stock, fixtures, geometry,
                  machine config, saved programs.
                </div>
                <button
                  className="btn btn-gr full lg"
                  onClick={exportSetup}
                  style={{ marginBottom: 6 }}
                >
                  ↓ Export .cncsetup
                </button>
                <div className="div" />
                <div className="sec">Load Setup</div>
                <div
                  className="filedrop"
                  onClick={() => document.getElementById("supload").click()}
                >
                  ↑ Drop or click to load .cncsetup
                  <input
                    type="file"
                    id="supload"
                    accept=".cncsetup,.json"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      importSetup(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="div" />
                <div className="sec">STL / Model Import</div>
                <div
                  className="filedrop"
                  onClick={() => document.getElementById("stlup").click()}
                >
                  ↑ Import STL / DXF / STEP
                  <br />
                  <span style={{ fontSize: 8, color: C.txt3 }}>
                    (Future: edge detection for toolpath generation)
                  </span>
                  <input
                    type="file"
                    id="stlup"
                    accept=".stl,.dxf,.step,.stp"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (!f) return;
                      alert(
                        `Loaded: ${f.name} (${(f.size / 1024).toFixed(1)}KB)\n\nSTL edge extraction coming in next module.`,
                      );
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="div" />
                <div className="sec">Summary</div>
                <div className="mvar">
                  <span className="mvar-k">Machine</span>
                  <span className="mvar-v">{mach.label || "Custom"}</span>
                </div>
                <div className="mvar">
                  <span className="mvar-k">Class</span>
                  <span className="mvar-v">{mach.class}</span>
                </div>
                <div className="mvar">
                  <span className="mvar-k">Axes</span>
                  <span className="mvar-v">{mach.axes?.join(" ")}</span>
                </div>
                <div className="mvar">
                  <span className="mvar-k">Bed type</span>
                  <span className="mvar-v">{mach.bedType}</span>
                </div>
                <div className="mvar">
                  <span className="mvar-k">Live tools</span>
                  <span className="mvar-v">
                    {mach.liveTools ? "YES" : "no"}
                  </span>
                </div>
                <div className="mvar">
                  <span className="mvar-k">Sub-spindle</span>
                  <span className="mvar-v">
                    {mach.subSpindle ? "YES" : "no"}
                  </span>
                </div>
                <div className="mvar">
                  <span className="mvar-k">Blocks</span>
                  <span className="mvar-v">{blocks.length}</span>
                </div>
                <div className="mvar">
                  <span className="mvar-k">Tools</span>
                  <span className="mvar-v">{Object.keys(tools).length}</span>
                </div>
                <div className="mvar">
                  <span className="mvar-k">Geometry</span>
                  <span className="mvar-v">{geoms.length} objects</span>
                </div>
                <div className="mvar">
                  <span className="mvar-k">Fixtures</span>
                  <span className="mvar-v">{fixtures.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
