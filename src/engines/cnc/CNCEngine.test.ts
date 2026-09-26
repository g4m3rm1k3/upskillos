import { describe, it, expect, beforeEach } from "vitest";
import {
  CNCEngine,
  GCodeParser,
  MACHINE_DEFINITIONS,
  TOOL_TEMPLATES,
  buildFullToolProfile,
  getHolderProfile,
} from "./CNCEngine.js";
import type { MachineDefinition, ChannelSnapshot, PathPoint } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fanuc = MACHINE_DEFINITIONS["fanuc_mill"] as MachineDefinition;
const lathe = MACHINE_DEFINITIONS["fanuc_lathe"] as MachineDefinition;

function runToCompletion(src: string, machId = "fanuc_mill"): { engine: CNCEngine; state: ChannelSnapshot } {
  const def = MACHINE_DEFINITIONS[machId];
  const engine = new CNCEngine(def);
  engine.loadPrograms(src);
  let guard = 0;
  while (!engine.isDone() && guard++ < 50000) {
    engine.stepAll();
  }
  return { engine, state: engine.getState()[0] };
}

// ─── MACHINE_DEFINITIONS ─────────────────────────────────────────────────────

describe("MACHINE_DEFINITIONS", () => {
  it("exports known machine ids", () => {
    expect(MACHINE_DEFINITIONS).toHaveProperty("fanuc_mill");
    expect(MACHINE_DEFINITIONS).toHaveProperty("fanuc_lathe");
    expect(MACHINE_DEFINITIONS).toHaveProperty("siemens_840d");
    expect(MACHINE_DEFINITIONS).toHaveProperty("haas_mill");
    expect(MACHINE_DEFINITIONS).toHaveProperty("okuma_osp");
    expect(MACHINE_DEFINITIONS).toHaveProperty("mazak_smooth");
  });

  it("fanuc_mill has required fields", () => {
    expect(fanuc.id).toBe("fanuc_mill");
    expect(fanuc.class).toBe("mill");
    expect(fanuc.dialect).toBe("fanuc");
    expect(Array.isArray(fanuc.axes.linear)).toBe(true);
    expect(fanuc.axes.linear).toContain("X");
    expect(fanuc.axes.linear).toContain("Y");
    expect(fanuc.axes.linear).toContain("Z");
    expect(Array.isArray(fanuc.channels)).toBe(true);
    expect(fanuc.channels.length).toBeGreaterThan(0);
  });

  it("every machine has at least one channel", () => {
    for (const [id, def] of Object.entries(MACHINE_DEFINITIONS)) {
      expect(def.channels.length, `${id} has no channels`).toBeGreaterThan(0);
    }
  });

  it("machines with modals all have a motion group", () => {
    // Some multi-channel presets (fanuc_lathe_multich, fanuc_lathe_3turret) are
    // sparse definitions without their own modals — they inherit ChannelState defaults.
    const defsWithModals = Object.entries(MACHINE_DEFINITIONS).filter(([, def]) => def.modals);
    expect(defsWithModals.length).toBeGreaterThan(0);
    for (const [id, def] of defsWithModals) {
      expect(def.modals!.motion, `${id} missing motion modal`).toBeDefined();
    }
  });
});

// ─── GCodeParser ─────────────────────────────────────────────────────────────

describe("GCodeParser", () => {
  it("parses a simple two-line program", () => {
    const parser = new GCodeParser(fanuc);
    const result = parser.parse("G00 X10 Y20\nG01 Z-5 F100\n");
    expect(result).toBeInstanceOf(Map);
    const blocks = result.get("MAIN") ?? [];
    expect(blocks.length).toBe(2);
  });

  it("extracts X/Y/Z words correctly", () => {
    const parser = new GCodeParser(fanuc);
    const [block] = parser.parse("G01 X15.5 Y-3 Z0.25 F200").get("MAIN")!;
    expect(block.words!["X"]).toBe(15.5);
    expect(block.words!["Y"]).toBe(-3);
    expect(block.words!["Z"]).toBe(0.25);
    expect(block.words!["F"]).toBe(200);
  });

  it("parses G and M codes as numbers", () => {
    const parser = new GCodeParser(fanuc);
    const [block] = parser.parse("G90 G21 M03 S1000").get("MAIN")!;
    expect(block.words!["G"]).toContain(90);
    expect(block.words!["M"]).toBe(3);
    expect(block.words!["S"]).toBe(1000);
  });

  it("skips block-delete lines (/) when present", () => {
    const parser = new GCodeParser(fanuc);
    const blocks = parser.parse("/G00 X99\nG01 X1 F100").get("MAIN")!;
    const skipped = blocks.find(b => b.skip);
    const active = blocks.find(b => !b.skip);
    expect(skipped).toBeDefined();
    expect(active?.words?.["X"]).toBe(1);
  });

  it("ignores comment-only lines", () => {
    const parser = new GCodeParser(fanuc);
    const blocks = parser.parse("(This is a comment)\nG00 X5").get("MAIN")!;
    const codeBlocks = blocks.filter(b => b.type === "block");
    expect(codeBlocks.length).toBe(1);
  });

  it("detects O-number sub-program start", () => {
    const parser = new GCodeParser(fanuc);
    const result = parser.parse("O1000\nG00 X5\nM99");
    expect(result.has("O1000")).toBe(true);
  });

  it("strips sequence numbers from words", () => {
    const parser = new GCodeParser(fanuc);
    const [block] = parser.parse("N10 G01 X5 F100").get("MAIN")!;
    expect(block.seqN).toBe(10);
    expect(block.words!["N"]).toBeUndefined();
  });
});

// ─── CNCEngine — basic execution ─────────────────────────────────────────────

describe("CNCEngine — basic execution", () => {
  it("constructs without throwing", () => {
    expect(() => new CNCEngine(fanuc)).not.toThrow();
  });

  it("isDone() is false before loadPrograms", () => {
    const engine = new CNCEngine(fanuc);
    expect(engine.isDone()).toBe(false);
  });

  it("runs a minimal program to completion", () => {
    const { engine } = runToCompletion("G00 X10 Y20\nM30");
    expect(engine.isDone()).toBe(true);
  });

  it("tracks X/Y position after G00 rapid move", () => {
    const { state } = runToCompletion("G00 X50 Y30\nM30");
    expect(state.pos.X).toBeCloseTo(50);
    expect(state.pos.Y).toBeCloseTo(30);
  });

  it("tracks Z position after G01 linear move", () => {
    const { state } = runToCompletion("G01 X0 Y0 Z-10 F100\nM30");
    expect(state.pos.Z).toBeCloseTo(-10);
  });

  it("sets feed rate from F word", () => {
    const { state } = runToCompletion("G01 X10 F350\nM30");
    expect(state.feed).toBe(350);
  });

  it("sets RPM from S word + M03", () => {
    const { state } = runToCompletion("S2000 M03\nM30");
    expect(state.rpm).toBe(2000);
  });

  it("marks done after M30", () => {
    const { engine } = runToCompletion("G00 X0\nM30");
    expect(engine.isDone()).toBe(true);
  });

  it("resets position after reset()", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G00 X100 Y200\nM30");
    while (!engine.isDone()) engine.stepAll();
    engine.reset();
    const state = engine.getState()[0];
    expect(state.pos.X).toBe(0);
    expect(state.pos.Y).toBe(0);
  });
});

// ─── CNCEngine — path points ─────────────────────────────────────────────────

describe("CNCEngine — path points", () => {
  it("getPathPoints() returns an array", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G00 X10\nG01 X20 F100\nM30");
    expect(Array.isArray(engine.getPathPoints())).toBe(true);
  });

  it("generates path points for linear moves", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G01 X50 Y25 F200\nM30");
    const pts = engine.getPathPoints();
    expect(pts.length).toBeGreaterThan(0);
  });

  it("marks rapid moves with G00 motion mode", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G00 X50 Y0\nM30");
    const pts = engine.getPathPoints();
    const rapid = pts.find((p: PathPoint) => p.motionMode === "G00" || p.m === "G00");
    expect(rapid).toBeDefined();
  });

  it("getStats() returns numeric counts", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G00 X10\nG01 X20 F100\nM30");
    const stats = engine.getStats();
    expect(typeof stats.rapid).toBe("number");
    expect(typeof stats.cut).toBe("number");
    expect(typeof stats.blocks).toBe("number");
  });
});

// ─── CNCEngine — modal state ─────────────────────────────────────────────────

describe("CNCEngine — modal state", () => {
  it("defaults to G90 absolute mode", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("M30");
    const state = engine.getState()[0];
    expect(state.posMode).toBe("G90");
  });

  it("switches to G91 incremental mode", () => {
    const { state } = runToCompletion("G91\nM30");
    expect(state.posMode).toBe("G91");
  });

  it("G91 incremental moves accumulate position", () => {
    const { state } = runToCompletion("G91\nG01 X10 F100\nG01 X10 F100\nM30");
    expect(state.pos.X).toBeCloseTo(20);
  });

  it("G90 restores absolute mode after G91", () => {
    const { state } = runToCompletion("G91\nG01 X10 F100\nG90\nG01 X5 F100\nM30");
    expect(state.pos.X).toBeCloseTo(5);
    expect(state.posMode).toBe("G90");
  });

  it("tracks active tool number after T/M06", () => {
    const { state } = runToCompletion("T2 M06\nM30");
    expect(state.activeT).toBe(2);
  });
});

// ─── CNCEngine — subroutines ──────────────────────────────────────────────────

describe("CNCEngine — subroutines", () => {
  it("executes M98/M99 subroutine call and return", () => {
    const src = [
      "G00 X0",
      "M98 P9001",
      "M30",
      "O9001",
      "G01 X50 F200",
      "M99",
    ].join("\n");
    const { state } = runToCompletion(src);
    expect(state.pos.X).toBeCloseTo(50);
  });
});

// ─── CNCEngine — prerun static ───────────────────────────────────────────────

describe("CNCEngine.prerun()", () => {
  it("returns pathPoints and stats", () => {
    const result = CNCEngine.prerun("G00 X10\nG01 X20 F200\nM30");
    expect(Array.isArray(result.pathPoints)).toBe(true);
    expect(typeof result.stats.blocks).toBe("number");
  });

  it("accepts a machine id string", () => {
    const result = CNCEngine.prerun("G00 X5\nM30", "fanuc_mill");
    expect(result.pathPoints).toBeDefined();
  });
});

// ─── TOOL_TEMPLATES ───────────────────────────────────────────────────────────

describe("TOOL_TEMPLATES", () => {
  it("has mill and lathe categories", () => {
    expect(TOOL_TEMPLATES).toHaveProperty("mill");
    expect(TOOL_TEMPLATES).toHaveProperty("lathe");
  });

  it("mill templates have required tool fields", () => {
    const mill = TOOL_TEMPLATES["mill"] as Record<string, { dia?: number; type?: string }>;
    const firstKey = Object.keys(mill)[0];
    const tool = mill[firstKey];
    expect(tool).toHaveProperty("dia");
    expect(tool).toHaveProperty("type");
  });

  it("getHolderProfile returns null for unknown key", () => {
    expect(getHolderProfile("nonexistent_holder_xyz")).toBeNull();
  });
});

// ─── buildFullToolProfile ─────────────────────────────────────────────────────

describe("buildFullToolProfile", () => {
  it("returns pts array for a mill tool", () => {
    const tool = { cls: "mill", type: "End Mill", dia: 10, cr: 0, lc: 22, lt: 75, shank: 10, fl: 4, mat: "Carbide", profile: "endmill", desc: "test" };
    const result = buildFullToolProfile(tool);
    expect(Array.isArray(result.pts)).toBe(true);
    expect(result.pts.length).toBeGreaterThan(0);
    result.pts.forEach(pt => {
      expect(typeof pt.z).toBe("number");
      expect(typeof pt.r).toBe("number");
    });
  });

  it("returns pts array for a lathe tool", () => {
    const tool = { cls: "lathe", type: "CNMG Insert", dia: 0, shank: 16, tlo: 30, cr: 0.8, iAngle: 80 };
    const result = buildFullToolProfile(tool);
    expect(Array.isArray(result.pts)).toBe(true);
    expect(result.pts.length).toBeGreaterThan(0);
  });

  it("z values are monotonically non-decreasing for mill tools", () => {
    const tool = { cls: "mill", type: "End Mill", dia: 12, cr: 0, lc: 26, lt: 80, shank: 12, fl: 4, mat: "Carbide", profile: "endmill", desc: "" };
    const result = buildFullToolProfile(tool);
    for (let i = 1; i < result.pts.length; i++) {
      expect(result.pts[i].z).toBeGreaterThanOrEqual(result.pts[i - 1].z);
    }
  });
});

// ─── CNCEngine — G02/G03 arc moves ───────────────────────────────────────────

describe("CNCEngine — arc interpolation", () => {
  it("G02 CW arc moves to endpoint", () => {
    const src = "G17\nG01 X10 Y0 F200\nG02 X0 Y10 I-10 J0\nM30";
    const { state } = runToCompletion(src);
    expect(state.pos.X).toBeCloseTo(0, 1);
    expect(state.pos.Y).toBeCloseTo(10, 1);
  });

  it("G03 CCW arc moves to endpoint", () => {
    const src = "G17\nG01 X10 Y0 F200\nG03 X0 Y10 I-10 J0\nM30";
    const { state } = runToCompletion(src);
    expect(state.pos.X).toBeCloseTo(0, 1);
    expect(state.pos.Y).toBeCloseTo(10, 1);
  });
});

// ─── CNCEngine — coolant ──────────────────────────────────────────────────────

describe("CNCEngine — coolant", () => {
  it("M08 turns on flood coolant", () => {
    const { state } = runToCompletion("M08\nM30");
    expect(state.coolant.flood).toBe(true);
  });

  it("M09 turns off coolant", () => {
    const { state } = runToCompletion("M08\nM09\nM30");
    expect(state.coolant.flood).toBe(false);
  });
});

// ─── CNCEngine — stepChannel ──────────────────────────────────────────────────

describe("CNCEngine — stepChannel", () => {
  it("returns done=false before program ends", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G00 X10\nG00 X20\nM30");
    const result = engine.stepChannel(0);
    expect(result.done).toBe(false);
  });

  it("returns done=true after M30", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("M30");
    let result = engine.stepChannel(0);
    // Step until done
    let guard = 0;
    while (!result.done && guard++ < 100) {
      result = engine.stepChannel(0);
    }
    expect(result.done).toBe(true);
  });

  it("state snapshot has expected fields", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G00 X5\nM30");
    engine.stepChannel(0);
    const state = engine.getState()[0];
    expect(state).toHaveProperty("pos");
    expect(state).toHaveProperty("feed");
    expect(state).toHaveProperty("rpm");
    expect(state).toHaveProperty("activeT");
    expect(state).toHaveProperty("units");
    expect(state).toHaveProperty("done");
  });
});

// ─── Regression coverage for simulator audit ────────────────────────────────

describe("CNCEngine — safe macro evaluation", () => {
  it("rejects JavaScript instead of executing it", () => {
    (globalThis as any).__cncAuditSentinel = 0;
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("#1=globalThis.__cncAuditSentinel=73\nM30");
    expect((globalThis as any).__cncAuditSentinel).toBe(0);
    expect(engine.getDiagnostics()[0]?.message).toContain("Invalid macro expression");
    delete (globalThis as any).__cncAuditSentinel;
  });

  it("still evaluates CNC arithmetic, variables, comparisons, and trig", () => {
    const { state } = runToCompletion([
      "#100=2",
      "#101=#100*3+SIN[30]",
      "IF [#101 GT 6] GOTO 20",
      "G00 X99",
      "N20 G01 X#101 F100",
      "M30",
    ].join("\n"));
    expect(state.pos.X).toBeCloseTo(6.5, 6);
  });

  it("supports indirect variables and boolean operators", () => {
    const { state } = runToCompletion("#1=100\n#100=7\n#101=[1 EQ 1] AND [0 EQ 1]\nG01 X#[#1] Y#101 F100\nM30");
    expect(state.pos.X).toBe(7);
    expect(state.pos.Y).toBe(0);
  });
});

describe("CNCEngine — audited modal semantics", () => {
  it("retains a separately programmed spindle speed for M03", () => {
    const { state } = runToCompletion("S2000\nM03\nM30");
    expect(state.rpm).toBe(2000);
  });

  it("preselects a mill tool without activating it before M06", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("T2\nM06\nM30");
    engine.stepAll();
    expect(engine.getState()[0].activeT).toBe(0);
    engine.stepAll();
    expect(engine.getState()[0].activeT).toBe(2);
  });

  it("applies configured WCS offsets and G53 machine coordinates", () => {
    const engine = new CNCEngine(fanuc);
    engine.setWorkOffsets({ G54: { X: 100, Y: 20, Z: 5 } });
    engine.loadPrograms("G54 G00 X10 Y2 Z1\nG53 G00 X0 Y0 Z0\nM30");
    while (!engine.isDone()) engine.stepAll();
    const state = engine.getState()[0];
    expect(state.pos.X).toBe(-100);
    expect(state.pos.Y).toBe(-20);
    expect(state.pos.Z).toBe(-5);
    expect(state.machinePos).toEqual({ X: 0, Y: 0, Z: 0 });
  });

  it("returns all axes home for a bare G28", () => {
    const { state } = runToCompletion("G00 X10 Y20 Z30\nG28\nM30");
    expect(state.pos).toMatchObject({ X: 0, Y: 0, Z: 0 });
  });
});

describe("CNCEngine — audited arc geometry and statistics", () => {
  it("counts one arc command and measures consecutive segments", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G00 X10 Y0\nG03 X0 Y10 I-10 J0 F60\nM30");
    expect(engine.getStats().arc).toBe(1);
    expect(engine.getStats().dist).toBeCloseTo(10 + Math.PI * 5, 1);
    expect(engine.getStats().time).toBeCloseTo(15.78, 1);
  });

  it("plots G18 arcs in XZ and interpolates the helical Y axis", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G18\nG00 X10 Y0 Z0\nG03 X0 Y8 Z10 I-10 K0 F60\nM30");
    const arc = engine.getPathPoints().filter((p: PathPoint) => p.m === "G03");
    expect(arc.length).toBeGreaterThan(2);
    expect(arc[0].y).toBeGreaterThan(0);
    expect(arc[0].y).toBeLessThan(8);
    expect(arc.at(-1)).toMatchObject({ x: 0, y: 8, z: 10 });
  });

  it("plots G19 arcs in YZ", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G19\nG00 Y10 Z0\nG03 Y0 Z10 J-10 K0 F60\nM30");
    expect(engine.getPathPoints().at(-1)).toMatchObject({ y: 0, z: 10 });
  });

  it("uses negative R for the major arc", () => {
    const minor = new CNCEngine(fanuc);
    minor.loadPrograms("G00 X10 Y0\nG03 X0 Y10 R10 F60\nM30");
    const major = new CNCEngine(fanuc);
    major.loadPrograms("G00 X10 Y0\nG03 X0 Y10 R-10 F60\nM30");
    expect(major.getStats().dist).toBeGreaterThan(minor.getStats().dist * 2);
  });
});

describe("CNCEngine — execution guards and diagnostics", () => {
  it("rejects zero peck depth without hanging", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G83 X0 Y0 Z-10 R3 Q0 F100\nM30");
    expect(engine.getDiagnostics().some((d: any) => d.message.includes("positive Q"))).toBe(true);
  });

  it("accounts for canned-cycle travel and returns to the initial plane under G98", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G00 Z10\nG98 G81 X0 Y0 Z-5 R2 F100\nM30");
    expect(engine.getStats().dist).toBeGreaterThan(25);
    while (!engine.isDone()) engine.stepAll();
    expect(engine.getState()[0].pos.Z).toBe(10);
  });

  it("repeats a canned cycle at new XY positions using the modal depth", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("G00 Z10\nG99 G81 X0 Y0 Z-5 R2 F100\nX10\nG80\nM30");
    const cuts = engine.getPathPoints().filter((p: PathPoint) => p.m === "G01");
    expect(cuts).toHaveLength(2);
    expect(cuts[1]).toMatchObject({ x: 10, z: -5 });
  });

  it("reports missing subprograms", () => {
    const engine = new CNCEngine(fanuc);
    engine.loadPrograms("M98 P9999\nM30");
    expect(engine.getDiagnostics().some((d: any) => d.message.includes("O9999"))).toBe(true);
  });

  it("stops unbounded macro loops at the execution budget", () => {
    const engine = new CNCEngine(fanuc);
    (engine as any)._maxSteps = 25;
    engine.loadPrograms("WHILE [1 EQ 1] DO1\nEND1\nM30");
    expect(engine.getDiagnostics().some((d: any) => d.message.includes("Execution limit"))).toBe(true);
  });
});
