/**
 * CNCEngine.js  —  v1.0
 * Standalone CNC G-code interpreter with:
 *   - Machine definitions (FANUC, Siemens 840D, Okuma OSP, HAAS, Mazak, custom)
 *   - Multi-channel execution with wait-code synchronisation
 *   - Dialect-aware parsing (G/M codes, variables, expressions)
 *   - Subroutines / sub-programs (M98/M99, CALL/RET, L-calls)
 *   - Full modal state per channel
 *   - Tool change, coolant, spindle, canned cycles
 *   - Macro variables (#100-#999, #1-#33 local, named vars)
 *   - WHILE/DO/END, IF/GOTO, Siemens IF/GOTOB/GOTOF
 */

// ─────────────────────────────────────────────────────────────────────────────
// MACHINE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const MACHINE_DEFINITIONS = {
  fanuc_mill: {
    id: "fanuc_mill",
    label: "FANUC 0i-MF / 31i Mill",
    vendor: "FANUC",
    class: "mill",
    dialect: "fanuc",
    axes: { linear: ["X", "Y", "Z"], rotary: [], spindle: "C" },
    channels: [{ id: 0, label: "Main" }],
    syntax: {
      programStart: ["%", "O\\d+"],
      programEnd: ["M30", "M02", "%"],
      blockSkip: "/",
      lineComment: ";",
      blockComment: ["(", ")"],
      seqNumber: /^N(\d+)/i,
      varPrefix: "#",
      labelPrefix: "N",
      subCall: { code: "M98", param: "P", lRepeat: "L" },
      subReturn: "M99",
      subEnd: "M99",
    },
    modals: {
      motion: {
        group: 1,
        default: "G00",
        codes: ["G00", "G01", "G02", "G03", "G04", "G05", "G05.1", "G07.1"],
      },
      plane: { group: 2, default: "G17", codes: ["G17", "G18", "G19"] },
      absInc: { group: 3, default: "G90", codes: ["G90", "G91"] },
      feed: { group: 5, default: "G94", codes: ["G94", "G95"] },
      units: { group: 6, default: "G21", codes: ["G20", "G21"] },
      cutComp: {
        group: 7,
        default: "G40",
        codes: ["G40", "G41", "G41.1", "G42", "G42.1"],
      },
      tlLen: {
        group: 8,
        default: "G49",
        codes: ["G43", "G43.1", "G43.3", "G43.4", "G44", "G49"],
      },
      retPlane: { group: 10, default: "G98", codes: ["G98", "G99"] },
      workCoord: {
        group: 14,
        default: "G54",
        codes: ["G54", "G55", "G56", "G57", "G58", "G59", "G54.1"],
      },
      cycle: {
        group: 9,
        default: "G80",
        codes: [
          "G80",
          "G81",
          "G82",
          "G83",
          "G84",
          "G85",
          "G86",
          "G87",
          "G88",
          "G89",
        ],
      },
    },
    mCodes: {
      programStop: ["M00"],
      optionalStop: ["M01"],
      programEnd: ["M30", "M02"],
      spindleCW: ["M03"],
      spindleCCW: ["M04"],
      spindleStop: ["M05"],
      toolChange: ["M06"],
      coolantFlood: ["M08"],
      coolantMist: ["M07"],
      coolantTap: ["M50"],
      coolantOff: ["M09"],
      spindleOrient: ["M19"],
      subCall: ["M98"],
      subReturn: ["M99"],
      airBlast: ["M13", "M14"],
      chuckOpen: ["M21"],
      chuckClose: ["M22"],
      tailstock: ["M23", "M24"],
      partCatcher: ["M76", "M77"],
    },
    waitCodes: {},
    toolChange: {
      syntax: "T{n} M06",
      lengthOffset: "G43 H{h}",
      cancel: "G49",
    },
    specialG: {
      G10: "parameter-setting",
      G28: "return-to-reference",
      G29: "return-from-reference",
      G50: "max-spindle-speed",
      G52: "local-coord-shift",
      G53: "machine-coord",
      G65: "macro-call",
      G66: "macro-modal-call",
      G67: "macro-modal-cancel",
      G92: "spindle-speed-clamp",
      G96: "css",
      G97: "rpm",
    },
    macroVars: {
      system: {
        "#0": "null",
        "#1": "A-arg",
        "#2": "B-arg",
        "#3": "C-arg",
        "#4": "I-arg",
        "#5": "J-arg",
        "#6": "K-arg",
        "#7": "D-arg",
        "#8": "E-arg",
        "#9": "F-arg",
        "#10": "H-arg",
        "#11": "M-arg",
        "#17": "Q-arg",
        "#18": "R-arg",
        "#19": "S-arg",
        "#20": "T-arg",
        "#21": "U-arg",
        "#22": "V-arg",
        "#23": "W-arg",
        "#24": "X-arg",
        "#25": "Y-arg",
        "#26": "Z-arg",
        "#4001": "group1-modal",
        "#4002": "group2-modal",
        "#5001": "block-end-X",
        "#5002": "block-end-Y",
        "#5003": "block-end-Z",
        "#5021": "mach-coord-X",
        "#5022": "mach-coord-Y",
        "#5023": "mach-coord-Z",
        "#5041": "work-coord-X",
        "#5042": "work-coord-Y",
        "#5043": "work-coord-Z",
        "#5061": "skip-coord-X",
        "#5062": "skip-coord-Y",
        "#5063": "skip-coord-Z",
        "#5081": "tool-len-compensation",
        "#5201": "G54-X",
        "#5202": "G54-Y",
        "#5203": "G54-Z",
        "#5221": "G55-X",
        "#5222": "G55-Y",
        "#5223": "G55-Z",
      },
      systemVarNames: {
        "#_DATE": () => new Date().toLocaleDateString(),
        "#_TIME": () => new Date().toLocaleTimeString(),
        "#_TOOL": (ch) => ch.activeT,
        "#_FEED": (ch) => ch.feed,
        "#_SPEED": (ch) => ch.rpm,
      },
    },
  },

  fanuc_lathe: {
    id: "fanuc_lathe",
    label: "FANUC 0i-TF / 31i Lathe",
    vendor: "FANUC",
    class: "lathe",
    dialect: "fanuc",
    axes: {
      linear: ["X", "Z"],
      rotary: ["C"],
      spindle: "C",
      subSpindleAxes: ["X2", "Z2"],
    },
    channels: [{ id: 0, label: "Turret 1 (Main)" }],
    syntax: {
      programStart: ["%", "O\\d+"],
      programEnd: ["M30", "M02", "%"],
      blockSkip: "/",
      lineComment: ";",
      blockComment: ["(", ")"],
      seqNumber: /^N(\d+)/i,
      varPrefix: "#",
      subCall: { code: "M98", param: "P", lRepeat: "L" },
      subReturn: "M99",
    },
    modals: {
      motion: {
        group: 1,
        default: "G00",
        codes: [
          "G00",
          "G01",
          "G02",
          "G03",
          "G04",
          "G07.1",
          "G32",
          "G33",
          "G34",
          "G35",
          "G36",
        ],
      },
      plane: { group: 2, default: "G18", codes: ["G17", "G18", "G19"] },
      absInc: { group: 3, default: "G90", codes: ["G90", "G91"] },
      diamRad: { group: 11, default: "G22", codes: ["G22", "G23"] },
      feed: { group: 5, default: "G98", codes: ["G98", "G99"] },
      units: { group: 6, default: "G21", codes: ["G20", "G21"] },
      cutComp: { group: 7, default: "G40", codes: ["G40", "G41", "G42"] },
      tlLen: { group: 8, default: "G49", codes: ["G43", "G44", "G49"] },
      workCoord: {
        group: 14,
        default: "G54",
        codes: ["G54", "G55", "G56", "G57", "G58", "G59"],
      },
      cycle: {
        group: 9,
        default: "G80",
        codes: [
          "G70",
          "G71",
          "G72",
          "G73",
          "G74",
          "G75",
          "G76",
          "G80",
          "G83",
          "G84",
          "G85",
          "G87",
          "G88",
        ],
      },
      spindleCtrl: { group: 15, default: "G97", codes: ["G96", "G97"] },
    },
    mCodes: {
      programStop: ["M00"],
      optionalStop: ["M01"],
      programEnd: ["M30", "M02"],
      spindleCW: ["M03"],
      spindleCCW: ["M04"],
      spindleStop: ["M05"],
      toolChange: [], // lathe: T-word selects tool+offset
      coolantFlood: ["M08"],
      coolantOff: ["M09"],
      coolantThru: ["M51"],
      spindleOrient: ["M19"],
      liveToolCW: ["M13"],
      liveToolCCW: ["M14"],
      liveToolStop: ["M15"],
      chuckOpen: ["M10", "M21"],
      chuckClose: ["M11", "M22"],
      tailstockAdv: ["M23"],
      tailstockRet: ["M24"],
      subSpindClamp: ["M66"],
      subSpindRel: ["M67"],
      partCatcher: ["M76"],
      partCatchRet: ["M77"],
      barFeeder: ["M105"],
      subCall: ["M98"],
      subReturn: ["M99"],
    },
    waitCodes: {
      M200: { type: "channel-wait", param: "P", desc: "Wait for channel P" },
      M201: { type: "channel-wait", desc: "Wait for all channels" },
    },
    toolChange: {
      syntax: "T{nn}{oo}", // T0303 = tool 3, offset 3
      diameterMode: true, // X is diameter
    },
    specialG: {
      G50: "max-spindle-clamp",
      G92: "spindle-speed-clamp",
      G96: "css",
      G97: "rpm",
      G71: "rough-od-cycle",
      G72: "rough-face-cycle",
      G73: "pattern-repeating-cycle",
      G74: "peck-drilling-face",
      G75: "peck-grooving-od",
      G76: "threading-cycle",
      G70: "finish-cycle",
    },
  },

  fanuc_lathe_multich: {
    id: "fanuc_lathe_multich",
    label: "FANUC 31i 2-Turret Multi-Channel",
    vendor: "FANUC",
    class: "lathe",
    dialect: "fanuc",
    axes: { linear: ["X", "Z"], rotary: ["C"], subSpindleAxes: ["X2", "Z2"] },
    channels: [
      { id: 0, label: "Turret 1 (Upper)", tag: "$1" },
      { id: 1, label: "Turret 2 (Lower)", tag: "$2" },
    ],
    syntax: {
      channelTag: /^\$(\d+)/,
      programStart: ["O\\d+"],
      programEnd: ["M30"],
      blockSkip: "/",
      blockComment: ["(", ")"],
      seqNumber: /^N(\d+)/i,
      varPrefix: "#",
      subCall: { code: "M98", param: "P" },
      subReturn: "M99",
    },
    waitCodes: {
      M200: {
        type: "channel-sync",
        param: "P",
        channelScope: "both",
        desc: "Sync point — both channels wait",
      },
      M201: {
        type: "channel-sync",
        param: "P",
        channelScope: "local",
        desc: "Local channel wait for partner",
      },
      WBUF: { type: "buffer-sync", desc: "Siemens-style buffer sync" },
    },
    mCodes: {
      spindleCW: ["M03"],
      spindleCCW: ["M04"],
      spindleStop: ["M05"],
      coolantFlood: ["M08"],
      coolantOff: ["M09"],
      liveToolCW: ["M13"],
      liveToolCCW: ["M14"],
      liveToolStop: ["M15"],
      subCall: ["M98"],
      subReturn: ["M99"],
      programEnd: ["M30"],
      partTransfer: ["M67", "M68"],
      subSpindSync: ["M66"],
    },
  },

  fanuc_lathe_3turret: {
    id: "fanuc_lathe_3turret",
    label: "FANUC 31i 3-Turret Lathe",
    vendor: "FANUC",
    class: "lathe",
    dialect: "fanuc",
    axes: { linear: ["X", "Z"], rotary: ["C"] },
    channels: [
      { id: 0, label: "Turret 1 (Main Upper)", tag: "$1" },
      { id: 1, label: "Turret 2 (Main Lower)", tag: "$2" },
      { id: 2, label: "Turret 3 (Sub Spindle)", tag: "$3" },
    ],
    waitCodes: {
      // Generic M-wait:  M300 P<sync-id>  — all channels sharing that P value wait
      M300: {
        type: "global-sync",
        param: "P",
        desc: "Global sync point across all turrets",
      },
      M301: { type: "channel-sync", param: "P", desc: "Turret 1+2 sync" },
      M302: { type: "channel-sync", param: "P", desc: "Turret 2+3 sync" },
      M303: { type: "channel-sync", param: "P", desc: "Turret 1+3 sync" },
      M200: { type: "channel-sync", param: "P", desc: "Two-channel sync" },
      // Custom per-machine — these can be overridden in machine def editor
    },
    mCodes: {
      spindleCW: ["M03"],
      spindleCCW: ["M04"],
      spindleStop: ["M05"],
      coolantFlood: ["M08"],
      coolantOff: ["M09"],
      liveToolCW: ["M13"],
      liveToolCCW: ["M14"],
      liveToolStop: ["M15"],
      subCall: ["M98"],
      subReturn: ["M99"],
      programEnd: ["M30"],
      partTransfer: ["M67"],
    },
  },

  siemens_840d: {
    id: "siemens_840d",
    label: "SIEMENS 840D sl / 828D",
    vendor: "SIEMENS",
    class: "mill",
    dialect: "siemens",
    axes: { linear: ["X", "Y", "Z"], rotary: ["A", "B", "C"] },
    channels: [
      { id: 0, label: "Channel 1 (Main)" },
      { id: 1, label: "Channel 2" },
    ],
    syntax: {
      programStart: [],
      programEnd: ["M30", "M02", "RET"],
      lineComment: ";",
      blockComment: null,
      seqNumber: /^N(\d+)/i,
      varPrefix: "R",
      namedVarDef: /DEF\s+\w+\s+(\w+)/i,
      subCall: { keyword: "CALL", orDirectName: true },
      subReturn: "RET",
      labelDef: /^(\w+):/,
      gotoFwd: "GOTOF",
      gotoBwd: "GOTOB",
      ifKeyword: "IF",
      whileKeyword: "WHILE",
      endWhile: "ENDWHILE",
      loopKeyword: "LOOP",
      endLoop: "ENDLOOP",
      repeatKeyword: "REPEAT",
      untilKeyword: "UNTIL",
    },
    modals: {
      motion: {
        group: 1,
        default: "G0",
        codes: [
          "G0",
          "G1",
          "G2",
          "G3",
          "G33",
          "G331",
          "G332",
          "G63",
          "G64",
          "G641",
          "G642",
        ],
      },
      plane: { group: 2, default: "G17", codes: ["G17", "G18", "G19"] },
      absInc: { group: 3, default: "G90", codes: ["G90", "G91"] },
      feed: {
        group: 5,
        default: "G94",
        codes: ["G93", "G94", "G95", "G96", "G97"],
      },
      units: { group: 6, default: "G71", codes: ["G70", "G71"] }, // Siemens: G70=inch G71=mm
      cutComp: { group: 7, default: "G40", codes: ["G40", "G41", "G42"] },
      tlLen: { group: 8, default: "G43", codes: ["G43", "G44"] },
      workCoord: {
        group: 14,
        default: "G54",
        codes: [
          "G54",
          "G55",
          "G56",
          "G57",
          "G58",
          "G59",
          "G505",
          "G506",
          "G507",
          "G508",
          "G509",
          "G510",
        ],
      },
      cycle: {
        group: 9,
        default: "G80",
        codes: ["G80", "CYCLE81", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE840"],
      },
    },
    mCodes: {
      programStop: ["M0"],
      optionalStop: ["M1"],
      programEnd: ["M30", "M2"],
      spindleCW: ["M3"],
      spindleCCW: ["M4"],
      spindleStop: ["M5"],
      toolChange: ["M6"],
      coolantFlood: ["M8"],
      coolantMist: ["M7"],
      coolantOff: ["M9"],
    },
    waitCodes: {
      WAITM: {
        type: "channel-sync",
        params: ["value", "chan1", "chan2"],
        desc: "Wait for value match across channels",
      },
      WAITMC: { type: "channel-sync", desc: "Wait mark for channel" },
      SETM: { type: "set-marker", desc: "Set sync marker" },
      CLEARM: { type: "clear-marker", desc: "Clear sync marker" },
    },
    toolChange: {
      syntax: "T{n} D{d} M6",
      cutting: "D", // D-word selects cutting edge offset
    },
    specialG: {
      TRANS: "translation",
      ATRANS: "additive-translation",
      ROT: "rotation",
      AROT: "additive-rotation",
      SCALE: "scale",
      MIRROR: "mirror",
      CYCLE81: "drilling",
      CYCLE83: "deep-drilling",
      CYCLE84: "tapping",
      CYCLE85: "boring",
      POCKET3: "rectangular-pocket",
      POCKET4: "circular-pocket",
      LONGHOLE: "long-hole",
      SLOT1: "slot-milling",
    },
    rVarNames: {
      R0: "general-purpose", // R0–R249 user vars, R250–R299 system
    },
  },

  siemens_840d_lathe: {
    id: "siemens_840d_lathe",
    label: "SIEMENS 840D Lathe / Turn",
    vendor: "SIEMENS",
    class: "lathe",
    dialect: "siemens",
    axes: { linear: ["X", "Z"], rotary: ["C"] },
    channels: [
      { id: 0, label: "Channel 1" },
      { id: 1, label: "Channel 2" },
    ],
    syntax: {
      lineComment: ";",
      subCall: { keyword: "CALL", orDirectName: true },
      subReturn: "RET",
    },
    waitCodes: {
      WAITM: { type: "channel-sync", params: ["value", "chan1", "chan2"] },
      SETM: { type: "set-marker" },
      CLEARM: { type: "clear-marker" },
    },
    mCodes: {
      spindleCW: ["M3", "M303"],
      spindleCCW: ["M4", "M304"],
      spindleStop: ["M5", "M305"],
      liveToolCW: ["M103"],
      liveToolCCW: ["M104"],
      coolantFlood: ["M8"],
      coolantOff: ["M9"],
      programEnd: ["M30", "M2"],
    },
    specialG: {
      LIMS: "max-spindle-clamp",
      G96: "css",
      G97: "rpm",
    },
  },

  haas_mill: {
    id: "haas_mill",
    label: "HAAS VF / UMC (NGC)",
    vendor: "HAAS",
    class: "mill",
    dialect: "haas",
    axes: { linear: ["X", "Y", "Z"], rotary: ["A", "B", "C"] },
    channels: [{ id: 0, label: "Main" }],
    syntax: {
      programStart: ["%", "O\\d+"],
      programEnd: ["M30", "M02", "%"],
      blockSkip: "/",
      lineComment: ";",
      blockComment: ["(", ")"],
      seqNumber: /^N(\d+)/i,
      varPrefix: "#",
      subCall: { code: "M97", param: "P", lRepeat: "L" }, // HAAS: M97=local, M98=external
      subReturn: "M99",
      macroCall: "G65",
    },
    modals: {
      motion: {
        group: 1,
        default: "G00",
        codes: ["G00", "G01", "G02", "G03", "G04", "G05", "G05.1"],
      },
      plane: { group: 2, default: "G17", codes: ["G17", "G18", "G19"] },
      absInc: { group: 3, default: "G90", codes: ["G90", "G91"] },
      units: { group: 6, default: "G21", codes: ["G20", "G21"] },
      cutComp: { group: 7, default: "G40", codes: ["G40", "G41", "G42"] },
      tlLen: { group: 8, default: "G49", codes: ["G43", "G44", "G49"] },
      workCoord: {
        group: 14,
        default: "G54",
        codes: ["G54", "G55", "G56", "G57", "G58", "G59", "G54.1"],
      },
      cycle: {
        group: 9,
        default: "G80",
        codes: [
          "G80",
          "G81",
          "G82",
          "G83",
          "G84",
          "G85",
          "G86",
          "G87",
          "G88",
          "G89",
        ],
      },
    },
    mCodes: {
      programStop: ["M00"],
      optionalStop: ["M01"],
      programEnd: ["M30", "M02"],
      spindleCW: ["M03"],
      spindleCCW: ["M04"],
      spindleStop: ["M05"],
      toolChange: ["M06"],
      coolantFlood: ["M08"],
      coolantMist: ["M07"],
      coolantOff: ["M09"],
      coolantThru: ["M50"],
      coolantAir: ["M51"],
      spindleOrient: ["M19"],
      gearHigh: ["M41"],
      gearLow: ["M42"],
      doorOpen: ["M80"],
      doorClose: ["M81"],
      probeDeploy: ["M59"],
      probeRetract: ["M58"],
      subLocalCall: ["M97"],
      subExtCall: ["M98"],
      subReturn: ["M99"],
    },
    waitCodes: {},
    toolChange: { syntax: "T{n} M06", lengthOffset: "G43 H{h}" },
    specialG: {
      G12: "circular-pocket-CW",
      G13: "circular-pocket-CCW",
      G28: "return-to-zero",
      G50: "scale",
      G51: "scale-cancel",
      G68: "coord-rotate",
      G69: "coord-rotate-cancel",
      G150: "general-pocket",
    },
  },

  okuma_osp: {
    id: "okuma_osp",
    label: "OKUMA OSP-P300 / OSP-E100",
    vendor: "OKUMA",
    class: "mill",
    dialect: "okuma",
    axes: { linear: ["X", "Y", "Z"], rotary: ["B", "C"] },
    channels: [{ id: 0, label: "Main" }],
    syntax: {
      programStart: ["O\\d+", "%"],
      programEnd: ["M02", "M30", "M99"],
      lineComment: ";",
      blockComment: ["(", ")"],
      seqNumber: /^N(\d+)/i,
      varPrefix: "V", // Okuma V-variables
      localVar: "VC", // local variable
      subCall: { keyword: "CALL", param: "O", lRepeat: "Q" },
      subReturn: "RTS",
      ifKeyword: "IF",
      gotoKeyword: "GOTO",
    },
    modals: {
      motion: {
        group: 1,
        default: "G00",
        codes: ["G00", "G01", "G02", "G03", "G04"],
      },
      plane: { group: 2, default: "G17", codes: ["G17", "G18", "G19"] },
      absInc: { group: 3, default: "G90", codes: ["G90", "G91"] },
      units: { group: 6, default: "G15", codes: ["G15", "G16"] }, // Okuma: G15=mm G16=inch
      cutComp: { group: 7, default: "G40", codes: ["G40", "G41", "G42"] },
      tlLen: { group: 8, default: "G43", codes: ["G43", "G44", "G49"] },
      workCoord: {
        group: 14,
        default: "G54",
        codes: ["G54", "G55", "G56", "G57", "G58", "G59"],
      },
      cycle: {
        group: 9,
        default: "G80",
        codes: ["G80", "G81", "G82", "G83", "G84", "G85"],
      },
    },
    mCodes: {
      programStop: ["M00"],
      optionalStop: ["M01"],
      programEnd: ["M02", "M30"],
      spindleCW: ["M03"],
      spindleCCW: ["M04"],
      spindleStop: ["M05"],
      toolChange: ["M06"],
      coolantFlood: ["M08"],
      coolantMist: ["M07"],
      coolantOff: ["M09"],
      coolantThru: ["M51"],
      subCall: ["M98"],
      subReturn: ["M99", "RTS"],
    },
    waitCodes: {},
    toolChange: { syntax: "T{n} M06", lengthOffset: "G43 H{h}" },
    specialG: {
      "G8.1": "thread-cutting",
      G9: "exact-stop-check",
      G14: "coordinate-read",
      G32: "thread-cutting",
    },
  },

  okuma_osp_lathe: {
    id: "okuma_osp_lathe",
    label: "OKUMA OSP Lathe (LB/LT/VTM)",
    vendor: "OKUMA",
    class: "lathe",
    dialect: "okuma",
    axes: { linear: ["X", "Z"], rotary: ["C"] },
    channels: [
      { id: 0, label: "Turret 1" },
      { id: 1, label: "Turret 2" },
    ],
    syntax: {
      lineComment: ";",
      blockComment: ["(", ")"],
      seqNumber: /^N(\d+)/i,
      varPrefix: "V",
      subCall: { keyword: "CALL", param: "O" },
      subReturn: "RTS",
    },
    waitCodes: {
      M330: { type: "channel-sync", param: "P", desc: "Turret sync" },
      M331: { type: "channel-sync", param: "P", desc: "Sub-spindle sync" },
    },
    mCodes: {
      spindleCW: ["M03"],
      spindleCCW: ["M04"],
      spindleStop: ["M05"],
      coolantFlood: ["M08"],
      coolantOff: ["M09"],
      liveToolCW: ["M13"],
      liveToolStop: ["M15"],
      programEnd: ["M02", "M30"],
    },
    toolChange: { syntax: "T{nn}{oo}", diameterMode: true },
  },

  mazak_smooth: {
    id: "mazak_smooth",
    label: "MAZAK SmoothX / SmoothC (EIA mode)",
    vendor: "MAZAK",
    class: "mill",
    dialect: "mazak",
    axes: { linear: ["X", "Y", "Z"], rotary: ["A", "B", "C"] },
    channels: [{ id: 0, label: "Main" }],
    syntax: {
      programStart: ["O\\d+", ":"],
      programEnd: ["M30", "M02"],
      lineComment: ";",
      blockComment: ["(", ")"],
      seqNumber: /^N(\d+)/i,
      varPrefix: "#",
      subCall: { code: "M98", param: "P" },
      subReturn: "M99",
    },
    modals: {
      motion: {
        group: 1,
        default: "G00",
        codes: ["G00", "G01", "G02", "G03", "G04"],
      },
      plane: { group: 2, default: "G17", codes: ["G17", "G18", "G19"] },
      absInc: { group: 3, default: "G90", codes: ["G90", "G91"] },
      units: { group: 6, default: "G21", codes: ["G20", "G21"] },
      cutComp: { group: 7, default: "G40", codes: ["G40", "G41", "G42"] },
      tlLen: { group: 8, default: "G49", codes: ["G43", "G44", "G49"] },
      workCoord: {
        group: 14,
        default: "G54",
        codes: ["G54", "G55", "G56", "G57", "G58", "G59"],
      },
      cycle: {
        group: 9,
        default: "G80",
        codes: ["G80", "G81", "G82", "G83", "G84", "G85"],
      },
    },
    mCodes: {
      programStop: ["M00"],
      optionalStop: ["M01"],
      programEnd: ["M30", "M02"],
      spindleCW: ["M03"],
      spindleCCW: ["M04"],
      spindleStop: ["M05"],
      toolChange: ["M06"],
      coolantFlood: ["M08"],
      coolantOff: ["M09"],
      coolantThru: ["M51"],
      spindleOrient: ["M19"],
      subCall: ["M98"],
      subReturn: ["M99"],
      palletChange: ["M60"],
    },
    waitCodes: {},
    toolChange: { syntax: "T{n} M06", lengthOffset: "G43 H{h}" },
  },

  custom: {
    id: "custom",
    label: "Custom Machine",
    vendor: "Custom",
    class: "mill",
    dialect: "fanuc",
    axes: { linear: ["X", "Y", "Z"], rotary: [] },
    channels: [{ id: 0, label: "Main" }],
    syntax: {
      programEnd: ["M30"],
      blockComment: ["(", ")"],
      seqNumber: /^N(\d+)/i,
      varPrefix: "#",
      subCall: { code: "M98", param: "P" },
      subReturn: "M99",
    },
    modals: {
      motion: { group: 1, default: "G00", codes: ["G00", "G01", "G02", "G03"] },
      absInc: { group: 3, default: "G90", codes: ["G90", "G91"] },
      units: { group: 6, default: "G21", codes: ["G20", "G21"] },
      workCoord: {
        group: 14,
        default: "G54",
        codes: ["G54", "G55", "G56", "G57", "G58", "G59"],
      },
    },
    mCodes: {
      spindleCW: ["M03"],
      spindleCCW: ["M04"],
      spindleStop: ["M05"],
      toolChange: ["M06"],
      coolantFlood: ["M08"],
      coolantOff: ["M09"],
      programEnd: ["M30"],
      subCall: ["M98"],
      subReturn: ["M99"],
    },
    waitCodes: {},
    toolChange: { syntax: "T{n} M06" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL STATE
// ─────────────────────────────────────────────────────────────────────────────

class ChannelState {
  constructor(channelDef, machDef) {
    this.id = channelDef.id;
    this.label = channelDef.label;
    this.tag = channelDef.tag || null;
    this.machDef = machDef;

    // Position
    this.pos = { X: 0, Y: 0, Z: 0, A: 0, B: 0, C: 0 };
    this.machinePos = { X: 0, Y: 0, Z: 0 };

    // Modal state - initialise from machine definition defaults
    this.modals = {};
    if (machDef.modals) {
      for (const [key, grp] of Object.entries(machDef.modals)) {
        this.modals[key] = grp.default;
      }
    }
    // Fallback defaults for sparse machine definitions (e.g. multi-channel presets).
    if (!this.modals.feed)
      this.modals.feed = machDef.class === "lathe" ? "G99" : "G94";
    if (!this.modals.motion) this.modals.motion = "G00";
    if (!this.modals.cutComp) this.modals.cutComp = "G40";
    if (!this.modals.tlLen) this.modals.tlLen = "G49";
    if (!this.modals.absInc) this.modals.absInc = "G90";
    if (!this.modals.workCoord) this.modals.workCoord = "G54";
    // Override plane for lathe
    if (machDef.class === "lathe") this.modals.plane = "G18";
    this.motionMode = this.modals.motion || "G00";

    // Spindle / feed
    this.feed = 0;
    this.rpm = 0;
    this.commandedRPM = 0;
    this.dir = "";
    this.coolant = { flood: false, mist: false, through: false, air: false };
    this.cssMode = false;
    this.cssSpeed = 0;

    // Tool
    this.activeT = 0;
    this.activeH = 0;
    this.activeD = 1; // Siemens cutting edge
    this.pendingT = 0;

    // WCS
    this.activeWCS = "G54";
    this.offsets = {
      G54: { X: 0, Y: 0, Z: 0, A: 0, B: 0, C: 0 },
      G55: { X: 100, Y: 0, Z: 0, A: 0, B: 0, C: 0 },
      G56: { X: 200, Y: 0, Z: 0, A: 0, B: 0, C: 0 },
      G57: { X: 0, Y: 100, Z: 0, A: 0, B: 0, C: 0 },
      G58: { X: 100, Y: 100, Z: 0, A: 0, B: 0, C: 0 },
      G59: { X: 200, Y: 100, Z: 0, A: 0, B: 0, C: 0 },
    };

    // Variables
    this.vars = new Map(); // #100-#999 global-ish macro vars
    this.localVars = [new Map()]; // stack of local var frames (#1-#33)
    this.rVars = new Map(); // Siemens R-vars / Okuma V-vars

    // Control flow
    this.callStack = []; // [{blocks, pointer, returnPtr, loopCount}]
    this.pointer = 0;
    this.blocks = [];
    this.waiting = null; // {type, syncId} when channel is at a wait code
    this.done = false;
    this.error = null;
    this.message = "";
    this.steps = 0;

    // Misc
    this.posMode = "G90"; // G90/G91
    this.diamMode = machDef.class === "lathe"; // X is diameter on lathe
    this.units = "mm";
    this.plane = machDef.class === "lathe" ? "G18" : "G17";
    this.optSkip = false;
    this.blockDelete = false;
    this.home = { X: 0, Y: 0, Z: 0, A: 0, B: 0, C: 0 };
    this.cycleParams = null;
  }

  clone() {
    const c = new ChannelState(
      { id: this.id, label: this.label, tag: this.tag },
      this.machDef,
    );
    Object.assign(
      c,
      JSON.parse(
        JSON.stringify({
          pos: this.pos,
          machinePos: this.machinePos,
          modals: this.modals,
          feed: this.feed,
          rpm: this.rpm,
          commandedRPM: this.commandedRPM,
          dir: this.dir,
          activeT: this.activeT,
          activeH: this.activeH,
          activeD: this.activeD,
          pendingT: this.pendingT,
          activeWCS: this.activeWCS,
          offsets: this.offsets,
          posMode: this.posMode,
          plane: this.plane,
          units: this.units,
          cssMode: this.cssMode,
          cssSpeed: this.cssSpeed,
          diamMode: this.diamMode,
          home: this.home,
          steps: this.steps,
          cycleParams: this.cycleParams,
        }),
      ),
    );
    c.vars = new Map(this.vars);
    c.rVars = new Map(this.rVars);
    c.waiting = this.waiting;
    c.done = this.done;
    c.error = this.error;
    c.message = this.message;
    c.pointer = this.pointer;
    c.blocks = this.blocks;
    c.callStack = this.callStack.map((frame) => ({
      ...frame,
      blocks: frame.blocks,
    }));
    return c;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSER
// ─────────────────────────────────────────────────────────────────────────────

export class GCodeParser {
  constructor(machDef) {
    this.machDef = machDef;
    this.dialect = machDef.dialect || "fanuc";
    this.syntax = machDef.syntax || {};
  }

  parse(src) {
    const lines = src.split("\n");
    const programs = new Map(); // O-number -> [blocks]
    let currentProg = "MAIN";
    programs.set(currentProg, []);

    for (let li = 0; li < lines.length; li++) {
      const raw = lines[li];
      const result = this._parseLine(raw, li);
      if (!result) continue;

      // Detect sub-program start (Fanuc O-number / Siemens SUB name)
      if (result.progId) {
        currentProg = result.progId;
        if (!programs.has(currentProg)) programs.set(currentProg, []);
        continue;
      }

      programs.get(currentProg).push(result);
    }
    return programs;
  }

  _parseLine(raw, lineIndex) {
    const t = raw.trim();
    if (!t || t === "%" || t === ":") return null;

    // Block skip
    let skip = false;
    let rest = t;
    if (rest.startsWith("/")) {
      skip = true;
      rest = rest.slice(1).trim();
    }

    // Check for sub-program declaration (Fanuc O-number at start)
    const oMatch = rest.match(/^O(\d+)/i);
    if (oMatch) {
      return { progId: `O${oMatch[1]}`, raw, skip, lineIndex };
    }

    // Siemens / Okuma program label
    if (this.dialect === "siemens") {
      const lblMatch = rest.match(/^(\w+):\s*$/);
      if (lblMatch) return { label: lblMatch[1], raw, skip, lineIndex };
    }

    // Extract comment
    let cmt = "";
    let clean = rest;
    if (this.syntax.blockComment) {
      const [o, c] = this.syntax.blockComment;
      const cm = rest.match(new RegExp(`\\${o}([^\\${c}]*)\\${c}`));
      if (cm) cmt = cm[1].trim();
      clean = rest
        .replace(new RegExp(`\\${o}[^\\${c}]*\\${c}`, "g"), "")
        .trim();
    }
    if (this.syntax.lineComment) {
      const idx = clean.indexOf(this.syntax.lineComment);
      if (idx >= 0) {
        cmt = cmt || clean.slice(idx + 1).trim();
        clean = clean.slice(0, idx).trim();
      }
    }
    if (!clean && cmt) return { type: "cmt", cmt, raw, skip, lineIndex };
    if (!clean) return null;

    // Sequence number
    const seqRe = this.syntax.seqNumber || /^N(\d+)/i;
    const seqM = clean.match(seqRe);
    const seqN = seqM ? parseInt(seqM[1]) : null;
    const noSeq = seqM ? clean.replace(seqM[0], "").trim() : clean;

    // Channel tag (multi-channel: $1, $2, etc.)
    let channelId = null;
    let noTag = noSeq;
    if (this.syntax.channelTag) {
      const ctm = noSeq.match(this.syntax.channelTag);
      if (ctm) {
        channelId = parseInt(ctm[1]) - 1;
        noTag = noSeq.replace(ctm[0], "").trim();
      }
    }

    // Word parsing
    const words = this._extractWords(noTag);

    // Detect flow-control keywords (Fanuc/HAAS WHILE/DO/END/IF/GOTO + Siemens/Okuma)
    let keyword = null;
    {
      const kw = noTag.match(
        /^(WHILE|ENDWHILE|DO\d*|END\d+|IF|ELSE|ENDIF|GOTOF|GOTOB|GOTO|LOOP|ENDLOOP|REPEAT|UNTIL|CALL|RET|RTS|WAITM|SETM|CLEARM|WBUF|DEF|LIMS)/i,
      );
      if (kw) keyword = kw[1].toUpperCase();
    }

    // Detect wait codes
    const waitCode = this._detectWaitCode(words, noTag);

    return {
      type: "block",
      raw,
      clean: noTag,
      cmt,
      skip,
      seqN,
      lineIndex,
      channelId,
      words,
      keyword,
      waitCode,
    };
  }

  _extractWords(str) {
    const words = {};
    // Handle Siemens assignment syntax: X=R5, Y=R3*COS(R4), etc.
    if (this.dialect === "siemens") {
      const assignRe = /([A-Z])\s*=\s*([^,\s]+)/gi;
      let m;
      while ((m = assignRe.exec(str)) !== null) {
        words[m[1].toUpperCase()] = m[2]; // store as expression string
      }
    }
    // Match word-address + macro variable reference: X#104, Y#105, Z#[expr], etc.
    // Store as expression string so evaluator can resolve at runtime
    const macroWordRe =
      /([A-Za-z])\s*(#(?:\[.*?\]|\d+)(?:\s*[+\-*\/]\s*[#\d.]+)*)/g;
    let mm;
    while ((mm = macroWordRe.exec(str)) !== null) {
      const k = mm[1].toUpperCase();
      if (k === "N" || k === "O") continue; // skip seq/prog numbers
      if (words[k] == null) words[k] = mm[2]; // store expression string
    }
    // Standard word extraction for plain numeric values
    const re = /([A-Za-z])\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      const k = m[1].toUpperCase(),
        v = parseFloat(m[2]);
      if (k === "N" || k === "O") continue;
      if (words[k] == null)
        words[k] = v; // only set if not already set as macro expr
      else if (typeof words[k] === "number") {
        if (!Array.isArray(words[k])) words[k] = [words[k], v];
        else words[k].push(v);
      }
    }
    // T-word lathe format: T0303 → T:3, H:3
    if (words.T != null && this.machDef.class === "lathe") {
      const ts = String(
        typeof words.T === "number" ? words.T | 0 : parseInt(words.T),
      ).padStart(4, "0");
      words._toolNum = parseInt(ts.slice(0, 2)) || parseInt(ts.slice(0, 1));
      words._toolOffset = parseInt(ts.slice(2)) || parseInt(ts.slice(1));
    }
    return words;
  }

  _detectWaitCode(words, str) {
    if (!this.machDef.waitCodes) return null;
    for (const [code, def] of Object.entries(this.machDef.waitCodes)) {
      // M-code wait
      if (code.startsWith("M")) {
        const mVal = parseFloat(code.slice(1));
        const mWords =
          words.M != null ? (Array.isArray(words.M) ? words.M : [words.M]) : [];
        if (mWords.includes(mVal)) {
          return { code, def, syncId: words.P ?? words.Q ?? null };
        }
      }
      // Siemens keyword wait
      if (str.toUpperCase().startsWith(code)) {
        return { code, def, raw: str };
      }
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESSION EVALUATOR (macro variables)
// ─────────────────────────────────────────────────────────────────────────────

class ExpressionEvaluator {
  constructor(channel) {
    this.ch = channel;
  }

  // Resolve a word value — could be plain number or expression string
  resolve(val) {
    if (typeof val === "number") return val;
    if (typeof val !== "string") return null;
    try {
      return this._evalExpr(val);
    } catch (error) {
      this.ch.error = `Invalid macro expression "${val}": ${error.message}`;
      return null;
    }
  }

  _evalExpr(expr) {
    if (typeof expr === "number") return expr;
    const source = String(expr).trim();
    const tokens = [];
    const tokenRe = /\s*(#\[[A-Za-z_][A-Za-z0-9_]*\]|#\d+|#|R\d+|\d*\.\d+(?:E[-+]?\d+)?|\d+(?:\.\d*)?(?:E[-+]?\d+)?|<=|>=|<>|==|!=|[+\-*\/<>=(),\[\]]|[A-Za-z_][A-Za-z0-9_]*)/iy;
    let cursor = 0;
    while (cursor < source.length) {
      tokenRe.lastIndex = cursor;
      const match = tokenRe.exec(source);
      if (!match || match.index !== cursor) {
        throw new Error(`unsupported token at column ${cursor + 1}`);
      }
      tokens.push(match[1]);
      cursor = tokenRe.lastIndex;
    }
    let index = 0;
    const peek = () => tokens[index];
    const take = () => tokens[index++];
    const consume = (value) => {
      if (String(peek()).toUpperCase() === value) {
        index++;
        return true;
      }
      return false;
    };
    const functions = {
      SIN: (x) => Math.sin((x * Math.PI) / 180),
      COS: (x) => Math.cos((x * Math.PI) / 180),
      TAN: (x) => Math.tan((x * Math.PI) / 180),
      ATAN: (x) => (Math.atan(x) * 180) / Math.PI,
      SQRT: (x) => Math.sqrt(x),
      ABS: (x) => Math.abs(x),
      ROUND: (x) => Math.round(x),
      FIX: (x) => Math.trunc(x),
      FUP: (x) => Math.ceil(x),
    };
    let parseOr;
    const parsePrimary = () => {
      const token = take();
      if (token == null) throw new Error("unexpected end of expression");
      if (token === "[" || token === "(") {
        const value = parseOr();
        const close = token === "[" ? "]" : ")";
        if (take() !== close) throw new Error(`missing ${close}`);
        return value;
      }
      if (/^#\d+$/.test(token)) return Number(this.ch.vars.get(Number(token.slice(1))) ?? 0);
      if (token === "#") {
        if (take() !== "[") throw new Error("indirect variable requires brackets");
        const variableId = Math.trunc(parseOr());
        if (take() !== "]") throw new Error("missing ]");
        return Number(this.ch.vars.get(variableId) ?? 0);
      }
      if (/^#\[[A-Za-z_][A-Za-z0-9_]*\]$/.test(token)) {
        const name = token.slice(2, -1).toUpperCase();
        return Number(this.ch.vars.get(`_NAME_${name}`) ?? 0);
      }
      if (/^R\d+$/i.test(token)) return Number(this.ch.rVars.get(Number(token.slice(1))) ?? 0);
      if (/^(?:\d*\.\d+|\d+\.?\d*)(?:E[-+]?\d+)?$/i.test(token)) return Number(token);
      const fn = functions[token.toUpperCase()];
      if (fn) {
        const open = take();
        if (open !== "[" && open !== "(") throw new Error(`${token} requires brackets`);
        const value = parseOr();
        const close = open === "[" ? "]" : ")";
        if (take() !== close) throw new Error(`missing ${close}`);
        const result = fn(value);
        if (!Number.isFinite(result)) throw new Error(`${token} produced a non-finite result`);
        return result;
      }
      throw new Error(`unsupported identifier ${token}`);
    };
    const parseUnary = () => consume("+") ? parseUnary() : consume("-") ? -parseUnary() : consume("NOT") ? (parseUnary() ? 0 : 1) : parsePrimary();
    const parseMul = () => {
      let value = parseUnary();
      while (true) {
        if (consume("*")) value *= parseUnary();
        else if (consume("/")) {
          const divisor = parseUnary();
          if (divisor === 0) throw new Error("division by zero");
          value /= divisor;
        } else if (consume("MOD")) value %= parseUnary();
        else return value;
      }
    };
    const parseAdd = () => {
      let value = parseMul();
      while (true) {
        if (consume("+")) value += parseMul();
        else if (consume("-")) value -= parseMul();
        else return value;
      }
    };
    const parseCompare = () => {
      let value = parseAdd();
      const op = String(peek() ?? "").toUpperCase();
      const comparisons = ["EQ", "NE", "GT", "LT", "GE", "LE", "=", "==", "!=", "<>", ">", "<", ">=", "<="];
      if (!comparisons.includes(op)) return value;
      take();
      const right = parseAdd();
      if (op === "EQ" || op === "=" || op === "==") return value === right ? 1 : 0;
      if (op === "NE" || op === "!=" || op === "<>") return value !== right ? 1 : 0;
      if (op === "GT" || op === ">") return value > right ? 1 : 0;
      if (op === "LT" || op === "<") return value < right ? 1 : 0;
      if (op === "GE" || op === ">=") return value >= right ? 1 : 0;
      return value <= right ? 1 : 0;
    };
    const parseAnd = () => {
      let value = parseCompare();
      while (consume("AND")) {
        const right = parseCompare();
        value = value && right ? 1 : 0;
      }
      return value;
    };
    parseOr = () => {
      let value = parseAnd();
      while (true) {
        if (consume("OR")) {
          const right = parseAnd();
          value = value || right ? 1 : 0;
        }
        else if (consume("XOR")) value = Boolean(value) !== Boolean(parseAnd()) ? 1 : 0;
        else return value;
      }
    };
    const result = parseOr();
    if (index !== tokens.length) throw new Error(`unexpected token ${peek()}`);
    if (!Number.isFinite(result)) throw new Error("non-finite result");
    return Number(result);
  }

  setVar(id, val) {
    if (typeof id === "number") this.ch.vars.set(id, val);
    else this.ch.vars.set(`_NAME_${id.toUpperCase()}`, val);
  }

  getVar(id) {
    if (typeof id === "number") return this.ch.vars.get(id);
    return this.ch.vars.get(`_NAME_${id.toUpperCase()}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-CHANNEL ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export class CNCEngine {
  constructor(machDef) {
    this.machDef = machDef;
    this.channels = machDef.channels.map((cd) => new ChannelState(cd, machDef));
    this.parser = new GCodeParser(machDef);
    this.programs = new Map(); // all programs/subs parsed
    this.syncPoints = new Map(); // syncId -> Set of channelIds waiting
    this.pathPoints = []; // [{x,y,z,m,feed,channelId,bi}]
    this.stats = {
      rapid: 0,
      cut: 0,
      arc: 0,
      tc: 0,
      dist: 0,
      time: 0,
      blocks: 0,
      units: "mm",
    };
    this.backplotPathPoints = [];
    this.backplotStats = {
      rapid: 0,
      cut: 0,
      arc: 0,
      tc: 0,
      dist: 0,
      time: 0,
      blocks: 0,
      units: "mm",
    };
    this.evalors = this.channels.map((ch) => new ExpressionEvaluator(ch));
    this.toolTable = {};
    this.toolUnits = "mm";
    this.diagnostics = [];
    this._maxSteps = 100000; // infinite-loop guard
  }

  setToolTable(toolTable = {}, units = "mm") {
    this.toolTable =
      toolTable && typeof toolTable === "object" ? toolTable : {};
    this.toolUnits = units === "inch" ? "inch" : "mm";
  }

  setWorkOffsets(offsets = {}) {
    for (const ch of this.channels) {
      for (const [key, value] of Object.entries(offsets || {})) {
        if (!value || typeof value !== "object") continue;
        ch.offsets[key] = {
          ...(ch.offsets[key] || {}),
          ...Object.fromEntries(
            Object.entries(value).map(([axis, amount]) => [axis, Number(amount) || 0]),
          ),
        };
      }
    }
  }

  _addDiagnostic(level, message, block = null, channelId = null) {
    const item = {
      level,
      message,
      line: block?.lineIndex != null ? block.lineIndex + 1 : null,
      channelId,
    };
    if (!this.diagnostics.some((d) => d.level === item.level && d.message === item.message && d.line === item.line && d.channelId === item.channelId)) {
      this.diagnostics.push(item);
    }
    return item;
  }

  _selectParsedEntryBlocks(parsed, sourceName = "MAIN") {
    const mainBlocks = parsed.get("MAIN");
    const namedBlocks = parsed.get(sourceName.toUpperCase());
    return (
      (Array.isArray(mainBlocks) && mainBlocks.length ? mainBlocks : null) ||
      (Array.isArray(namedBlocks) && namedBlocks.length ? namedBlocks : null) ||
      [...parsed.values()].find(
        (blocks) => Array.isArray(blocks) && blocks.length > 0,
      ) ||
      []
    );
  }

  // ── Load one or multiple program texts ──────────────────────────────────
  loadPrograms(sources, options = {}) {
    // sources: { main: "...", O9001: "...", ... }  OR  single string
    const srcMap = typeof sources === "string" ? { MAIN: sources } : sources;
    this.programs.clear();
    this.diagnostics = [];
    const explicitChannelBlocks = new Map();

    for (const [name, src] of Object.entries(srcMap)) {
      const parsed = this.parser.parse(src);
      const chMatch = String(name)
        .toUpperCase()
        .match(/^CH(?:ANNEL)?[_-]?(\d+)$/);
      if (chMatch) {
        explicitChannelBlocks.set(
          parseInt(chMatch[1], 10) - 1,
          this._selectParsedEntryBlocks(parsed, name),
        );
      }
      for (const [progId, blocks] of parsed.entries()) {
        this.programs.set(
          progId === "MAIN" ? name.toUpperCase() : progId,
          blocks,
        );
      }
    }

    // Assign main program blocks to channel(s) based on channel tag
    const mainBlocks = this._getMainBlocks();

    if (this.machDef.channels.length === 1) {
      this.channels[0].blocks =
        mainBlocks.get("ALL") || mainBlocks.values().next().value || [];
      this.channels[0].pointer = 0;
    } else {
      // Multi-channel: split by $1/$2/$3 tags
      this._splitChannelBlocks(mainBlocks);
      explicitChannelBlocks.forEach((blocks, idx) => {
        if (this.channels[idx]) {
          this.channels[idx].blocks = blocks || [];
          this.channels[idx].pointer = 0;
        }
      });
    }

    // UI callers may move the expensive full trace to a Web Worker while
    // retaining this parsed engine for interactive single-block execution.
    if (options.buildPath !== false) this._buildFullPath();
  }

  buildFullPath() {
    this._buildFullPath();
    return { pathPoints: this.getPathPoints(), stats: this.getStats(), diagnostics: this.getDiagnostics() };
  }

  // ── Split blocks into channels by tag ────────────────────────────────────
  _getMainBlocks() {
    const mainKey =
      [...this.programs.keys()].find(
        (k) =>
          (k === "MAIN" && this.programs.get(k).length > 0) ||
          k.startsWith("O0000") ||
          k.match(/^O\d{1,4}$/),
      ) || this.programs.keys().next().value;
    const blocks = this.programs.get(mainKey) || [];
    const byChannel = new Map([["ALL", []]]);
    let currentCh = "ALL";
    for (const b of blocks) {
      if (b.channelId != null) {
        const key = `CH${b.channelId}`;
        if (!byChannel.has(key)) byChannel.set(key, []);
        currentCh = key;
      }
      byChannel.get(currentCh).push(b);
    }
    return byChannel;
  }

  _splitChannelBlocks(mainBlocks) {
    // If there are tagged blocks, assign per channel
    const hasTagged = [...mainBlocks.keys()].some((k) => k.startsWith("CH"));
    if (hasTagged) {
      this.channels.forEach((ch, i) => {
        ch.blocks = mainBlocks.get(`CH${i}`) || [];
        ch.pointer = 0;
      });
    } else {
      // No tags: give all channels the same program (parallel mode)
      const all = mainBlocks.get("ALL") || [];
      this.channels.forEach((ch) => {
        ch.blocks = all;
        ch.pointer = 0;
      });
    }
  }

  // ── Build full path (pre-run for backplot) ───────────────────────────────
  _buildFullPath() {
    const recorder = {
      pathPoints: [],
      stats: { rapid: 0, cut: 0, arc: 0, tc: 0, dist: 0, time: 0, blocks: 0, units: "mm" },
    };
    const tempChannels = this.channels.map((ch) => ch.clone());
    const tempEvalors = tempChannels.map((ch) => new ExpressionEvaluator(ch));
    let totalSteps = 0;

    // Run all channels to completion in round-robin with sync handling
    let allDone = false;
    while (!allDone && totalSteps < this._maxSteps) {
      allDone = true;
      for (let ci = 0; ci < tempChannels.length; ci++) {
        const ch = tempChannels[ci];
        if (ch.done || ch.waiting) continue;
        allDone = false;
        this._executeBlock(ch, tempEvalors[ci], true, recorder);
        totalSteps++;
        // Resolve sync
        if (ch.waiting) this._trySyncResolve(tempChannels);
      }
      // Check if all are done or all are waiting (deadlock)
      const waiting = tempChannels.filter(
        (ch) => ch.waiting && !ch.done,
      ).length;
      const done = tempChannels.filter((ch) => ch.done).length;
      if (done === tempChannels.length) allDone = true;
      if (
        waiting === tempChannels.filter((ch) => !ch.done).length &&
        waiting > 0
      )
        break; // deadlock
    }
    if (totalSteps >= this._maxSteps) {
      this._addDiagnostic("error", `Execution limit of ${this._maxSteps} blocks exceeded while building the toolpath`);
    }
    if (!allDone && tempChannels.some((ch) => ch.waiting && !ch.done)) {
      this._addDiagnostic("error", "Channel synchronization deadlock while building the toolpath");
    }
    recorder.stats.units = tempChannels[0]?.units || "mm";
    this.backplotPathPoints = recorder.pathPoints;
    this.backplotStats = recorder.stats;
  }

  // ── Single step (for interactive playback) ───────────────────────────────
  stepChannel(channelId = 0) {
    const ch = this.channels[channelId];
    const ev = this.evalors[channelId];
    if (ch.done || ch.waiting) return { done: ch.done, waiting: ch.waiting };
    this._executeBlock(ch, ev, false, null);
    this._trySyncResolve(this.channels);
    return {
      done: ch.done,
      error: ch.error,
      waiting: ch.waiting,
      state: this._getChannelSnapshot(ch),
    };
  }

  stepAll() {
    // Step all non-waiting, non-done channels
    for (let ci = 0; ci < this.channels.length; ci++) {
      const ch = this.channels[ci];
      if (!ch.done && !ch.waiting) {
        this._executeBlock(ch, this.evalors[ci], false, null);
      }
    }
    this._trySyncResolve(this.channels);
    return this.channels.map((ch) => this._getChannelSnapshot(ch));
  }

  reset() {
    this.channels = this.machDef.channels.map(
      (cd) => new ChannelState(cd, this.machDef),
    );
    this.evalors = this.channels.map((ch) => new ExpressionEvaluator(ch));
    this.syncPoints.clear();
    this.pathPoints = [];
    this.stats = {
      rapid: 0,
      cut: 0,
      arc: 0,
      tc: 0,
      dist: 0,
      time: 0,
      blocks: 0,
      units: "mm",
    };
    // Reload blocks
    const mainBlocks = this._getMainBlocks();
    this._splitChannelBlocks(mainBlocks);
    this._buildFullPath();
  }

  // ── Execute one block on a channel ───────────────────────────────────────
  _executeBlock(ch, ev, pathOnly, recorder = null) {
    ch.steps = (ch.steps || 0) + 1;
    if (ch.steps > this._maxSteps) {
      ch.error = `Execution limit of ${this._maxSteps} blocks exceeded`;
      ch.done = true;
      this._addDiagnostic("error", ch.error, null, ch.id);
      return;
    }
    const blks = ch.callStack.length
      ? ch.callStack[ch.callStack.length - 1].blocks
      : ch.blocks;
    const ptr = ch.callStack.length
      ? ch.callStack[ch.callStack.length - 1].pointer
      : ch.pointer;

    if (ptr >= blks.length) {
      // Return from sub if on call stack
      if (ch.callStack.length) {
        const frame = ch.callStack.pop();
        if (ch.callStack.length) {
          ch.callStack[ch.callStack.length - 1].pointer = frame.returnPtr;
        } else {
          ch.pointer = frame.returnPtr;
        }
        return;
      }
      ch.done = true;
      return;
    }

    const b = blks[ptr];
    b._ptr = ptr;
    // Advance pointer
    if (ch.callStack.length) {
      ch.callStack[ch.callStack.length - 1].pointer = ptr + 1;
    } else {
      ch.pointer = ptr + 1;
    }

    if (!b || b.type === "cmt") return;
    if (b.skip && ch.optSkip) return;
    if (recorder) recorder.stats.blocks++;

    // Comment-only
    if (!b.words && !b.keyword) {
      if (b.cmt) ch.message = b.cmt;
      return;
    }

    const w = b.words || {};

    // ── Wait code ──────────────────────────────────────────────────────────
    if (b.waitCode) {
      ch.waiting = { ...b.waitCode, channelId: ch.id };
      return;
    }

    // ── Siemens / Okuma keywords ───────────────────────────────────────────
    if (b.keyword) {
      this._execKeyword(ch, ev, b, blks, pathOnly, recorder);
      return;
    }

    // ── Variable assignment (#100 = ...) ──────────────────────────────────
    const assignMatch = (b.clean || "").match(/^#(\d+)\s*=\s*(.+)$/);
    if (assignMatch) {
      try {
        ch.vars.set(parseInt(assignMatch[1]), ev._evalExpr(assignMatch[2]));
      } catch (error) {
        ch.error = `Invalid macro expression on line ${b.lineIndex + 1}: ${error.message}`;
        this._addDiagnostic("error", ch.error, b, ch.id);
      }
      return;
    }
    const namedAssign = (b.clean || "").match(/^#\[([^\]]+)\]\s*=\s*(.+)$/i);
    if (namedAssign) {
      try {
        ev.setVar(namedAssign[1], ev._evalExpr(namedAssign[2]));
      } catch (error) {
        ch.error = `Invalid macro expression on line ${b.lineIndex + 1}: ${error.message}`;
        this._addDiagnostic("error", ch.error, b, ch.id);
      }
      return;
    }
    // Siemens R-var: R10=3.14
    if (ch.machDef.dialect === "siemens") {
      const rAssign = (b.clean || "").match(/^R(\d+)\s*=\s*(.+)$/i);
      if (rAssign) {
        try {
          ch.rVars.set(parseInt(rAssign[1]), ev._evalExpr(rAssign[2]));
        } catch (error) {
          ch.error = `Invalid macro expression on line ${b.lineIndex + 1}: ${error.message}`;
          this._addDiagnostic("error", ch.error, b, ch.id);
        }
        return;
      }
    }

    // ── G-codes ───────────────────────────────────────────────────────────
    const gs = this._gList(w);
    const ms2 = this._mList(w);

    for (const g of gs) {
      this._applyGCode(ch, ev, g, w, b);
    }

    // ── M-codes ───────────────────────────────────────────────────────────
    for (const m of ms2) {
      const stop = this._applyMCode(ch, ev, m, w, pathOnly, recorder);
      if (stop) return; // M98 sub call handled, return early
    }

    // ── T-word (lathe: T0303) ─────────────────────────────────────────────
    if (w.T != null) {
      if (ch.machDef.class === "lathe" && w._toolNum != null) {
        ch.activeT = w._toolNum;
        ch.activeH = w._toolOffset;
        ch.pendingT = w._toolNum;
      } else if (!ms2.includes(6)) {
        ch.pendingT = w.T;
      } else {
        ch.pendingT = w.T;
      }
    }

    // ── Siemens D-word ────────────────────────────────────────────────────
    if (w.D != null) ch.activeD = w.D;

    // ── F S H ─────────────────────────────────────────────────────────────
    if (w.F != null) {
      const feed = ev.resolve(w.F);
      if (feed != null) ch.feed = feed;
      else this._addDiagnostic("error", ch.error || `Invalid feed expression on line ${b.lineIndex + 1}`, b, ch.id);
    }
    if (w.S != null) {
      const commanded = ev.resolve(w.S);
      if (commanded != null) {
        ch.commandedRPM = commanded;
        if (ch.dir) ch.rpm = commanded;
      }
    }
    if (w.S != null && ch.cssMode) ch.cssSpeed = ev.resolve(w.S) ?? w.S;
    if (w.H != null && !gs.includes(43) && !gs.includes(44)) ch.activeH = w.H;

    // ── Motion ────────────────────────────────────────────────────────────
    this._applyMotion(ch, ev, w, b, pathOnly, recorder);
  }

  _applyGCode(ch, ev, g, w, b) {
    const g2 = Math.round(g * 10) / 10; // handle G43.1, G54.1 etc
    switch (Math.floor(g2)) {
      case 0:
        ch.motionMode = "G00";
        break;
      case 1:
        ch.motionMode = "G01";
        break;
      case 2:
        ch.motionMode = "G02";
        break;
      case 3:
        ch.motionMode = "G03";
        break;
      case 17:
        ch.plane = "G17";
        break;
      case 18:
        ch.plane = "G18";
        break;
      case 19:
        ch.plane = "G19";
        break;
      case 20:
        ch.units = "inch";
        break;
      case 21:
        ch.units = "mm";
        break;
      case 40:
        ch.modals.cutComp = "G40";
        break;
      case 41:
        ch.modals.cutComp = "G41";
        break;
      case 42:
        ch.modals.cutComp = "G42";
        break;
      case 43:
        ch.modals.tlLen = "G43";
        if (w.H != null) ch.activeH = w.H;
        break;
      case 44:
        ch.modals.tlLen = "G44";
        break;
      case 49:
        ch.modals.tlLen = "G49";
        break;
      case 50:
        if (w.S != null) ch.cssSpeedMax = w.S;
        break; // G50 spindle clamp (lathe) or scale (HAAS)
      case 52:
        this._addDiagnostic("warn", "G52 local coordinate shifts are not yet simulated", b, ch.id);
        break;
      case 53:
        b._machineCoord = true;
        break;
      case 54:
        ch.activeWCS = "G54";
        break;
      case 55:
        ch.activeWCS = "G55";
        break;
      case 56:
        ch.activeWCS = "G56";
        break;
      case 57:
        ch.activeWCS = "G57";
        break;
      case 58:
        ch.activeWCS = "G58";
        break;
      case 59:
        ch.activeWCS = "G59";
        break;
      case 70:
        if (ch.machDef.class === "lathe") ch.motionMode = "G70";
        break; // finish cycle
      case 71:
        ch.motionMode = "G71";
        break; // rough OD
      case 72:
        ch.motionMode = "G72";
        break; // rough face
      case 73:
        ch.motionMode = "G73";
        break; // pattern repeat
      case 74:
        ch.motionMode = "G74";
        break; // peck face drill
      case 75:
        ch.motionMode = "G75";
        break; // peck groove
      case 76:
        ch.motionMode = "G76";
        break; // threading
      case 80:
        ch.motionMode = "G80";
        ch.modals.cycle = "G80";
        ch.cycleParams = null;
        break;
      case 81:
      case 82:
      case 83:
      case 84:
      case 85:
      case 86:
      case 87:
      case 88:
      case 89:
        ch.motionMode = `G${Math.floor(g2)}`;
        ch.modals.cycle = ch.motionMode;
        break;
      case 90:
        ch.posMode = "G90";
        break;
      case 91:
        ch.posMode = "G91";
        break;
      case 92:
        if (w.S != null) ch.cssSpeedMax = w.S;
        break; // spindle clamp
      case 94:
        ch.modals.feed = "G94";
        break;
      case 95:
        ch.modals.feed = "G95";
        break;
      case 96:
        ch.cssMode = true;
        if (w.S != null) ch.cssSpeed = w.S;
        break;
      case 97:
        ch.cssMode = false;
        if (w.S != null) ch.commandedRPM = ev.resolve(w.S) ?? ch.commandedRPM;
        if (ch.dir) ch.rpm = ch.commandedRPM;
        break;
      case 98:
        if (ch.machDef.class === "lathe") ch.modals.feed = "G98";
        else ch.modals.retPlane = "G98";
        break;
      case 99:
        if (ch.machDef.class === "lathe") ch.modals.feed = "G99";
        else ch.modals.retPlane = "G99";
        break;
      case 28: // G28 return to reference
        b._returnHome = true;
        break;
    }
    // Siemens units
    if (ch.machDef.dialect === "siemens") {
      if (g2 === 70) ch.units = "inch";
      if (g2 === 71) ch.units = "mm";
    }
  }

  _applyMCode(ch, ev, m, w, pathOnly, recorder = null) {
    const def = ch.machDef.mCodes || {};
    const match = (arr) => {
      if (!Array.isArray(arr)) return false;
      return arr.some((code) => {
        const n = Number(String(code).replace(/[^0-9.+-]/g, ""));
        return Number.isFinite(n) && n === Number(m);
      });
    };

    if (match(def.spindleCW)) {
      ch.dir = "CW";
      if (w.S != null) ch.commandedRPM = ev.resolve(w.S) ?? ch.commandedRPM;
      ch.rpm = ch.commandedRPM;
    }
    if (match(def.spindleCCW)) {
      ch.dir = "CCW";
      if (w.S != null) ch.commandedRPM = ev.resolve(w.S) ?? ch.commandedRPM;
      ch.rpm = ch.commandedRPM;
    }
    if (match(def.spindleStop)) {
      ch.dir = "";
      ch.rpm = 0;
    }
    if (match(def.liveToolCW)) {
      ch.liveDir = "CW";
      if (w.S != null) ch.liveRPM = w.S;
    }
    if (match(def.liveToolCCW)) {
      ch.liveDir = "CCW";
      if (w.S != null) ch.liveRPM = w.S;
    }
    if (match(def.liveToolStop)) {
      ch.liveDir = "";
    }
    if (match(def.coolantFlood)) {
      ch.coolant.flood = true;
    }
    if (match(def.coolantMist)) {
      ch.coolant.mist = true;
    }
    if (match(def.coolantThru)) {
      ch.coolant.through = true;
    }
    if (match(def.coolantAir)) {
      ch.coolant.air = true;
    }
    if (match(def.coolantOff)) {
      ch.coolant = { flood: false, mist: false, through: false, air: false };
    }
    if (match(def.toolChange)) {
      if (w.T != null) {
        ch.activeT = w.T;
        ch.activeH = w.T;
        ch.pendingT = w.T;
      } else if (ch.pendingT != null) {
        ch.activeT = ch.pendingT;
        ch.activeH = ch.pendingT;
      }
      if (recorder) recorder.stats.tc++;
    }
    if (match(def.spindleOrient)) {
      /* no-op */
    }

    if (match(def.programStop)) {
      ch.waiting = { type: "M00" };
    }
    if (match(def.optionalStop) && ch.optSkip) {
      /* skip */
    }
    if (match(def.programEnd)) {
      ch.done = true;
      return true;
    }

    // Sub call (M98/M97/CALL)
    if (match(def.subCall)) {
      if (w.P != null && !pathOnly) {
        this._callSub(ch, w.P, w.L || 1);
        return true;
      }
      if (w.P != null && pathOnly) {
        // In path-build mode, inline the sub
        this._inlineSubPath(ch, ev, w.P, w.L || 1, recorder);
        return true;
      }
    }
    if (match(def.subReturn)) {
      this._returnFromSub(ch);
      return true;
    }
    return false;
  }

  _applyMotion(ch, ev, w, b, pathOnly, recorder = null) {
    const mode = ch.motionMode;
    const abs = ch.posMode === "G90";
    const shouldRecordPath = Boolean(recorder);
    const activeOffset = ch.offsets[ch.activeWCS] || { X: 0, Y: 0, Z: 0 };
    const av = (axis, cur, v) => {
      const resolved = ev.resolve(v);
      if (resolved == null || !Number.isFinite(Number(resolved))) {
        this._addDiagnostic("error", ch.error || `Invalid ${axis} expression on line ${b.lineIndex + 1}`, b, ch.id);
        return cur;
      }
      if (b?._machineCoord) return Number(resolved) - Number(activeOffset[axis] || 0);
      return abs ? Number(resolved) : cur + Number(resolved);
    };

    const hasXYZ = w.X != null || w.Y != null || w.Z != null;
    const isArcMode = mode === "G02" || mode === "G03";
    const hasArcCenterWords =
      w.I != null || w.J != null || w.K != null || w.R != null;
    const hasArcMotion = isArcMode && (hasXYZ || hasArcCenterWords);
    const cycleModes = [
      "G81",
      "G82",
      "G83",
      "G84",
      "G85",
      "G86",
      "G87",
      "G88",
      "G89",
      "G74",
      "G75",
      "G76",
    ];
    const cycleCommand = this._gList(w).some((g) => cycleModes.includes(`G${Math.floor(g)}`));
    const hasCyc = cycleModes.includes(mode) && (hasXYZ || cycleCommand);

    if (!hasXYZ && !hasCyc && !hasArcMotion && !b?._returnHome) return;

    let nx = w.X != null ? av("X", ch.pos.X, w.X) : ch.pos.X;
    let ny = w.Y != null ? av("Y", ch.pos.Y, w.Y) : ch.pos.Y;
    let nz = w.Z != null ? av("Z", ch.pos.Z, w.Z) : ch.pos.Z;
    if (w.B != null) ch.pos.B = av("B", ch.pos.B, w.B);
    if (w.C != null) ch.pos.C = av("C", ch.pos.C, w.C);

    if (hasCyc) {
      if (cycleCommand) {
        const rValue = w.R != null ? ev.resolve(w.R) : null;
        ch.cycleParams = {
          depth: nz,
          r: rValue == null ? ch.pos.Z + 3 : ch.posMode === "G90" ? rValue : ch.pos.Z + rValue,
          q: w.Q != null ? Math.abs(Number(ev.resolve(w.Q))) : null,
          initialZ: ch.pos.Z,
        };
      } else if (ch.cycleParams?.depth != null) {
        nz = ch.cycleParams.depth;
      }
    }

    if (b?._returnHome) {
      if (shouldRecordPath && hasXYZ) this._addPathPoint(ch, nx, ny, nz, "G00", b, recorder);
      ch.pos.X = nx;
      ch.pos.Y = ny;
      ch.pos.Z = nz;
      nx = Number(ch.home.X || 0) - Number(activeOffset.X || 0);
      ny = Number(ch.home.Y || 0) - Number(activeOffset.Y || 0);
      nz = Number(ch.home.Z || 0) - Number(activeOffset.Z || 0);
      if (shouldRecordPath) this._addPathPoint(ch, nx, ny, nz, "G00", b, recorder);
    }

    let cycleEndZ = nz;
    if (!b?._returnHome && shouldRecordPath && (mode === "G00" || mode === "G01")) {
      this._addPathPoint(ch, nx, ny, nz, mode, b, recorder);
    } else if (shouldRecordPath && isArcMode) {
      this._addArcPath(ch, ev, w, nx, ny, nz, mode, b, recorder);
    } else if (shouldRecordPath && hasCyc) {
      cycleEndZ = this._addCyclePoints(ch, ev, w, nx, ny, nz, mode, b, recorder);
    } else if (!shouldRecordPath && hasCyc) {
      const retractPlane = ch.cycleParams?.r ?? ch.pos.Z + 3;
      const peck = w.Q != null ? Math.abs(Number(ev.resolve(w.Q))) : ch.cycleParams?.q;
      if (mode === "G83" && !(peck > 0)) {
        ch.error = `G83 requires a positive Q peck amount on line ${b.lineIndex + 1}`;
        this._addDiagnostic("error", ch.error, b, ch.id);
      }
      cycleEndZ = ch.modals?.retPlane === "G98" ? (ch.cycleParams?.initialZ ?? ch.pos.Z) : retractPlane;
    }

    ch.pos.X = nx;
    ch.pos.Y = ny;
    ch.pos.Z = hasCyc ? cycleEndZ : nz;
    const off = activeOffset;
    ch.machinePos = {
      X: nx + (off.X || 0),
      Y: ny + (off.Y || 0),
      Z: ch.pos.Z + (off.Z || 0),
    };

    // Update system vars
    ch.vars.set(5041, ch.pos.X);
    ch.vars.set(5042, ch.pos.Y);
    ch.vars.set(5043, ch.pos.Z);
  }

  _addPathPoint(ch, x, y, z, mode, b, recorder) {
    const d = Math.sqrt(
      (x - ch.pos.X) ** 2 + (y - ch.pos.Y) ** 2 + (z - ch.pos.Z) ** 2,
    );
    const spd = this._effectiveFeedRate(ch, mode);
    const comp = this._applyCutterComp(
      ch,
      { x, y, z },
      { x: ch.pos.X, y: ch.pos.Y, z: ch.pos.Z },
    );
    recorder.stats.dist += d;
    if (spd > 0) recorder.stats.time += (d / spd) * 60;
    if (mode === "G00") recorder.stats.rapid++;
    else recorder.stats.cut++;
    recorder.pathPoints.push({
      x: comp.x,
      y: comp.y,
      z: comp.z,
      m: mode,
      channelId: ch.id,
      feed: ch.feed,
      tool: ch.activeT,
      bi: b?._ptr,
      cutComp: ch.modals?.cutComp || "G40",
    });
  }

  _effectiveFeedRate(ch, mode = "G01") {
    if (mode === "G00") return 8000;
    const programmedFeed = Number(ch.feed || 0);
    if (programmedFeed <= 0) return 0;
    const feedMode = ch.modals?.feed;
    // G95/G99 are feed-per-revolution modes and must be converted using RPM.
    if (feedMode === "G95" || feedMode === "G99") {
      const rpm = Math.abs(Number(ch.rpm || 0));
      return rpm > 0 ? programmedFeed * rpm : programmedFeed;
    }
    return programmedFeed;
  }

  _toolRadiusInProgramUnits(ch) {
    const t = this.toolTable?.[ch.activeT] || null;
    let radius = 0;
    if (ch.machDef.class === "lathe") {
      radius = Number(t?.cr ?? 0);
    } else {
      const dia = Number(t?.dia ?? 0);
      radius = dia > 0 ? dia / 2 : Number(t?.cr ?? 0);
    }

    if (!(radius > 0)) {
      const fallback = Number(ch.activeD || 0);
      if (fallback > 0 && fallback < 50) radius = fallback;
    }
    const wearR = Number(t?.wearR ?? 0);
    if (Number.isFinite(wearR)) radius += wearR;
    if (!(radius > 0)) return 0;
    const sourceUnits = t?.geometryUnits === "inch" || t?.geometryUnits === "mm"
      ? t.geometryUnits
      : this.toolUnits;
    if (sourceUnits === ch.units) return radius;
    return sourceUnits === "inch" ? radius * 25.4 : radius / 25.4;
  }

  _applyCutterComp(ch, target, start = null) {
    const compMode = ch.modals?.cutComp || "G40";
    if (compMode !== "G41" && compMode !== "G42") return target;
    const radius = this._toolRadiusInProgramUnits(ch);
    if (!(radius > 0)) {
      ch.message = `Cutter comp ${compMode} active with zero radius on T${ch.activeT || 0}`;
      return target;
    }
    const side = compMode === "G41" ? 1 : -1;
    const plane = ch.plane || "G17";
    const s = start || target;
    const dx = (target.x ?? 0) - (s.x ?? 0);
    const dy = (target.y ?? 0) - (s.y ?? 0);
    const dz = (target.z ?? 0) - (s.z ?? 0);

    if (plane === "G18") {
      const len = Math.hypot(dx, dz);
      if (len < 1e-9) return target;
      const ux = dx / len;
      const uz = dz / len;
      return {
        x: (target.x ?? 0) + -uz * side * radius,
        y: target.y ?? 0,
        z: (target.z ?? 0) + ux * side * radius,
      };
    }

    if (plane === "G19") {
      const len = Math.hypot(dy, dz);
      if (len < 1e-9) return target;
      const uy = dy / len;
      const uz = dz / len;
      return {
        x: target.x ?? 0,
        y: (target.y ?? 0) + -uz * side * radius,
        z: (target.z ?? 0) + uy * side * radius,
      };
    }

    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return target;
    const ux = dx / len;
    const uy = dy / len;
    return {
      x: (target.x ?? 0) + -uy * side * radius,
      y: (target.y ?? 0) + ux * side * radius,
      z: target.z ?? 0,
    };
  }

  _addArcPath(ch, ev, w, nx, ny, nz, mode, b, recorder) {
    const plane = ch.plane || "G17";
    const config = plane === "G18"
      ? { u: "Z", v: "X", w: "Y", cu: "K", cv: "I" }
      : plane === "G19"
        ? { u: "Y", v: "Z", w: "X", cu: "J", cv: "K" }
        : { u: "X", v: "Y", w: "Z", cu: "I", cv: "J" };
    const start = { X: ch.pos.X, Y: ch.pos.Y, Z: ch.pos.Z };
    const end = { X: nx, Y: ny, Z: nz };
    const su = start[config.u], sv = start[config.v], sw = start[config.w];
    const eu = end[config.u], evv = end[config.v], ew = end[config.w];
    let centerU = su + (ev.resolve(w[config.cu]) ?? 0);
    let centerV = sv + (ev.resolve(w[config.cv]) ?? 0);
    const sweepForCenter = (cu, cv) => {
      const a0 = Math.atan2(sv - cv, su - cu);
      const a1 = Math.atan2(evv - cv, eu - cu);
      let sweep = a1 - a0;
      if (mode === "G02" && sweep >= 0) sweep -= 2 * Math.PI;
      if (mode === "G03" && sweep <= 0) sweep += 2 * Math.PI;
      return { a0, sweep };
    };
    let angles;
    if (w.R != null) {
      const programmedR = ev.resolve(w.R);
      const radius = Math.abs(Number(programmedR));
      const du = eu - su, dv = evv - sv;
      const chord = Math.hypot(du, dv);
      if (!(radius > 0) || chord < 1e-9 || radius + 1e-6 < chord / 2) {
        ch.error = `Invalid R arc on line ${b.lineIndex + 1}`;
        this._addDiagnostic("error", ch.error, b, ch.id);
        this._addPathPoint(ch, nx, ny, nz, "G01", b, recorder);
        return;
      }
      const h = Math.sqrt(Math.max(0, radius ** 2 - (chord / 2) ** 2));
      const midU = (su + eu) / 2, midV = (sv + evv) / 2;
      const pu = -dv / chord, pv = du / chord;
      const candidates = [
        { u: midU + pu * h, v: midV + pv * h },
        { u: midU - pu * h, v: midV - pv * h },
      ].map((center) => ({ ...center, ...sweepForCenter(center.u, center.v) }));
      const wantsMajor = Number(programmedR) < 0;
      const selected = candidates.find((candidate) => wantsMajor ? Math.abs(candidate.sweep) >= Math.PI - 1e-9 : Math.abs(candidate.sweep) <= Math.PI + 1e-9) || candidates[0];
      centerU = selected.u;
      centerV = selected.v;
      angles = selected;
    } else {
      angles = sweepForCenter(centerU, centerV);
      const hasPlaneEnd = w[config.u] != null || w[config.v] != null;
      if (!hasPlaneEnd && (w[config.cu] != null || w[config.cv] != null)) {
        angles.sweep = mode === "G02" ? -2 * Math.PI : 2 * Math.PI;
      }
    }
    const radius = Math.hypot(su - centerU, sv - centerV);
    if (!(radius > 1e-9)) {
      ch.error = `Arc radius is zero on line ${b.lineIndex + 1}`;
      this._addDiagnostic("error", ch.error, b, ch.id);
      this._addPathPoint(ch, nx, ny, nz, "G01", b, recorder);
      return;
    }
    const steps = Math.min(10000, Math.max(8, Math.ceil((Math.abs(angles.sweep) * radius) / 2)));
    const spd = this._effectiveFeedRate(ch, mode);
    let previous = { x: start.X, y: start.Y, z: start.Z };
    recorder.stats.arc++;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const angle = angles.a0 + angles.sweep * t;
      const point = { X: start.X, Y: start.Y, Z: start.Z };
      point[config.u] = s === steps ? eu : centerU + radius * Math.cos(angle);
      point[config.v] = s === steps ? evv : centerV + radius * Math.sin(angle);
      point[config.w] = sw + (ew - sw) * t;
      const raw = { x: point.X, y: point.Y, z: point.Z };
      const distance = Math.hypot(raw.x - previous.x, raw.y - previous.y, raw.z - previous.z);
      recorder.stats.dist += distance;
      if (spd > 0) recorder.stats.time += (distance / spd) * 60;
      const comp = this._applyCutterComp(ch, raw, previous);
      recorder.pathPoints.push({
        x: comp.x,
        y: comp.y,
        z: comp.z,
        m: mode,
        channelId: ch.id,
        feed: ch.feed,
        tool: ch.activeT,
        bi: b?._ptr,
        cutComp: ch.modals?.cutComp || "G40",
      });
      previous = raw;
    }
  }

  _addCyclePoints(ch, ev, w, nx, ny, nz, mode, b, recorder) {
    const initialZ = ch.pos.Z;
    const rz = ch.cycleParams?.r ?? initialZ + 3;
    const retractZ = ch.modals?.retPlane === "G98" ? (ch.cycleParams?.initialZ ?? initialZ) : rz;
    const bi = b?._ptr;
    let previous = { x: ch.pos.X, y: ch.pos.Y, z: initialZ };
    const pushMove = (x, y, z, motion) => {
      const distance = Math.hypot(x - previous.x, y - previous.y, z - previous.z);
      const speed = this._effectiveFeedRate(ch, motion);
      recorder.stats.dist += distance;
      if (speed > 0) recorder.stats.time += (distance / speed) * 60;
      if (motion === "G00") recorder.stats.rapid++;
      else recorder.stats.cut++;
      recorder.pathPoints.push({
        x, y, z, m: motion, channelId: ch.id,
        feed: motion === "G00" ? 0 : ch.feed,
        tool: ch.activeT, bi,
      });
      previous = { x, y, z };
    };
    pushMove(nx, ny, rz, "G00");
    if (mode === "G83") {
      const q = w.Q != null ? Math.abs(Number(ev.resolve(w.Q))) : ch.cycleParams?.q;
      if (!(q > 0)) {
        ch.error = `G83 requires a positive Q peck amount on line ${b.lineIndex + 1}`;
        this._addDiagnostic("error", ch.error, b, ch.id);
        pushMove(nx, ny, retractZ, "G00");
        return retractZ;
      }
      const direction = Math.sign(nz - rz);
      let currentZ = rz;
      let pecks = 0;
      while (Math.abs(nz - currentZ) > 1e-9 && pecks++ < 10000) {
        const nextZ = direction > 0 ? Math.min(nz, currentZ + q) : Math.max(nz, currentZ - q);
        pushMove(nx, ny, nextZ, "G01");
        currentZ = nextZ;
        if (Math.abs(nz - currentZ) > 1e-9) pushMove(nx, ny, rz, "G00");
      }
      if (pecks >= 10000) {
        ch.error = `G83 peck limit exceeded on line ${b.lineIndex + 1}`;
        this._addDiagnostic("error", ch.error, b, ch.id);
      }
    } else if (mode === "G76" && ch.machDef.class === "lathe") {
      for (let pass = 0; pass < 3; pass++) {
        pushMove(nx, ny, nz, "G32");
        if (pass < 2) pushMove(nx, ny, rz, "G00");
      }
    } else {
      pushMove(nx, ny, nz, "G01");
    }
    pushMove(nx, ny, retractZ, "G00");
    return retractZ;
  }

  // ── Sub-program call / return ────────────────────────────────────────────
  _callSub(ch, progNum, repeat) {
    const key = `O${progNum}`;
    let subBlocks = this.programs.get(key);

    // Fanuc same-file sub: look for N<progNum> label within the calling program
    if (!subBlocks) {
      const mainBlocks = ch.callStack.length
        ? ch.callStack[ch.callStack.length - 1].blocks
        : ch.blocks;
      const labelIdx = mainBlocks.findIndex((b) => b?.seqN === progNum);
      if (labelIdx >= 0) {
        // Slice from the N-label up to (but not including) the next M99
        const subSlice = [];
        for (let i = labelIdx; i < mainBlocks.length; i++) {
          const b = mainBlocks[i];
          subSlice.push(b);
          // Stop at M99 (include it so _returnFromSub fires)
          if (b?.words?.M != null) {
            const ms = Array.isArray(b.words.M) ? b.words.M : [b.words.M];
            if (ms.includes(99)) break;
          }
        }
        subBlocks = subSlice;
      }
    }

    if (!subBlocks) {
      ch.error = `Sub O${progNum} not found`;
      this._addDiagnostic("error", ch.error, null, ch.id);
      return;
    }
    const returnPtr = ch.callStack.length
      ? ch.callStack[ch.callStack.length - 1].pointer
      : ch.pointer;
    ch.callStack.push({
      blocks: subBlocks,
      pointer: 0,
      returnPtr,
      repeat,
      loopCount: 0,
    });
  }

  _returnFromSub(ch) {
    if (!ch.callStack.length) {
      ch.done = true;
      return;
    }
    const frame = ch.callStack[ch.callStack.length - 1];
    frame.loopCount++;
    if (frame.loopCount < frame.repeat) {
      frame.pointer = 0; // repeat
    } else {
      ch.callStack.pop();
    }
  }

  _inlineSubPath(ch, ev, progNum, repeat, recorder) {
    const key = `O${progNum}`;
    let subBlocks = this.programs.get(key);

    // Same-file N-label fallback
    if (!subBlocks) {
      const mainBlocks = ch.callStack.length
        ? ch.callStack[ch.callStack.length - 1].blocks
        : ch.blocks;
      const labelIdx = mainBlocks.findIndex((b) => b?.seqN === progNum);
      if (labelIdx >= 0) {
        subBlocks = [];
        for (let i = labelIdx; i < mainBlocks.length; i++) {
          subBlocks.push(mainBlocks[i]);
          const b = mainBlocks[i];
          if (b?.words?.M != null) {
            const ms = Array.isArray(b.words.M) ? b.words.M : [b.words.M];
            if (ms.includes(99)) break;
          }
        }
      }
    }

    if (!subBlocks) {
      ch.error = `Sub O${progNum} not found`;
      this._addDiagnostic("error", ch.error, null, ch.id);
      return;
    }
    const tempCh = ch.clone();
    const tempEv = new ExpressionEvaluator(tempCh);
    tempCh.blocks = subBlocks;
    tempCh.callStack = [];
    if (repeat > 50) {
      this._addDiagnostic("warn", `Backplot repeat count for O${progNum} was limited to 50`, null, ch.id);
    }
    for (let r = 0; r < Math.min(repeat, 50); r++) {
      tempCh.pointer = 0;
      tempCh.done = false;
      for (const b of subBlocks) {
        if (!b || b.type === "cmt") continue;
        this._executeBlock(tempCh, tempEv, true, recorder);
        if (tempCh.done) break;
      }
    }
    Object.assign(ch.pos, tempCh.pos);
    ch.motionMode = tempCh.motionMode;
    ch.posMode = tempCh.posMode;
    ch.plane = tempCh.plane;
    ch.feed = tempCh.feed;
    ch.rpm = tempCh.rpm;
    ch.commandedRPM = tempCh.commandedRPM;
    ch.activeT = tempCh.activeT;
    ch.activeH = tempCh.activeH;
    ch.vars = new Map(tempCh.vars);
  }

  // ── Siemens / Okuma keywords ─────────────────────────────────────────────
  _execKeyword(ch, ev, b, blks, pathOnly, recorder = null) {
    const kw = b.keyword;
    const line = b.clean || "";

    if (kw === "WHILE") {
      // Fanuc: WHILE [cond] DO1  / Siemens: WHILE cond
      const condMatch = line.match(
        /^WHILE\s*(?:\[(.+?)\]|(.+?))(?:\s*DO\d*)?$/i,
      );
      if (condMatch) {
        try {
          const condExpr = (condMatch[1] ?? condMatch[2] ?? "").trim();
          const cond = ev._evalExpr(condExpr.replace(/\[|\]/g, ""));
          if (!cond) {
            const ptr = ch.callStack.length
              ? ch.callStack[ch.callStack.length - 1].pointer
              : ch.pointer;
            this._skipToMatchingLoopEnd(ch, blks, Math.max(0, ptr - 1));
          }
        } catch (error) {
          ch.error = `Invalid WHILE expression on line ${b.lineIndex + 1}: ${error.message}`;
          this._addDiagnostic("error", ch.error, b, ch.id);
        }
      }
    }

    // Fanuc DO1 / END1 — loop markers (the actual loop-back on END)
    if (
      kw &&
      kw.startsWith("END") &&
      (/^END\d+$/.test(kw) || kw === "ENDWHILE" || kw === "ENDLOOP")
    ) {
      const ptr = ch.callStack.length
        ? ch.callStack[ch.callStack.length - 1].pointer
        : ch.pointer;
      this._jumpBackToLoopStart(ch, blks, Math.max(0, ptr - 2));
      return;
    }

    // Fanuc DO1 alone acts as loop-start marker only (no logic needed)
    if (kw && /^DO\d*$/.test(kw)) return;
    if (kw === "LOOP" || kw === "REPEAT") return;

    if (kw === "IF") {
      const condMatch = line.match(
        /^IF\s*(?:\[(.+?)\]|(.+?))\s*GOTO(?:[BF])?\s*(\w+)$/i,
      );
      if (condMatch) {
        try {
          const condExpr = (condMatch[1] ?? condMatch[2] ?? "").trim();
          const cond = ev._evalExpr(condExpr);
          if (cond) this._gotoLabel(ch, blks, condMatch[3]);
        } catch (error) {
          ch.error = `Invalid IF expression on line ${b.lineIndex + 1}: ${error.message}`;
          this._addDiagnostic("error", ch.error, b, ch.id);
        }
        return;
      }
      // IF ... THEN block
      const thenMatch = line.match(/^IF\s*(?:\[(.+)\]|(.+))$/i);
      if (thenMatch) {
        try {
          const condExpr = (thenMatch[1] ?? thenMatch[2] ?? "")
            .replace(/THEN\s*$/i, "")
            .trim();
          const cond = ev._evalExpr(condExpr);
          if (!cond)
            this._skipToMatchingElseOrEndif(
              ch,
              blks,
              Math.max(0, ch.pointer - 1),
            );
        } catch (error) {
          ch.error = `Invalid IF expression on line ${b.lineIndex + 1}: ${error.message}`;
          this._addDiagnostic("error", ch.error, b, ch.id);
        }
      }
    }

    if (kw === "ELSE") {
      this._skipToMatchingEndif(ch, blks, Math.max(0, ch.pointer - 1));
      return;
    }

    if (kw === "GOTOF" || kw === "GOTOB" || kw === "GOTO") {
      const lbl = line.replace(/GOTO(?:[FB])?\s*/i, "").trim();
      this._gotoLabel(ch, blks, lbl);
      return;
    }

    if (kw === "CALL") {
      const callMatch = line.match(/CALL\s*(\w+)/i);
      if (callMatch && !pathOnly) {
        const subName = callMatch[1];
        const subBlocks =
          this.programs.get(subName) || this.programs.get(`O${subName}`);
        if (subBlocks) {
          const rptr = ch.callStack.length
            ? ch.callStack[ch.callStack.length - 1].pointer
            : ch.pointer;
          ch.callStack.push({
            blocks: subBlocks,
            pointer: 0,
            returnPtr: rptr,
            repeat: 1,
            loopCount: 0,
          });
        } else {
          ch.error = `Subprogram ${subName} not found`;
          this._addDiagnostic("error", ch.error, b, ch.id);
        }
      } else if (callMatch && pathOnly) {
        const subName = callMatch[1];
        const subBlocks = this.programs.get(subName) || this.programs.get(`O${subName}`);
        if (subBlocks) {
          const tempCh = ch.clone();
          tempCh.blocks = subBlocks;
          tempCh.callStack = [];
          tempCh.pointer = 0;
          tempCh.done = false;
          const tempEv = new ExpressionEvaluator(tempCh);
          let guard = 0;
          while (!tempCh.done && guard++ < this._maxSteps) {
            this._executeBlock(tempCh, tempEv, true, recorder);
          }
          Object.assign(ch.pos, tempCh.pos);
          ch.motionMode = tempCh.motionMode;
          ch.posMode = tempCh.posMode;
          ch.plane = tempCh.plane;
          ch.feed = tempCh.feed;
          ch.rpm = tempCh.rpm;
          ch.commandedRPM = tempCh.commandedRPM;
          ch.activeT = tempCh.activeT;
          ch.activeH = tempCh.activeH;
          ch.vars = new Map(tempCh.vars);
        } else {
          ch.error = `Subprogram ${subName} not found`;
          this._addDiagnostic("error", ch.error, b, ch.id);
        }
      }
    }

    if (kw === "RET" || kw === "RTS") {
      this._returnFromSub(ch);
    }

    if (kw === "WAITM" || kw === "SETM" || kw === "CLEARM" || kw === "WBUF") {
      ch.waiting = { type: kw, raw: line, channelId: ch.id };
    }
  }

  _isLoopStartKeyword(kw) {
    return (
      kw === "WHILE" ||
      kw === "LOOP" ||
      kw === "REPEAT" ||
      /^DO\d*$/.test(kw || "")
    );
  }

  _isLoopEndKeyword(kw) {
    return (
      kw === "ENDWHILE" ||
      kw === "ENDLOOP" ||
      kw === "UNTIL" ||
      /^END\d+$/.test(kw || "")
    );
  }

  _findForwardMatch(blks, fromPtr, isStart, isEnd) {
    let depth = 0;
    for (let i = fromPtr + 1; i < blks.length; i++) {
      const kw = blks[i]?.keyword;
      if (!kw) continue;
      if (isStart(kw)) depth++;
      else if (isEnd(kw)) {
        if (depth === 0) return i;
        depth--;
      }
    }
    return -1;
  }

  _findBackwardMatch(blks, fromPtr, isStart, isEnd) {
    let depth = 0;
    for (let i = fromPtr; i >= 0; i--) {
      const kw = blks[i]?.keyword;
      if (!kw) continue;
      if (isEnd(kw)) depth++;
      else if (isStart(kw)) {
        if (depth === 0) return i;
        depth--;
      }
    }
    return -1;
  }

  _skipToMatchingLoopEnd(ch, blks, fromPtr) {
    const idx = this._findForwardMatch(
      blks,
      fromPtr,
      (kw) => this._isLoopStartKeyword(kw),
      (kw) => this._isLoopEndKeyword(kw),
    );
    if (idx >= 0) {
      if (ch.callStack.length)
        ch.callStack[ch.callStack.length - 1].pointer = idx + 1;
      else ch.pointer = idx + 1;
    }
  }

  _jumpBackToLoopStart(ch, blks, fromPtr) {
    const idx = this._findBackwardMatch(
      blks,
      fromPtr,
      (kw) => this._isLoopStartKeyword(kw),
      (kw) => this._isLoopEndKeyword(kw),
    );
    if (idx >= 0) {
      if (ch.callStack.length)
        ch.callStack[ch.callStack.length - 1].pointer = idx;
      else ch.pointer = idx;
    }
  }

  _skipToMatchingEndif(ch, blks, fromPtr) {
    const idx = this._findForwardMatch(
      blks,
      fromPtr,
      (kw) => kw === "IF",
      (kw) => kw === "ENDIF",
    );
    if (idx >= 0) {
      if (ch.callStack.length)
        ch.callStack[ch.callStack.length - 1].pointer = idx + 1;
      else ch.pointer = idx + 1;
    }
  }

  _skipToMatchingElseOrEndif(ch, blks, fromPtr) {
    let depth = 0;
    for (let i = fromPtr + 1; i < blks.length; i++) {
      const kw = blks[i]?.keyword;
      if (!kw) continue;
      if (kw === "IF") {
        depth++;
        continue;
      }
      if (kw === "ENDIF") {
        if (depth === 0) {
          if (ch.callStack.length)
            ch.callStack[ch.callStack.length - 1].pointer = i + 1;
          else ch.pointer = i + 1;
          return;
        }
        depth--;
        continue;
      }
      if (kw === "ELSE" && depth === 0) {
        if (ch.callStack.length)
          ch.callStack[ch.callStack.length - 1].pointer = i + 1;
        else ch.pointer = i + 1;
        return;
      }
    }
  }

  _gotoLabel(ch, blks, label) {
    for (let i = 0; i < blks.length; i++) {
      if (blks[i]?.label === label || blks[i]?.seqN === parseInt(label)) {
        if (ch.callStack.length)
          ch.callStack[ch.callStack.length - 1].pointer = i;
        else ch.pointer = i;
        return;
      }
    }
  }

  // ── Sync resolution ───────────────────────────────────────────────────────
  _trySyncResolve(channels) {
    const waiting = channels.filter((ch) => ch.waiting && !ch.done);
    if (!waiting.length) return;

    // M300 Pnnn — all channels with same P must be waiting
    const bySyncId = new Map();
    for (const ch of waiting) {
      const sid = ch.waiting.syncId;
      if (sid != null) {
        if (!bySyncId.has(sid)) bySyncId.set(sid, []);
        bySyncId.get(sid).push(ch);
      }
    }
    for (const [sid, group] of bySyncId.entries()) {
      // All channels that should be part of this sync — check machine def
      const expectedCount = this._expectedSyncChannels(
        group[0].waiting,
        channels,
      );
      if (group.length >= expectedCount) {
        group.forEach((ch) => {
          ch.waiting = null;
        });
      }
    }

    // M00 program stop — resolve immediately (no sync partner needed)
    for (const ch of waiting) {
      if (ch.waiting?.type === "M00") ch.waiting = null;
    }
  }

  _expectedSyncChannels(waitDef, channels) {
    if (!waitDef?.def) return 1;
    if (waitDef.def.type === "global-sync")
      return channels.filter((c) => !c.done).length;
    if (waitDef.def.type === "channel-sync") return 2;
    return 1;
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  _gList(w) {
    return w?.G == null ? [] : Array.isArray(w.G) ? w.G : [w.G];
  }
  _mList(w) {
    return w?.M == null ? [] : Array.isArray(w.M) ? w.M : [w.M];
  }

  _getChannelSnapshot(ch) {
    return {
      id: ch.id,
      label: ch.label,
      pos: { ...ch.pos },
      machinePos: { ...ch.machinePos },
      feed: ch.feed,
      rpm: ch.rpm,
      dir: ch.dir,
      liveDir: ch.liveDir,
      liveRPM: ch.liveRPM,
      coolant: { ...ch.coolant },
      activeT: ch.activeT,
      activeH: ch.activeH,
      motionMode: ch.motionMode,
      posMode: ch.posMode,
      plane: ch.plane,
      units: ch.units,
      cssMode: ch.cssMode,
      cssSpeed: ch.cssSpeed,
      activeWCS: ch.activeWCS,
      offsets: ch.offsets,
      home: { ...ch.home },
      waiting: ch.waiting,
      done: ch.done,
      error: ch.error,
      message: ch.message,
      vars: Object.fromEntries(ch.vars),
      rVars: Object.fromEntries(ch.rVars),
      callStackDepth: ch.callStack.length,
      pointer: ch.pointer,
    };
  }

  getState() {
    return this.channels.map((ch) => this._getChannelSnapshot(ch));
  }
  getPathPoints() {
    return this.backplotPathPoints;
  }
  getStats() {
    return { ...this.backplotStats };
  }
  getDiagnostics() {
    return this.diagnostics.map((item) => ({ ...item }));
  }
  isDone() {
    return this.channels.every((ch) => ch.done);
  }
  hasWaiting() {
    return this.channels.some((ch) => ch.waiting && !ch.done);
  }

  // ── Convenience: run full pre-sim and return path ─────────────────────────
  static prerun(src, machDefId = "fanuc_mill") {
    const def = MACHINE_DEFINITIONS[machDefId];
    const engine = new CNCEngine(def);
    engine.loadPrograms(src);
    return { pathPoints: engine.getPathPoints(), stats: engine.getStats() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL / HOLDER LIBRARY
// ─────────────────────────────────────────────────────────────────────────────

export const TOOL_TEMPLATES = {
  // ── Mill cutting tools ────────────────────────────────────────────────────
  mill: {
    end_mill_4fl: {
      cls: "mill",
      type: "End Mill",
      subtype: "square",
      dia: 10,
      cr: 0,
      lc: 22,
      lt: 75,
      shank: 10,
      fl: 4,
      mat: "Carbide",
      profile: "endmill",
      desc: "4-flute square end mill",
    },
    end_mill_2fl: {
      cls: "mill",
      type: "End Mill",
      subtype: "square",
      dia: 8,
      cr: 0,
      lc: 19,
      lt: 65,
      shank: 8,
      fl: 2,
      mat: "Carbide",
      profile: "endmill",
      desc: "2-flute (aluminium)",
    },
    ball_mill_4fl: {
      cls: "mill",
      type: "Ball Mill",
      dia: 10,
      cr: 5,
      lc: 22,
      lt: 75,
      shank: 10,
      fl: 4,
      mat: "Carbide",
      profile: "ballmill",
      desc: "4-flute ball nose",
    },
    bull_nose: {
      cls: "mill",
      type: "Bull Nose",
      dia: 12,
      cr: 1,
      lc: 26,
      lt: 80,
      shank: 12,
      fl: 4,
      mat: "Carbide",
      profile: "endmill",
      desc: "Bull nose r1",
    },
    drill_hss: {
      cls: "mill",
      type: "Drill",
      dia: 6,
      cr: 0,
      lc: 52,
      lt: 90,
      shank: 6,
      fl: 2,
      mat: "HSS",
      profile: "drill",
      desc: "HSS jobber drill",
      pointAngle: 118,
    },
    drill_carbide: {
      cls: "mill",
      type: "Drill",
      dia: 8,
      cr: 0,
      lc: 60,
      lt: 95,
      shank: 8,
      fl: 2,
      mat: "Carbide",
      profile: "drill",
      desc: "Carbide stub drill",
      pointAngle: 140,
    },
    center_drill: {
      cls: "mill",
      type: "Center Drill",
      dia: 3,
      cr: 0,
      lc: 8,
      lt: 45,
      shank: 6,
      fl: 2,
      mat: "HSS",
      profile: "centerdrill",
      desc: "60° centre drill",
      pointAngle: 60,
    },
    spot_drill: {
      cls: "mill",
      type: "Spot Drill",
      dia: 10,
      cr: 0,
      lc: 10,
      lt: 55,
      shank: 10,
      fl: 2,
      mat: "Carbide",
      profile: "drill",
      desc: "90° spot drill",
      pointAngle: 90,
    },
    reamer: {
      cls: "mill",
      type: "Reamer",
      dia: 10,
      cr: 0,
      lc: 30,
      lt: 80,
      shank: 10,
      fl: 6,
      mat: "HSS",
      profile: "endmill",
      desc: "6-flute machine reamer",
    },
    tap_m10: {
      cls: "mill",
      type: "Tap",
      dia: 10,
      cr: 0,
      lc: 25,
      lt: 80,
      shank: 10,
      fl: 4,
      mat: "HSS",
      profile: "tap",
      desc: "M10×1.5 spiral flute tap",
      pitch: 1.5,
    },
    chamfer_90: {
      cls: "mill",
      type: "Chamfer",
      dia: 12,
      cr: 0,
      lc: 8,
      lt: 60,
      shank: 12,
      fl: 4,
      mat: "Carbide",
      profile: "chamfer",
      desc: "90° chamfer mill",
      pointAngle: 90,
    },
    t_slot: {
      cls: "mill",
      type: "T-Slot",
      dia: 16,
      cr: 0,
      lc: 4,
      lt: 70,
      shank: 10,
      fl: 6,
      mat: "HSS",
      profile: "tslot",
      desc: "T-slot cutter 16mm",
    },
    face_mill_50: {
      cls: "mill",
      type: "Face Mill",
      dia: 50,
      cr: 0.8,
      lc: 6,
      lt: 45,
      shank: 32,
      fl: 5,
      mat: "Carbide (insert)",
      profile: "facemill",
      desc: "50mm 5-insert face mill",
    },
    probe: {
      cls: "mill",
      type: "Probe",
      dia: 6,
      cr: 3,
      lc: 50,
      lt: 120,
      shank: 10,
      fl: 1,
      mat: "Ruby",
      profile: "probe",
      desc: "Touch-trigger probe Ø6 ruby stylus",
    },
  },

  // ── Lathe cutting tools ───────────────────────────────────────────────────
  lathe: {
    od_cnmg_80: {
      cls: "lathe",
      type: "OD Turning",
      insertStd: "CNMG",
      iAngle: 80,
      relief: 5,
      cr: 0.8,
      shank: 16,
      tlo: 30,
      lt: 30,
      profile: "od_turning",
      desc: "CNMG 80° diamond OD rough/finish",
    },
    od_wnmg_35: {
      cls: "lathe",
      type: "OD Turning",
      insertStd: "WNMG",
      iAngle: 35,
      relief: 7,
      cr: 0.8,
      shank: 16,
      tlo: 30,
      lt: 30,
      profile: "od_turning",
      desc: "WNMG 35° diamond OD finish",
    },
    od_vnmg_35: {
      cls: "lathe",
      type: "OD Profiling",
      insertStd: "VNMG",
      iAngle: 35,
      relief: 7,
      cr: 0.4,
      shank: 16,
      tlo: 30,
      lt: 30,
      profile: "od_turning",
      desc: "VNMG 35° profiling",
    },
    facing_wnmg: {
      cls: "lathe",
      type: "Facing",
      insertStd: "WNMG",
      iAngle: 80,
      relief: 5,
      cr: 0.8,
      shank: 16,
      tlo: 25,
      lt: 25,
      profile: "facing",
      desc: "WNMG facing insert",
    },
    id_boring_bar: {
      cls: "lathe",
      type: "ID Boring",
      iAngle: 55,
      relief: 7,
      cr: 0.4,
      shank: 20,
      tlo: 120,
      lt: 120,
      minBore: 25,
      profile: "boring_bar",
      desc: "20mm boring bar DCMT insert",
    },
    groove_3mm: {
      cls: "lathe",
      type: "Grooving",
      dia: 3,
      cr: 0.2,
      shank: 16,
      tlo: 20,
      lt: 20,
      depth: 6,
      profile: "grooving",
      desc: "3mm parting/grooving blade",
    },
    groove_4mm: {
      cls: "lathe",
      type: "Grooving",
      dia: 4,
      cr: 0.2,
      shank: 16,
      tlo: 20,
      lt: 20,
      depth: 6,
      profile: "grooving",
      desc: "4mm grooving blade",
    },
    parting_3mm: {
      cls: "lathe",
      type: "Parting",
      dia: 3,
      cr: 0,
      shank: 16,
      tlo: 20,
      lt: 20,
      depth: 30,
      profile: "parting",
      desc: "3mm parting blade (deep)",
    },
    thread_od_60: {
      cls: "lathe",
      type: "Threading",
      iAngle: 60,
      cr: 0,
      shank: 16,
      tlo: 22,
      lt: 22,
      profile: "threading",
      desc: "60° OD threading insert (metric)",
    },
    thread_od_55: {
      cls: "lathe",
      type: "Threading",
      iAngle: 55,
      cr: 0,
      shank: 16,
      tlo: 22,
      lt: 22,
      profile: "threading",
      desc: "55° OD threading insert (Whitworth/BSP)",
    },
    knurl: {
      cls: "lathe",
      type: "Knurling",
      dia: 20,
      shank: 16,
      tlo: 20,
      lt: 20,
      profile: "knurl",
      desc: "Diamond knurl wheel",
    },
  },

  // ── Live tools (turret-mounted, rotary) ───────────────────────────────────
  live: {
    live_em_8: {
      cls: "live",
      type: "Live End Mill",
      dia: 8,
      cr: 0,
      lc: 18,
      lt: 60,
      shank: 8,
      fl: 4,
      mat: "Carbide",
      profile: "endmill",
      desc: "8mm 4-fl live end mill",
    },
    live_drill_5: {
      cls: "live",
      type: "Live Drill",
      dia: 5,
      cr: 0,
      lc: 40,
      lt: 75,
      shank: 5,
      fl: 2,
      mat: "Carbide",
      profile: "drill",
      desc: "5mm carbide live drill",
    },
    live_tap_m6: {
      cls: "live",
      type: "Live Tap",
      dia: 6,
      cr: 0,
      lc: 18,
      lt: 65,
      shank: 6,
      fl: 4,
      mat: "HSS",
      profile: "tap",
      desc: "M6×1.0 live tap",
      pitch: 1.0,
    },
  },

  // ── Tool holders ──────────────────────────────────────────────────────────
  holders: {
    // Mill holders
    er32_collet_chuck: {
      type: "Collet Chuck",
      standard: "ER32",
      interface: "BT40",
      hdia: 63,
      hlen: 65,
      gdia: 42,
      glen: 30,
      gripRange: [2, 20],
      desc: "BT40 ER32 collet chuck",
    },
    er25_collet_chuck: {
      type: "Collet Chuck",
      standard: "ER25",
      interface: "BT40",
      hdia: 55,
      hlen: 60,
      gdia: 35,
      glen: 25,
      gripRange: [2, 16],
      desc: "BT40 ER25 collet chuck",
    },
    weldon_shank_20: {
      type: "Weldon / Shell Mill",
      interface: "BT40",
      hdia: 60,
      hlen: 55,
      gdia: 32,
      glen: 22,
      gripRange: [20, 20],
      desc: "20mm Weldon arbor BT40",
    },
    hydraulic_16: {
      type: "Hydraulic Chuck",
      interface: "BT40",
      hdia: 60,
      hlen: 70,
      gdia: 35,
      glen: 30,
      gripRange: [16, 16],
      desc: "Hydraulic shrink-fit 16mm",
    },
    shrinkfit_12: {
      type: "Shrink-Fit",
      interface: "HSK63A",
      hdia: 32,
      hlen: 85,
      gdia: 12,
      glen: 45,
      gripRange: [12, 12],
      desc: "HSK63A shrink-fit 12mm",
    },
    right_angle_head: {
      type: "Right-Angle Head",
      interface: "BT40",
      hdia: 50,
      hlen: 120,
      gdia: 20,
      glen: 30,
      desc: "Right-angle spindle head 90°",
    },
    // Lathe holders
    vdi_25_od: {
      type: "VDI Turning",
      standard: "VDI25",
      interface: "VDI25",
      hdia: 25,
      hlen: 80,
      shankType: "OD",
      desc: "VDI25 OD turning holder",
    },
    vdi_40_boring: {
      type: "VDI Boring Bar",
      standard: "VDI40",
      interface: "VDI40",
      hdia: 40,
      hlen: 120,
      shankType: "boring",
      desc: "VDI40 boring bar holder",
    },
    bmt_55_live: {
      type: "BMT Live Tool",
      standard: "BMT55",
      interface: "BMT55",
      hdia: 55,
      hlen: 70,
      shankType: "live",
      liveRPM: 6000,
      liveKW: 2,
      desc: "BMT55 driven live tool",
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HOLDER GEOMETRY for profile rendering
// ─────────────────────────────────────────────────────────────────────────────

export function getHolderProfile(holderKey) {
  return TOOL_TEMPLATES.holders[holderKey] || null;
}

export function buildFullToolProfile(tool, holder) {
  // Returns array of {r, z} points describing the tool+holder cross-section
  const pts = [];
  const h = holder || {
    hdia: tool.hdia || 32,
    hlen: tool.hlen || 50,
    gdia: tool.shank || 10,
    glen: 30,
  };
  const t = tool;
  let z = 0;

  if (t.cls === "lathe") {
    // Lathe: holder is rectangular shank + insert
    pts.push({ z: 0, r: t.shank / 2 || 8 });
    pts.push({ z: t.tlo || 30, r: t.shank / 2 || 8 });
    return { pts, insertType: t.type, iAngle: t.iAngle, cr: t.cr };
  }

  // Mill: tip → flute zone → shank → holder body → gauge
  const r = t.dia / 2;
  const shankR = t.shank / 2;
  const holderR = h.hdia / 2;
  const gaugeR = h.gdia / 2;

  pts.push({ z: 0, r: r, seg: "tip" });
  pts.push({ z: t.lc || 22, r: shankR, seg: "flute" });
  pts.push({ z: t.lt || 75, r: shankR, seg: "shank" });
  pts.push({ z: t.lt || 75, r: holderR, seg: "holder-base" });
  pts.push({ z: (t.lt || 75) + (h.hlen || 50), r: holderR, seg: "holder" });
  pts.push({ z: (t.lt || 75) + (h.hlen || 50), r: gaugeR, seg: "gauge-base" });
  pts.push({
    z: (t.lt || 75) + (h.hlen || 50) + (h.glen || 30),
    r: gaugeR,
    seg: "gauge",
  });

  return { pts, type: t.type, cr: t.cr, profile: t.profile };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT — convenience bundle
// ─────────────────────────────────────────────────────────────────────────────

export default {
  CNCEngine,
  GCodeParser,
  MACHINE_DEFINITIONS,
  TOOL_TEMPLATES,
  buildFullToolProfile,
  getHolderProfile,
};
